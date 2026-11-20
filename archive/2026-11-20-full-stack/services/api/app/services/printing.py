"""Print agents and print jobs. The print mode always comes from the server's own records.

* An agent's mode is fixed when it is registered. Phase 1 refuses physical agents outright.
* An order's mode is copied from the shop's agent when the order is created.
* A job's mode is copied from the agent that runs it, and the database refuses a job whose mode
  differs from its order's or its agent's (composite foreign keys).
Nothing in a request can set or change a mode.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, Order, PrintAgent, PrintJob
from app.services import audit
from app.services.orders import OrderNotFound, transition

# Phase 2 turns this on together with the Windows printing backend of the agent.
PHYSICAL_PRINTING_AVAILABLE = False


class PrintingUnavailable(Exception):
    pass


class PrintModeMismatch(Exception):
    pass


async def register_agent(
    session: AsyncSession, *, shop_id: uuid.UUID, name: str, mode: str, now: datetime
) -> PrintAgent:
    if mode not in ("simulated", "physical"):
        raise ValueError(mode)
    if mode == "physical" and not PHYSICAL_PRINTING_AVAILABLE:
        raise PrintingUnavailable("Physical printing is not available in Phase 1")
    agent = PrintAgent(shop_id=shop_id, name=name[:60], mode=mode, created_at=now)
    session.add(agent)
    await session.flush()
    return agent


async def create_print_job(
    session: AsyncSession,
    *,
    order: Order,
    document: Document,
    agent: PrintAgent,
    copies: int,
    now: datetime,
) -> PrintJob:
    if agent.shop_id != order.shop_id or agent.revoked_at is not None:
        raise OrderNotFound()
    if document.order_id != order.id or document.state != "stored":
        raise OrderNotFound()
    if order.status not in ("accepted", "printing"):
        raise ValueError(f"cannot print an order that is {order.status}")
    if agent.mode != order.print_mode:
        raise PrintModeMismatch(f"{agent.mode} agent cannot print a {order.print_mode} order")
    if not 1 <= copies <= 100:
        raise ValueError("copies")
    job = PrintJob(
        order_id=order.id,
        document_id=document.id,
        agent_id=agent.id,
        mode=agent.mode,
        copies=copies,
        status="queued",
        created_at=now,
    )
    session.add(job)
    if order.status == "accepted":
        transition(order, "printing", now=now)
    await session.flush()
    return job


async def finish_print_job(
    session: AsyncSession, job: PrintJob, *, now: datetime, agent_name: str
) -> None:
    job.status = "done"
    job.finished_at = now
    simulated = job.mode == "simulated"
    copies = f"{job.copies} {'copy' if job.copies == 1 else 'copies'}"
    audit.record(
        session,
        order_id=job.order_id,
        document_id=job.document_id,
        action="printed",
        actor_kind="shop",
        actor_id=str(job.agent_id),
        print_mode=job.mode,
        at=now,
        detail=(
            f"{agent_name} · {copies} · SIMULATED — no paper printed"
            if simulated
            else f"{agent_name} · {copies}"
        ),
    )
    await session.flush()
