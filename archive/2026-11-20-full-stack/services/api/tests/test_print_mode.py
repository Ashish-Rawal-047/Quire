"""Simulated printing can never be presented, stored or completed as real printing."""

import re
from datetime import timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.models import AccessEvent, PrintJob
from app.models.domain import ORDER_STATUSES
from app.services.orders import transition
from app.services.presentation import (
    SIMULATED_NOTICE,
    notification,
    status_text,
    ticket,
)
from app.services.printing import (
    PrintingUnavailable,
    PrintModeMismatch,
    create_print_job,
    register_agent,
)
from tests.conftest import NOW
from tests.factories import paid_order_with_document, ready_order

# Phrases that would tell a customer paper exists or can be collected.
PHYSICAL_CLAIMS = re.compile(
    r"ready for (pickup|collection)|ready to collect|collect your|being printed|"
    r"pages are printed|prints are ready|show (this|it|your pickup code) at the counter|"
    r"\bcollected\b",
    re.IGNORECASE,
)
AFTER_PRINTING = ("printing", "ready", "completed", "uncollected")


async def test_phase_1_refuses_physical_print_agents(db, shop_id):
    with pytest.raises(PrintingUnavailable):
        await register_agent(db, shop_id=shop_id, name="Office laser", mode="physical", now=NOW)


async def test_order_and_job_take_their_mode_from_the_server(db, simulated_agent):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    assert order.print_mode == "simulated"
    transition(order, "accepted", now=NOW)
    job = await create_print_job(
        db, order=order, document=document, agent=simulated_agent, copies=1, now=NOW
    )
    assert job.mode == "simulated"


async def test_a_simulated_order_cannot_be_printed_by_a_physical_agent(
    db, simulated_agent, physical_agent
):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    transition(order, "accepted", now=NOW)
    with pytest.raises(PrintModeMismatch):
        await create_print_job(
            db, order=order, document=document, agent=physical_agent, copies=1, now=NOW
        )


async def test_database_rejects_a_job_whose_mode_differs_from_its_order(
    db, simulated_agent, physical_agent
):
    """Even code that bypasses the service cannot record a 'physical' job on a simulated order."""
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    db.add(
        PrintJob(
            order_id=order.id,
            document_id=document.id,
            agent_id=physical_agent.id,
            mode="physical",
            copies=1,
            status="done",
            created_at=NOW,
        )
    )
    with pytest.raises(IntegrityError, match="fk_print_jobs_order_mode"):
        await db.flush()
    await db.rollback()


async def test_database_rejects_a_job_whose_mode_differs_from_its_agent(db, simulated_agent):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    db.add(
        PrintJob(
            order_id=order.id,
            document_id=document.id,
            agent_id=simulated_agent.id,
            mode="physical",
            copies=1,
            status="done",
            created_at=NOW,
        )
    )
    with pytest.raises(IntegrityError, match="fk_print_jobs_"):
        await db.flush()
    await db.rollback()


async def test_database_rejects_a_print_receipt_entry_without_a_mode(db, simulated_agent):
    order, _ = await paid_order_with_document(db, simulated_agent, NOW)
    db.add(
        AccessEvent(order_id=order.id, action="printed", actor_kind="shop", at=NOW, print_mode=None)
    )
    with pytest.raises(IntegrityError, match="print_mode_recorded"):
        await db.flush()
    await db.rollback()


async def test_access_receipt_is_append_only(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    await db.commit()
    with pytest.raises(Exception, match="append-only"):
        await db.execute(text("UPDATE access_events SET print_mode = 'physical'"))
    await db.rollback()
    with pytest.raises(Exception, match="append-only"):
        await db.execute(text("DELETE FROM access_events"))
    await db.rollback()


async def test_simulated_print_is_recorded_as_simulated(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    printed = (await db.scalars(select(AccessEvent).where(AccessEvent.action == "printed"))).one()
    assert printed.print_mode == "simulated"
    assert SIMULATED_NOTICE in printed.detail


@pytest.mark.parametrize("status", ORDER_STATUSES)
def test_every_simulated_status_is_honest(status):
    text_ = status_text(status, "simulated")
    words = f"{text_.label} {text_.hint}"
    assert not PHYSICAL_CLAIMS.search(words), words
    if status in AFTER_PRINTING:
        assert SIMULATED_NOTICE in text_.hint


@pytest.mark.parametrize("status", ORDER_STATUSES)
def test_physical_statuses_never_mention_simulation(status):
    text_ = status_text(status, "physical")
    assert "SIMULATED" not in f"{text_.label} {text_.hint}".upper()


async def test_simulated_ticket_code_is_not_a_collection_credential(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    view = ticket(order)
    assert view.code_valid_for_collection is False
    assert view.banner == SIMULATED_NOTICE
    assert view.code_label == "Demo code"
    assert "Not valid for collecting anything" in view.code_note
    assert not PHYSICAL_CLAIMS.search(f"{view.title} {view.code_label}")


async def test_physical_ticket_is_a_real_pickup_ticket(db, physical_agent):
    order, _ = await paid_order_with_document(db, physical_agent, NOW)
    order.status = "ready"
    view = ticket(order)
    assert view.code_valid_for_collection is True
    assert view.banner is None
    assert view.title == "Ready for pickup"


@pytest.mark.parametrize("event", ["printing", "ready", "completed"])
async def test_simulated_notifications_never_promise_paper(db, simulated_agent, event):
    order, _ = await ready_order(db, simulated_agent, NOW + timedelta(minutes=1))
    message = notification(order, event)
    assert SIMULATED_NOTICE in message.subject
    assert not PHYSICAL_CLAIMS.search(f"{message.subject} {message.body}"), message
