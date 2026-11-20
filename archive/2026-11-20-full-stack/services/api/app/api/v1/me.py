"""The signed-in account: profile, shop memberships and pending staff invitations."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import StrictModel, clean_text
from app.auth.deps import Principal, get_db, require_user
from app.auth.shop_access import ShopContext, require_shop_staff
from app.core import clock
from app.models.auth import User
from app.services import shops as shop_svc

router = APIRouter(prefix="/me", tags=["account"])


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None


class MembershipOut(BaseModel):
    shop_id: uuid.UUID
    shop_code: str
    shop_name: str
    role: str


class InvitationOut(BaseModel):
    id: uuid.UUID
    shop_name: str
    role: str
    expires_at: datetime


class MeOut(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]
    invitations: list[InvitationOut]


class MeUpdate(StrictModel):
    display_name: str | None = Field(default=None, max_length=60)


async def build_me(db: AsyncSession, user: User) -> MeOut:
    """One account can be a customer and, separately, a member of several shops with a different
    role in each. Only the caller's own memberships and invitations are listed."""
    memberships = await shop_svc.memberships_for(db, user)
    invitations = await shop_svc.pending_invitations_for(db, user, now=clock.utcnow())
    return MeOut(
        user=UserOut(id=user.id, email=user.email, display_name=user.display_name),
        memberships=[
            MembershipOut(shop_id=shop.id, shop_code=shop.code, shop_name=shop.name, role=role)
            for role, shop in memberships
        ],
        invitations=[
            InvitationOut(id=inv.id, shop_name=name, role=inv.role, expires_at=inv.expires_at)
            for inv, name in invitations
        ],
    )


@router.get("", response_model=MeOut)
async def get_me(
    principal: Principal = Depends(require_user), db: AsyncSession = Depends(get_db)
) -> MeOut:
    return await build_me(db, principal.user)


@router.patch("", response_model=MeOut)
async def update_me(
    body: MeUpdate,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    user = await db.get(User, principal.user.id, with_for_update=True)
    assert user is not None
    user.display_name = clean_text(body.display_name)
    await db.commit()
    return await build_me(db, user)


@router.post("/invitations/{invitation_id}/accept", response_model=MeOut)
async def accept_invitation(
    invitation_id: uuid.UUID,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    """Only the invited address (proven by signing in with a code sent to it) can accept."""
    await shop_svc.accept_invitation(db, principal.user, invitation_id, now=clock.utcnow())
    await db.commit()
    return await build_me(db, principal.user)


@router.post("/invitations/{invitation_id}/decline", response_model=MeOut)
async def decline_invitation(
    invitation_id: uuid.UUID,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    await shop_svc.decline_invitation(db, principal.user, invitation_id, now=clock.utcnow())
    await db.commit()
    return await build_me(db, principal.user)


@router.delete("/memberships/{shop_id}", status_code=204)
async def leave_shop(
    ctx: ShopContext = Depends(require_shop_staff), db: AsyncSession = Depends(get_db)
) -> Response:
    """Leave a shop you work at. The last owner can't leave."""
    await shop_svc.leave_shop(db, ctx, now=clock.utcnow())
    await db.commit()
    return Response(status_code=204)
