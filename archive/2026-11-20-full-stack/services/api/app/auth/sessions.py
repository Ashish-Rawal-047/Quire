"""Server-side sessions: create, resolve, revoke."""

from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import token_hash
from app.core.config import get_settings
from app.models.auth import User, UserSession

TOUCH_INTERVAL = timedelta(minutes=5)
MAX_ACTIVE_SESSIONS = 20


@dataclass(frozen=True)
class NewSession:
    token: str
    session: UserSession


async def create_session(session: AsyncSession, *, user: User, now: datetime) -> NewSession:
    s = get_settings()
    token = secrets.token_urlsafe(32)
    absolute = now + timedelta(days=s.session_absolute_days)
    row = UserSession(
        token_hash=token_hash(token),
        user_id=user.id,
        created_at=now,
        last_seen_at=now,
        idle_expires_at=min(now + timedelta(days=s.session_idle_days), absolute),
        absolute_expires_at=absolute,
    )
    session.add(row)
    await session.flush()

    # Keep at most MAX_ACTIVE_SESSIONS per account; the oldest go first.
    active = (
        await session.scalars(
            select(UserSession.id)
            .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
            .order_by(UserSession.created_at.desc(), UserSession.id)
            .offset(MAX_ACTIVE_SESSIONS)
        )
    ).all()
    if active:
        await session.execute(
            update(UserSession)
            .where(UserSession.id.in_(active))
            .values(revoked_at=now, revoked_reason="limit")
        )
    return NewSession(token=token, session=row)


async def resolve_session(
    session: AsyncSession, token: str | None, *, now: datetime
) -> tuple[UserSession, User] | None:
    if not token or len(token) > 200:
        return None
    row = (
        await session.execute(
            select(UserSession, User)
            .join(User, User.id == UserSession.user_id)
            .where(
                UserSession.token_hash == token_hash(token),
                UserSession.revoked_at.is_(None),
                UserSession.idle_expires_at > now,
                UserSession.absolute_expires_at > now,
                User.disabled_at.is_(None),
            )
        )
    ).one_or_none()
    if row is None:
        return None
    user_session, user = row
    if now - user_session.last_seen_at >= TOUCH_INTERVAL:
        user_session.last_seen_at = now
        user_session.idle_expires_at = min(
            now + timedelta(days=get_settings().session_idle_days),
            user_session.absolute_expires_at,
        )
        await session.flush()
    return user_session, user


async def revoke_session(
    session: AsyncSession, session_id: uuid.UUID, *, now: datetime, reason: str
) -> None:
    await session.execute(
        update(UserSession)
        .where(UserSession.id == session_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now, revoked_reason=reason)
    )


async def revoke_all_sessions(
    session: AsyncSession, user_id: uuid.UUID, *, now: datetime, reason: str
) -> int:
    result = await session.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now, revoked_reason=reason)
    )
    return result.rowcount or 0
