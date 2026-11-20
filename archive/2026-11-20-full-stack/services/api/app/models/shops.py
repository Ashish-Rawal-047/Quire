"""Shops, their members (owner / staff), staff invitations and opening hours."""

from __future__ import annotations

import uuid
from datetime import datetime, time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Time,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

TS = DateTime(timezone=True)


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(6), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(String(500))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    address_line1: Mapped[str | None] = mapped_column(String(120))
    address_line2: Mapped[str | None] = mapped_column(String(120))
    locality: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(80))
    pincode: Mapped[str | None] = mapped_column(String(6))
    # The shop's own business location (public once listed). Customer locations are never stored.
    latitude: Mapped[float | None] = mapped_column(Numeric(8, 5))
    longitude: Mapped[float | None] = mapped_column(Numeric(8, 5))
    timezone: Mapped[str] = mapped_column(String(40), default="Asia/Kolkata")
    status: Mapped[str] = mapped_column(String(10), default="draft")
    accepting_orders: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(TS)
    updated_at: Mapped[datetime] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'listed', 'suspended')", name="status"),
        CheckConstraint("code ~ '^[2-9A-HJ-NP-Z]{6}$'", name="code_format"),
        CheckConstraint("pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$'", name="pincode"),
        CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="location_pair"),
        CheckConstraint(
            "latitude IS NULL OR (latitude BETWEEN 6 AND 37.6 AND longitude BETWEEN 68 AND 97.5)",
            name="location_india",
        ),
    )


class ShopMember(Base):
    __tablename__ = "shop_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(TS)
    revoked_at: Mapped[datetime | None] = mapped_column(TS)
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'staff')", name="role"),
        # One active membership per person per shop; history is kept after removal.
        Index(
            "uq_shop_members_active",
            "shop_id",
            "user_id",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )


class ShopInvitation(Base):
    __tablename__ = "shop_invitations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), index=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    role: Mapped[str] = mapped_column(String(10))
    invited_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(TS)
    expires_at: Mapped[datetime] = mapped_column(TS)
    accepted_at: Mapped[datetime | None] = mapped_column(TS)
    accepted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    declined_at: Mapped[datetime | None] = mapped_column(TS)
    revoked_at: Mapped[datetime | None] = mapped_column(TS)

    __table_args__ = (
        # Owners are never created by invitation: only staff.
        CheckConstraint("role = 'staff'", name="role"),
        Index(
            "uq_shop_invitations_open",
            "shop_id",
            "email",
            unique=True,
            postgresql_where=text(
                "accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL"
            ),
        ),
    )


class ShopHours(Base):
    __tablename__ = "shop_hours"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), index=True)
    weekday: Mapped[int] = mapped_column(SmallInteger)  # 0 = Monday
    opens_at: Mapped[time] = mapped_column(Time)
    closes_at: Mapped[time] = mapped_column(Time)

    __table_args__ = (
        CheckConstraint("weekday BETWEEN 0 AND 6", name="weekday"),
        CheckConstraint("closes_at > opens_at", name="order"),
    )
