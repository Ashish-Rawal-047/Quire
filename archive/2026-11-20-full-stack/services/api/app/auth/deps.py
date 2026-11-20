"""Route policies. Every route declares exactly one, and tests/test_route_policies.py fails for
any route that doesn't:

    public       — no session needed (allowlisted in the test)
    require_user — any signed-in account (acting as a customer, or on its own profile)
    require_shop_staff / require_shop_owner — membership of the shop in the path, looked up in
                   the database for the session's user (added in app/auth/shop_access.py)
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import Problem
from app.auth.security import session_cookie_name
from app.auth.sessions import resolve_session
from app.core import clock
from app.core.db import SessionLocal
from app.models.auth import User, UserSession


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


def policy(name: str):
    def mark(fn):
        fn.__quire_policy__ = name
        return fn

    return mark


@policy("public")
async def public() -> None:
    return None


@dataclass(frozen=True)
class Principal:
    user: User
    session: UserSession
    token: str


@policy("user")
async def require_user(request: Request, db: AsyncSession = Depends(get_db)) -> Principal:
    token = request.cookies.get(session_cookie_name())
    resolved = await resolve_session(db, token, now=clock.utcnow())
    if resolved is None:
        raise Problem(401, "unauthenticated", "Sign in to continue")
    await db.commit()  # persists a sliding idle-expiry update, if any
    user_session, user = resolved
    return Principal(user=user, session=user_session, token=token or "")
