"""Order lifecycle: the state machine and the retention deadlines each state sets.

`completed` is deliberately absent from the transitions below: an order can only be completed by
`pickup.verify_pickup`, and the database rejects a completed order without a verified pickup.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, Order, PrintAgent
from app.models.domain import order_number_seq
from app.services.documents import PAID_RETENTION_CAP
from app.services.epochs import set_document_expiry

READY_RETENTION = timedelta(hours=24)
COLLECTED_RETENTION = timedelta(hours=1)
CANCELLED_RETENTION = timedelta(minutes=5)

TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"awaiting_payment", "cancelled"}),
    "awaiting_payment": frozenset({"paid", "cancelled"}),
    "paid": frozenset({"accepted", "cancelled"}),
    "accepted": frozenset({"printing", "cancelled"}),
    "printing": frozenset({"ready", "accepted"}),
    "ready": frozenset({"uncollected"}),
    "completed": frozenset(),
    "uncollected": frozenset(),
    "cancelled": frozenset(),
}


class InvalidTransition(Exception):
    pass


class OrderNotFound(Exception):
    """Also raised for another shop's order, so existence is never revealed."""


def earliest(current: datetime | None, candidate: datetime) -> datetime:
    return candidate if current is None or candidate < current else current


async def create_order(
    session: AsyncSession,
    *,
    shop_id: uuid.UUID,
    customer_id: uuid.UUID,
    agent: PrintAgent,
    privacy_mode: str,
    now: datetime,
) -> Order:
    """The print mode comes from the shop's print agent, so the customer is told before paying
    whether the order will be simulated. It is fixed for the life of the order."""
    if agent.shop_id != shop_id or agent.revoked_at is not None:
        raise ValueError("agent does not belong to this shop")
    seq = await session.scalar(select(order_number_seq.next_value()))
    order = Order(
        number=f"PF-{now:%y%m}-{seq:04d}",
        shop_id=shop_id,
        customer_id=customer_id,
        status="draft",
        print_mode=agent.mode,
        privacy_mode=privacy_mode,
        pickup_nonce=os.urandom(16),
        pickup_failed_attempts=0,
        pickup_lockouts=0,
        pickup_blocked=False,
        created_at=now,
    )
    session.add(order)
    await session.flush()
    return order


def transition(order: Order, to: str, *, now: datetime) -> None:
    if to == "completed":
        raise InvalidTransition("Orders are completed only by verifying the pickup code")
    if to not in TRANSITIONS[order.status]:
        raise InvalidTransition(f"{order.status} → {to} is not allowed")
    order.status = to
    if to == "paid":
        order.paid_at = now
    elif to == "ready":
        order.ready_at = now
        order.purge_after = earliest(order.purge_after, now + READY_RETENTION)
    elif to == "cancelled":
        order.cancelled_at = now
        order.purge_after = earliest(order.purge_after, now + CANCELLED_RETENTION)


async def mark_paid(session: AsyncSession, order: Order, *, now: datetime) -> None:
    """Payment confirmed by the gateway: documents may now live up to the 72-hour cap, and
    their epoch keys are kept alive exactly that long."""
    transition(order, "paid", now=now)
    documents = (
        await session.scalars(
            select(Document).where(Document.order_id == order.id, Document.state == "stored")
        )
    ).all()
    for document in documents:
        await set_document_expiry(session, document, now + PAID_RETENTION_CAP, now=now)
    await session.flush()
