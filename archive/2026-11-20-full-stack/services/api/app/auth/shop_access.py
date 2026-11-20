"""Shop-scoped authorization.

The shop in the path says *which* shop is meant. Whether the caller may act on it is decided only
by their active membership row, looked up for the session's user on every request. A caller with
no membership gets the same 404 as for a shop that doesn't exist.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import Problem, not_found
from app.auth.deps import Principal, get_db, policy, require_user
from app.models.auth import User
from app.models.shops import Shop, ShopMember


@dataclass(frozen=True)
class ShopContext:
    """Proof that the caller is an active member of `shop`. Shop services take this, never a bare
    shop id, so an unscoped call can't be written by accident."""

    shop: Shop
    user: User
    role: str

    @property
    def shop_id(self) -> uuid.UUID:
        return self.shop.id

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"


async def _membership(shop_id: uuid.UUID, principal: Principal, db: AsyncSession) -> ShopContext:
    row = (
        await db.execute(
            select(Shop, ShopMember.role)
            .join(ShopMember, ShopMember.shop_id == Shop.id)
            .where(
                Shop.id == shop_id,
                ShopMember.user_id == principal.user.id,
                ShopMember.revoked_at.is_(None),
            )
        )
    ).one_or_none()
    if row is None:
        raise not_found()
    shop, role = row
    if shop.status == "suspended":
        raise Problem(403, "shop_suspended", "This shop is suspended")
    return ShopContext(shop=shop, user=principal.user, role=role)


@policy("shop_staff")
async def require_shop_staff(
    shop_id: uuid.UUID,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ShopContext:
    """Any active member: owner or staff."""
    return await _membership(shop_id, principal, db)


@policy("shop_owner")
async def require_shop_owner(
    shop_id: uuid.UUID,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ShopContext:
    ctx = await _membership(shop_id, principal, db)
    if not ctx.is_owner:
        raise Problem(403, "owner_only", "Only the shop owner can do this")
    return ctx
