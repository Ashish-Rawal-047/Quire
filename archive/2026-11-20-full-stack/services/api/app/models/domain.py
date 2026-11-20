"""Tables for orders, documents, encryption epochs, printing, pickup and the access receipt.

`shop_id` and `customer_id` reference `shops` and `users` (added in M1). Rules that must never be
bypassed are enforced by the database as well as the services:

* an order can only be `completed` once a pickup code has been verified;
* a print job's mode always equals its order's and its agent's mode (composite foreign keys);
* a `printed` or `pickup_verified` receipt entry always records the print mode;
* a purged document holds no wrapped key and no filename;
* access-receipt rows are append-only (trigger in the migration).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    LargeBinary,
    Sequence,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

TS = DateTime(timezone=True)

ORDER_STATUSES = (
    "draft",
    "awaiting_payment",
    "paid",
    "accepted",
    "printing",
    "ready",
    "completed",
    "uncollected",
    "cancelled",
)
PRINT_MODES = ("simulated", "physical")
ACCESS_ACTIONS = (
    "uploaded",
    "previewed",
    "printed",
    "download_denied",
    "deleted",
    "key_destroyed",
    "pickup_verified",
    "pickup_locked",
    "pickup_unlocked",
)
PICKUP_OUTCOMES = ("success", "wrong_code", "locked", "rate_limited")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


order_number_seq = Sequence("order_number_seq", start=1)


class KeyEpoch(Base):
    """Metadata for one epoch key. The key material itself is only in the key store."""

    __tablename__ = "key_epochs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    accepts_from: Mapped[datetime] = mapped_column(TS)
    accepts_until: Mapped[datetime] = mapped_column(TS)
    # The latest hard expiry of any document wrapped under this key. Never moves earlier.
    retain_until: Mapped[datetime] = mapped_column(TS)
    destroyed_at: Mapped[datetime | None] = mapped_column(TS)
    created_at: Mapped[datetime] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint("accepts_until > accepts_from", name="window"),
        Index("ix_key_epochs_live", "accepts_from", postgresql_where=text("destroyed_at IS NULL")),
    )


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    print_mode: Mapped[str] = mapped_column(String(10))
    privacy_mode: Mapped[str] = mapped_column(String(20))

    # The pickup code is never stored: it is derived from this nonce with a server-side key.
    pickup_nonce: Mapped[bytes] = mapped_column(LargeBinary(16))
    pickup_failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    pickup_lockouts: Mapped[int] = mapped_column(Integer, default=0)
    pickup_locked_until: Mapped[datetime | None] = mapped_column(TS)
    pickup_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    pickup_verified_at: Mapped[datetime | None] = mapped_column(TS)
    pickup_verified_by: Mapped[str | None] = mapped_column(String(64))

    created_at: Mapped[datetime] = mapped_column(TS)
    paid_at: Mapped[datetime | None] = mapped_column(TS)
    ready_at: Mapped[datetime | None] = mapped_column(TS)
    completed_at: Mapped[datetime | None] = mapped_column(TS)
    cancelled_at: Mapped[datetime | None] = mapped_column(TS)
    purge_after: Mapped[datetime | None] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint(_in("status", ORDER_STATUSES), name="status"),
        CheckConstraint(_in("print_mode", PRINT_MODES), name="print_mode"),
        CheckConstraint(_in("privacy_mode", ("protected", "download_permitted")), name="privacy"),
        CheckConstraint(
            "status <> 'completed' OR pickup_verified_at IS NOT NULL",
            name="completed_requires_pickup_verification",
        ),
        CheckConstraint("pickup_failed_attempts >= 0", name="pickup_attempts"),
        UniqueConstraint("id", "print_mode", name="uq_orders_id_print_mode"),
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    epoch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("key_epochs.id"), index=True)
    state: Mapped[str] = mapped_column(String(10))
    content_type: Mapped[str] = mapped_column(String(40))
    size_bytes: Mapped[int] = mapped_column(Integer)
    ciphertext_bytes: Mapped[int] = mapped_column(Integer)
    # Filename, encrypted with the document's own data key: deleting the key deletes the name.
    name_sealed: Mapped[bytes | None] = mapped_column(LargeBinary)
    # Data key wrapped by the epoch key. Erased on purge; backups become useless once the
    # epoch key is destroyed.
    wrapped_key: Mapped[bytes | None] = mapped_column(LargeBinary)
    object_prefix: Mapped[str] = mapped_column(String(80))
    scan_status: Mapped[str] = mapped_column(String(20))
    uploaded_at: Mapped[datetime] = mapped_column(TS)
    hard_expires_at: Mapped[datetime] = mapped_column(TS, index=True)
    purged_at: Mapped[datetime | None] = mapped_column(TS)
    purge_reason: Mapped[str | None] = mapped_column(String(30))

    __table_args__ = (
        CheckConstraint(
            "(state = 'stored' AND wrapped_key IS NOT NULL AND purged_at IS NULL)"
            " OR (state = 'purged' AND wrapped_key IS NULL AND name_sealed IS NULL"
            " AND purged_at IS NOT NULL)",
            name="state_consistent",
        ),
    )


class PrintAgent(Base):
    __tablename__ = "print_agents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    mode: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(TS)
    revoked_at: Mapped[datetime | None] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint(_in("mode", PRINT_MODES), name="mode"),
        UniqueConstraint("id", "mode", name="uq_print_agents_id_mode"),
    )


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"))
    agent_id: Mapped[uuid.UUID] = mapped_column()
    # Set by the server from the agent's registered mode — never from a request.
    mode: Mapped[str] = mapped_column(String(10))
    copies: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(TS)
    finished_at: Mapped[datetime | None] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint(_in("mode", PRINT_MODES), name="mode"),
        CheckConstraint(_in("status", ("queued", "done", "failed")), name="status"),
        CheckConstraint("copies > 0", name="copies"),
        ForeignKeyConstraint(
            ["order_id", "mode"],
            ["orders.id", "orders.print_mode"],
            name="fk_print_jobs_order_mode",
        ),
        ForeignKeyConstraint(
            ["agent_id", "mode"],
            ["print_agents.id", "print_agents.mode"],
            name="fk_print_jobs_agent_mode",
        ),
    )


class AccessEvent(Base):
    """One line of the customer's access receipt. Append-only; never contains document content."""

    __tablename__ = "access_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("documents.id"))
    action: Mapped[str] = mapped_column(String(20))
    actor_kind: Mapped[str] = mapped_column(String(10))
    actor_id: Mapped[str | None] = mapped_column(String(64))
    print_mode: Mapped[str | None] = mapped_column(String(10))
    detail: Mapped[str | None] = mapped_column(String(200))
    at: Mapped[datetime] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint(_in("action", ACCESS_ACTIONS), name="action"),
        CheckConstraint(_in("actor_kind", ("customer", "shop", "system")), name="actor_kind"),
        CheckConstraint(
            "action NOT IN ('printed', 'pickup_verified') OR print_mode IS NOT NULL",
            name="print_mode_recorded",
        ),
        CheckConstraint(f"print_mode IS NULL OR {_in('print_mode', PRINT_MODES)}", name="mode"),
    )


class PickupAttempt(Base):
    """Every pickup-code check, for rate limiting and the shop's audit trail."""

    __tablename__ = "pickup_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"))
    actor_id: Mapped[str] = mapped_column(String(64))
    outcome: Mapped[str] = mapped_column(String(15))
    at: Mapped[datetime] = mapped_column(TS)

    __table_args__ = (
        CheckConstraint(_in("outcome", PICKUP_OUTCOMES), name="outcome"),
        Index("ix_pickup_attempts_shop_at", "shop_id", "at"),
        Index("ix_pickup_attempts_actor_at", "actor_id", "at"),
    )
