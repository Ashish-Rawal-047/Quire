"""Shop registration and management. Every `/shops/{shop_id}/…` route resolves the caller's
membership in that shop from the database (require_shop_staff / require_shop_owner)."""

from __future__ import annotations

import uuid
from datetime import datetime, time

from fastapi import APIRouter, BackgroundTasks, Depends, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import Problem, StrictModel, clean_text
from app.auth import otp
from app.auth.deps import Principal, get_db, require_user
from app.auth.shop_access import ShopContext, require_shop_owner, require_shop_staff
from app.core import clock
from app.core.config import get_settings
from app.core.mail import send_mail
from app.models.shops import Shop, ShopHours
from app.services import shops as svc

router = APIRouter(prefix="/shops", tags=["shops"])


# ── Schemas ─────────────────────────────────────────────────────────────────────────────────


class ShopFields(StrictModel):
    description: str | None = Field(default=None, max_length=500)
    contact_phone: str | None = Field(default=None, max_length=24)
    contact_email: str | None = Field(default=None, max_length=254)
    address_line1: str | None = Field(default=None, max_length=120)
    address_line2: str | None = Field(default=None, max_length=120)
    locality: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    pincode: str | None = Field(default=None, pattern=r"^[1-9][0-9]{5}$")

    @field_validator("contact_phone")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        return svc.normalise_phone(v) if v else None

    @field_validator("contact_email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        if not v:
            return None
        try:
            return otp.normalise_email(v)
        except otp.InvalidEmail as exc:
            raise ValueError("Enter a valid email address") from exc

    @field_validator(
        "description", "address_line1", "address_line2", "locality", "city", "state", mode="after"
    )
    @classmethod
    def _blank_is_none(cls, v: str | None) -> str | None:
        return clean_text(v)


class ShopCreate(ShopFields):
    name: str = Field(min_length=2, max_length=80)

    @field_validator("name", mode="after")
    @classmethod
    def _clean_name(cls, v: str) -> str:
        cleaned = clean_text(v)
        if not cleaned or len(cleaned) < 2:
            raise ValueError("A shop needs a name")
        return cleaned


class ShopUpdate(ShopFields):
    name: str | None = Field(default=None, min_length=2, max_length=80)

    @field_validator("name")
    @classmethod
    def _name_required(cls, v: str | None) -> str:
        cleaned = clean_text(v)
        if not cleaned or len(cleaned) < 2:
            raise ValueError("A shop needs a name")
        return cleaned


class LocationIn(StrictModel):
    # India only for now. Stored to 5 decimals (about 1 m): this is the shop's public address.
    latitude: float = Field(ge=6, le=37.6)
    longitude: float = Field(ge=68, le=97.5)


class IntervalIn(StrictModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday")
    opens_at: time
    closes_at: time


class HoursIn(StrictModel):
    intervals: list[IntervalIn] = Field(max_length=21)


class AcceptingIn(StrictModel):
    accepting: bool


class InviteIn(StrictModel):
    email: str = Field(max_length=320)


class IntervalOut(BaseModel):
    weekday: int
    opens_at: str
    closes_at: str


class ShopOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    contact_phone: str | None
    contact_email: str | None
    address_line1: str | None
    address_line2: str | None
    locality: str | None
    city: str | None
    state: str | None
    pincode: str | None
    latitude: float | None
    longitude: float | None
    timezone: str
    status: str
    accepting_orders: bool
    is_demo: bool
    hours: list[IntervalOut]
    your_role: str


class MemberOut(BaseModel):
    user_id: uuid.UUID
    display_name: str | None
    email: str
    role: str
    since: datetime


class PendingInvitationOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    created_at: datetime
    expires_at: datetime


class MembersOut(BaseModel):
    members: list[MemberOut]
    invitations: list[PendingInvitationOut]


def _hm(t: time) -> str:
    return t.strftime("%H:%M")


def shop_out(shop: Shop, hours: list[ShopHours], role: str) -> ShopOut:
    return ShopOut(
        id=shop.id,
        code=shop.code,
        name=shop.name,
        description=shop.description,
        contact_phone=shop.contact_phone,
        contact_email=shop.contact_email,
        address_line1=shop.address_line1,
        address_line2=shop.address_line2,
        locality=shop.locality,
        city=shop.city,
        state=shop.state,
        pincode=shop.pincode,
        latitude=float(shop.latitude) if shop.latitude is not None else None,
        longitude=float(shop.longitude) if shop.longitude is not None else None,
        timezone=shop.timezone,
        status=shop.status,
        accepting_orders=shop.accepting_orders,
        is_demo=shop.is_demo,
        hours=[
            IntervalOut(weekday=h.weekday, opens_at=_hm(h.opens_at), closes_at=_hm(h.closes_at))
            for h in hours
        ],
        your_role=role,
    )


async def _shop_out(db: AsyncSession, ctx: ShopContext) -> ShopOut:
    return shop_out(ctx.shop, await svc.hours_for(db, ctx.shop_id), ctx.role)


# ── Routes ──────────────────────────────────────────────────────────────────────────────────


@router.post("", status_code=201, response_model=ShopOut)
async def register_shop(
    body: ShopCreate,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ShopOut:
    """Register a shop. The caller becomes its owner; it starts as an unlisted draft."""
    shop, member = await svc.create_shop(
        db, user=principal.user, fields=body.model_dump(exclude_unset=True), now=clock.utcnow()
    )
    await db.commit()
    return shop_out(shop, [], member.role)


@router.get("/{shop_id}", response_model=ShopOut)
async def get_shop(
    ctx: ShopContext = Depends(require_shop_staff), db: AsyncSession = Depends(get_db)
) -> ShopOut:
    return await _shop_out(db, ctx)


@router.patch("/{shop_id}", response_model=ShopOut)
async def update_shop(
    body: ShopUpdate,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> ShopOut:
    svc.update_profile(ctx, body.model_dump(exclude_unset=True), now=clock.utcnow())
    await db.commit()
    return await _shop_out(db, ctx)


@router.put("/{shop_id}/location", response_model=ShopOut)
async def set_location(
    body: LocationIn,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> ShopOut:
    svc.update_profile(
        ctx,
        {"latitude": round(body.latitude, 5), "longitude": round(body.longitude, 5)},
        now=clock.utcnow(),
    )
    await db.commit()
    return await _shop_out(db, ctx)


@router.put("/{shop_id}/hours", response_model=ShopOut)
async def set_hours(
    body: HoursIn,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> ShopOut:
    intervals = [svc.Interval(i.weekday, i.opens_at, i.closes_at) for i in body.intervals]
    await svc.set_hours(db, ctx, intervals, now=clock.utcnow())
    await db.commit()
    return await _shop_out(db, ctx)


@router.put("/{shop_id}/accepting", response_model=ShopOut)
async def set_accepting(
    body: AcceptingIn,
    ctx: ShopContext = Depends(require_shop_staff),
    db: AsyncSession = Depends(get_db),
) -> ShopOut:
    """Pause or resume new orders. Owners and staff can both do this."""
    svc.update_profile(ctx, {"accepting_orders": body.accepting}, now=clock.utcnow())
    await db.commit()
    return await _shop_out(db, ctx)


@router.get("/{shop_id}/members", response_model=MembersOut)
async def list_members(
    ctx: ShopContext = Depends(require_shop_owner), db: AsyncSession = Depends(get_db)
) -> MembersOut:
    members, invitations = await svc.list_members(db, ctx, now=clock.utcnow())
    return MembersOut(
        members=[
            MemberOut(
                user_id=u.id,
                display_name=u.display_name,
                email=u.email,
                role=m.role,
                since=m.created_at,
            )
            for m, u in members
        ],
        invitations=[
            PendingInvitationOut(
                id=i.id,
                email=i.email,
                role=i.role,
                created_at=i.created_at,
                expires_at=i.expires_at,
            )
            for i in invitations
        ],
    )


@router.post("/{shop_id}/invitations", status_code=201, response_model=PendingInvitationOut)
async def invite(
    body: InviteIn,
    background: BackgroundTasks,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> PendingInvitationOut:
    try:
        email = otp.normalise_email(body.email)
    except otp.InvalidEmail as exc:
        raise Problem(422, "invalid_email", "Enter a valid email address") from exc
    invitation = await svc.invite_staff(db, ctx, email=email, now=clock.utcnow())
    shop_name = ctx.shop.name
    await db.commit()
    origin = get_settings().web_origin
    background.add_task(
        send_mail,
        email,
        f"You're invited to join {shop_name} on Quire",
        f"You've been invited to help run {shop_name} on Quire as staff.\n\n"
        f"To accept, sign in at {origin}/sign-in with this email address. "
        "The invitation expires in 7 days.\n\n"
        "If you weren't expecting this, you can ignore this email.",
    )
    return PendingInvitationOut(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
    )


@router.delete("/{shop_id}/invitations/{invitation_id}", status_code=204)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await svc.revoke_invitation(db, ctx, invitation_id, now=clock.utcnow())
    await db.commit()
    return Response(status_code=204)


@router.delete("/{shop_id}/members/{user_id}", status_code=204)
async def remove_member(
    user_id: uuid.UUID,
    ctx: ShopContext = Depends(require_shop_owner),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await svc.remove_member(db, ctx, user_id, now=clock.utcnow())
    await db.commit()
    return Response(status_code=204)
