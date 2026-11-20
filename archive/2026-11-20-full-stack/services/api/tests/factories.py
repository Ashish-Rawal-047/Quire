"""Small helpers that walk orders through their lifecycle for tests."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import datetime, timedelta

from app.models import Document, Order, PrintAgent
from app.services.documents import ingest_stream
from app.services.orders import create_order, mark_paid, transition
from app.services.printing import create_print_job, finish_print_job

PDF_HEADER = b"%PDF-1.7\n"


def pdf_bytes(size: int, marker: bytes = b"CONFIDENTIAL-MARKER") -> bytes:
    """A PDF-signed payload of the given size with a recognisable plaintext marker inside."""
    body = (marker + os.urandom(48)) * (size // (len(marker) + 48) + 1)
    return (PDF_HEADER + body)[:size]


async def stream(data: bytes, piece: int = 16 * 1024) -> AsyncIterator[bytes]:
    for i in range(0, len(data), piece):
        yield data[i : i + piece]


async def new_order(db, agent: PrintAgent, now: datetime, privacy: str = "protected") -> Order:
    from tests.conftest import make_user

    customer = await make_user(db)
    return await create_order(
        db,
        shop_id=agent.shop_id,
        customer_id=customer.id,
        agent=agent,
        privacy_mode=privacy,
        now=now,
    )


async def upload(
    db, order: Order, now: datetime, data: bytes | None = None, name: str = "Resume.pdf"
) -> Document:
    return await ingest_stream(
        db, order=order, filename=name, chunks=stream(data or pdf_bytes(200_000)), now=now
    )


async def paid_order_with_document(
    db, agent: PrintAgent, now: datetime, data: bytes | None = None
) -> tuple[Order, Document]:
    order = await new_order(db, agent, now)
    document = await upload(db, order, now, data)
    transition(order, "awaiting_payment", now=now)
    await mark_paid(db, order, now=now + timedelta(minutes=2))
    return order, document


async def ready_order(
    db, agent: PrintAgent, now: datetime, data: bytes | None = None
) -> tuple[Order, Document]:
    """Upload → pay → accept → print → ready, all within a few minutes of `now`."""
    order, document = await paid_order_with_document(db, agent, now, data)
    transition(order, "accepted", now=now + timedelta(minutes=3))
    job = await create_print_job(
        db, order=order, document=document, agent=agent, copies=2, now=now + timedelta(minutes=4)
    )
    await finish_print_job(db, job, now=now + timedelta(minutes=5), agent_name=agent.name)
    transition(order, "ready", now=now + timedelta(minutes=6))
    await db.flush()
    return order, document
