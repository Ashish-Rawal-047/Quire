"""Shop registration, profile, hours, opening switch and membership management.

Every function that touches an existing shop takes a ShopContext (proof of membership), or works
only on the signed-in user's own memberships and invitations.
"""

from __future__ import annotations

import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import Problem, not_found
from app.auth.shop_access import ShopContext
from app.models.auth import User
from app.models.shops import Shop, ShopHours, ShopInvitation, ShopMember

CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"  # no 0/O, 1/I/L, U: easy to read aloud
MAX_OWNED_SHOPS = 3
INVITATION_TTL = timedelta(days=7)
INVITATIONS_PER_DAY = 20
MAX_INTERVALS_PER_DAY = 3


def _new_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


async def create_shop(
    db: AsyncSession, *, user: User, fields: dict, now: datetime
) -> tuple[Shop, ShopMember]:
    owned = await db.scalar(
        select(func.count())
        .select_from(ShopMember)
        .where(
            ShopMember.user_id == user.id,
            ShopMember.role == "owner",
            ShopMember.revoked_at.is_(None),
        )
    )
    if owned >= MAX_OWNED_SHOPS:
        raise Problem(409, "shop_limit", f"An account can own up to {MAX_OWNED_SHOPS} shops")
    for _ in range(10):
        code = _new_code()
        if not await db.scalar(select(func.count()).select_from(Shop).where(Shop.code == code)):
            break
    else:  # pragma: no cover — 30^6 codes
        raise Problem(503, "code_space", "Try again")
    shop = Shop(
        code=code,
        status="draft",
        accepting_orders=False,
        is_demo=False,
        timezone="Asia/Kolkata",
        created_by=user.id,
        created_at=now,
        updated_at=now,
        **fields,
    )
    db.add(shop)
    await db.flush()
    member = ShopMember(shop_id=shop.id, user_id=user.id, role="owner", created_at=now)
    db.add(member)
    await db.flush()
    return shop, member


def update_profile(ctx: ShopContext, fields: dict, *, now: datetime) -> Shop:
    for key, value in fields.items():
        setattr(ctx.shop, key, value)
    ctx.shop.updated_at = now
    return ctx.shop


@dataclass(frozen=True)
class Interval:
    weekday: int
    opens_at: time
    closes_at: time


def validate_hours(intervals: list[Interval]) -> None:
    by_day: dict[int, list[Interval]] = {}
    for i in intervals:
        if i.closes_at <= i.opens_at:
            raise Problem(422, "invalid_hours", "Closing time must be after opening time")
        by_day.setdefault(i.weekday, []).append(i)
    for day, items in by_day.items():
        if len(items) > MAX_INTERVALS_PER_DAY:
            raise Problem(422, "invalid_hours", f"At most {MAX_INTERVALS_PER_DAY} intervals a day")
        items.sort(key=lambda x: x.opens_at)
        for a, b in zip(items, items[1:], strict=False):
            if b.opens_at < a.closes_at:
                raise Problem(422, "invalid_hours", "Opening hours overlap", weekday=day)


async def set_hours(
    db: AsyncSession, ctx: ShopContext, intervals: list[Interval], *, now: datetime
) -> list[ShopHours]:
    validate_hours(intervals)
    await db.execute(delete(ShopHours).where(ShopHours.shop_id == ctx.shop_id))
    rows = [
        ShopHours(
            shop_id=ctx.shop_id, weekday=i.weekday, opens_at=i.opens_at, closes_at=i.closes_at
        )
        for i in sorted(intervals, key=lambda x: (x.weekday, x.opens_at))
    ]
    db.add_all(rows)
    ctx.shop.updated_at = now
    await db.flush()
    return rows


async def hours_for(db: AsyncSession, shop_id: uuid.UUID) -> list[ShopHours]:
    return list(
        (
            await db.scalars(
                select(ShopHours)
                .where(ShopHours.shop_id == shop_id)
                .order_by(ShopHours.weekday, ShopHours.opens_at)
            )
        ).all()
    )


# ── Members and invitations ─────────────────────────────────────────────────────────────────


async def _lock_shop(db: AsyncSession, shop_id: uuid.UUID) -> None:
    """Serialise membership changes per shop (protects the last-owner rule from races)."""
    await db.execute(select(Shop.id).where(Shop.id == shop_id).with_for_update())


async def list_members(db: AsyncSession, ctx: ShopContext, *, now: datetime):
    members = (
        await db.execute(
            select(ShopMember, User)
            .join(User, User.id == ShopMember.user_id)
            .where(ShopMember.shop_id == ctx.shop_id, ShopMember.revoked_at.is_(None))
            .order_by(ShopMember.role, ShopMember.created_at)
        )
    ).all()
    invitations = (
        await db.scalars(
            select(ShopInvitation)
            .where(
                ShopInvitation.shop_id == ctx.shop_id,
                ShopInvitation.accepted_at.is_(None),
                ShopInvitation.declined_at.is_(None),
                ShopInvitation.revoked_at.is_(None),
                ShopInvitation.expires_at > now,
            )
            .order_by(ShopInvitation.created_at)
        )
    ).all()
    return members, invitations


async def invite_staff(
    db: AsyncSession, ctx: ShopContext, *, email: str, now: datetime
) -> ShopInvitation:
    """Same response whether or not the address has a Quire account."""
    await _lock_shop(db, ctx.shop_id)
    sent_today = await db.scalar(
        select(func.count())
        .select_from(ShopInvitation)
        .where(
            ShopInvitation.shop_id == ctx.shop_id,
            ShopInvitation.created_at > now - timedelta(days=1),
        )
    )
    if sent_today >= INVITATIONS_PER_DAY:
        raise Problem(429, "invitation_limit", "Too many invitations today", retry_after=3600)
    already_member = await db.scalar(
        select(func.count())
        .select_from(ShopMember)
        .join(User, User.id == ShopMember.user_id)
        .where(
            ShopMember.shop_id == ctx.shop_id,
            ShopMember.revoked_at.is_(None),
            User.email == email,
        )
    )
    if already_member:
        raise Problem(409, "already_member", "This person is already a member of the shop")
    open_invite = (
        await db.scalars(
            select(ShopInvitation).where(
                ShopInvitation.shop_id == ctx.shop_id,
                ShopInvitation.email == email,
                ShopInvitation.accepted_at.is_(None),
                ShopInvitation.declined_at.is_(None),
                ShopInvitation.revoked_at.is_(None),
            )
        )
    ).one_or_none()
    if open_invite is not None:
        if open_invite.expires_at > now:
            raise Problem(409, "already_invited", "An invitation to this address is pending")
        open_invite.revoked_at = now  # expired: replace it
        await db.flush()
    invitation = ShopInvitation(
        shop_id=ctx.shop_id,
        email=email,
        role="staff",
        invited_by=ctx.user.id,
        created_at=now,
        expires_at=now + INVITATION_TTL,
    )
    db.add(invitation)
    await db.flush()
    return invitation


async def revoke_invitation(
    db: AsyncSession, ctx: ShopContext, invitation_id: uuid.UUID, *, now: datetime
) -> None:
    invitation = (
        await db.scalars(
            select(ShopInvitation).where(
                ShopInvitation.id == invitation_id,
                ShopInvitation.shop_id == ctx.shop_id,  # scoped: another shop's id is a 404
                ShopInvitation.accepted_at.is_(None),
                ShopInvitation.declined_at.is_(None),
                ShopInvitation.revoked_at.is_(None),
            )
        )
    ).one_or_none()
    if invitation is None:
        raise not_found()
    invitation.revoked_at = now
    await db.flush()


async def _active_owner_count(db: AsyncSession, shop_id: uuid.UUID) -> int:
    return await db.scalar(
        select(func.count())
        .select_from(ShopMember)
        .where(
            ShopMember.shop_id == shop_id,
            ShopMember.role == "owner",
            ShopMember.revoked_at.is_(None),
        )
    )


async def remove_member(
    db: AsyncSession, ctx: ShopContext, user_id: uuid.UUID, *, now: datetime
) -> None:
    await _lock_shop(db, ctx.shop_id)
    member = (
        await db.scalars(
            select(ShopMember).where(
                ShopMember.shop_id == ctx.shop_id,
                ShopMember.user_id == user_id,
                ShopMember.revoked_at.is_(None),
            )
        )
    ).one_or_none()
    if member is None:
        raise not_found()
    if member.role == "owner" and await _active_owner_count(db, ctx.shop_id) <= 1:
        raise Problem(409, "last_owner", "A shop must keep at least one owner")
    member.revoked_at = now
    member.revoked_by = ctx.user.id
    await db.flush()


async def leave_shop(db: AsyncSession, ctx: ShopContext, *, now: datetime) -> None:
    await remove_member(db, ctx, ctx.user.id, now=now)


async def pending_invitations_for(db: AsyncSession, user: User, *, now: datetime):
    return (
        await db.execute(
            select(ShopInvitation, Shop.name)
            .join(Shop, Shop.id == ShopInvitation.shop_id)
            .where(
                ShopInvitation.email == user.email,
                ShopInvitation.accepted_at.is_(None),
                ShopInvitation.declined_at.is_(None),
                ShopInvitation.revoked_at.is_(None),
                ShopInvitation.expires_at > now,
                Shop.status != "suspended",
            )
            .order_by(ShopInvitation.created_at)
        )
    ).all()


async def _own_open_invitation(
    db: AsyncSession, user: User, invitation_id: uuid.UUID, *, now: datetime
) -> ShopInvitation:
    """Only the invited address can act on an invitation. Anything else is a 404."""
    invitation = (
        await db.scalars(
            select(ShopInvitation)
            .where(
                ShopInvitation.id == invitation_id,
                ShopInvitation.email == user.email,
                ShopInvitation.accepted_at.is_(None),
                ShopInvitation.declined_at.is_(None),
                ShopInvitation.revoked_at.is_(None),
                ShopInvitation.expires_at > now,
            )
            .with_for_update()
        )
    ).one_or_none()
    if invitation is None:
        raise not_found()
    return invitation


async def accept_invitation(
    db: AsyncSession, user: User, invitation_id: uuid.UUID, *, now: datetime
) -> ShopMember:
    invitation = await _own_open_invitation(db, user, invitation_id, now=now)
    await _lock_shop(db, invitation.shop_id)
    existing = await db.scalar(
        select(func.count())
        .select_from(ShopMember)
        .where(
            ShopMember.shop_id == invitation.shop_id,
            ShopMember.user_id == user.id,
            ShopMember.revoked_at.is_(None),
        )
    )
    if existing:
        raise Problem(409, "already_member", "You're already a member of this shop")
    invitation.accepted_at = now
    invitation.accepted_by = user.id
    member = ShopMember(
        shop_id=invitation.shop_id, user_id=user.id, role=invitation.role, created_at=now
    )
    db.add(member)
    await db.flush()
    return member


async def decline_invitation(
    db: AsyncSession, user: User, invitation_id: uuid.UUID, *, now: datetime
) -> None:
    invitation = await _own_open_invitation(db, user, invitation_id, now=now)
    invitation.declined_at = now
    await db.flush()


async def memberships_for(db: AsyncSession, user: User):
    return (
        await db.execute(
            select(ShopMember.role, Shop)
            .join(Shop, Shop.id == ShopMember.shop_id)
            .where(ShopMember.user_id == user.id, ShopMember.revoked_at.is_(None))
            .order_by(Shop.name)
        )
    ).all()


PHONE = re.compile(r"^\+?[0-9][0-9 ()-]{6,18}[0-9]$")


def normalise_phone(raw: str) -> str:
    if not PHONE.match(raw):
        raise ValueError("Enter a phone number with digits only, e.g. +91 98765 43210")
    digits = re.sub(r"[^0-9+]", "", raw)
    if not 8 <= len(digits.lstrip("+")) <= 15:
        raise ValueError("Enter a phone number with digits only, e.g. +91 98765 43210")
    return digits
