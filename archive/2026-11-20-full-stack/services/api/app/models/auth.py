"""Accounts, one-time sign-in codes and sessions.

Nothing secret is stored in a usable form: codes and session tokens are kept only as keyed or
plain hashes, and client addresses only as keyed hashes.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

TS = DateTime(timezone=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Normalised (lower-case). Shown only to the account holder, never to shops.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(TS)
    last_sign_in_at: Mapped[datetime | None] = mapped_column(TS)
    disabled_at: Mapped[datetime | None] = mapped_column(TS)


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254))
    # HMAC-SHA256(server key, challenge id ‖ code). The code itself is never stored.
    code_mac: Mapped[bytes] = mapped_column(LargeBinary(32))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    client_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(TS)
    expires_at: Mapped[datetime] = mapped_column(TS)
    consumed_at: Mapped[datetime | None] = mapped_column(TS)
    superseded_at: Mapped[datetime | None] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint("attempts >= 0", name="attempts"),
        Index("ix_otp_challenges_email_created", "email", "created_at"),
        Index("ix_otp_challenges_client_created", "client_hash", "created_at"),
    )


class AuthEvent(Base):
    """Failed code entries, counted for the per-email verification lock."""

    __tablename__ = "auth_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254))
    client_hash: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(20))
    at: Mapped[datetime] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint("kind IN ('otp_wrong')", name="kind"),
        Index("ix_auth_events_email_at", "email", "at"),
    )


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # SHA-256 of the cookie value. A database leak doesn't hand out live sessions.
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(TS)
    last_seen_at: Mapped[datetime] = mapped_column(TS)
    idle_expires_at: Mapped[datetime] = mapped_column(TS)
    absolute_expires_at: Mapped[datetime] = mapped_column(TS)
    revoked_at: Mapped[datetime | None] = mapped_column(TS)
    revoked_reason: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (
        CheckConstraint(
            "revoked_reason IS NULL OR revoked_reason IN "
            "('logout', 'logout_all', 'replaced', 'limit', 'disabled')",
            name="revoked_reason",
        ),
    )
