"""Pickup verification is the only way to complete an order, and guessing is limited."""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError

from app.models import AccessEvent, Order, PickupAttempt
from app.services.orders import InvalidTransition, OrderNotFound, transition
from app.services.pickup import (
    LOCK_DURATION,
    InvalidCodeFormat,
    PickupNotAllowed,
    pickup_code,
    unlock_pickup,
    verify_pickup,
)
from tests.conftest import NOW
from tests.factories import paid_order_with_document, ready_order

T = NOW + timedelta(minutes=10)


def wrong(order: Order) -> str:
    return f"{(int(pickup_code(order)) + 1) % 10_000:04d}"


async def check(db, order, code, *, at=T, actor="staff-1", shop_id=None):
    return await verify_pickup(
        db,
        order_id=order.id,
        shop_id=shop_id or order.shop_id,
        actor_id=actor,
        code=code,
        now=at,
    )


async def test_code_is_four_digits_derived_not_stored(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    code = pickup_code(order)
    assert len(code) == 4 and code.isdigit()
    assert pickup_code(order) == code  # stable, so the customer's app can re-display it
    await db.commit()
    row = (await db.execute(text("SELECT * FROM orders"))).mappings().one()
    assert all(code not in str(value) for value in row.values() if not isinstance(value, bytes))


async def test_correct_code_completes_the_order_and_is_on_the_receipt(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    result = await check(db, order, pickup_code(order))
    assert result.outcome == "verified"
    assert order.status == "completed"
    assert order.pickup_verified_at == T and order.pickup_verified_by == "staff-1"
    assert order.purge_after == T + timedelta(hours=1)
    event = (
        await db.scalars(select(AccessEvent).where(AccessEvent.action == "pickup_verified"))
    ).one()
    assert event.print_mode == "simulated"
    assert "SIMULATED — no prints were handed over" in event.detail


async def test_physical_pickup_receipt_says_code_verified(db, physical_agent):
    order, _ = await paid_order_with_document(db, physical_agent, NOW)
    order.status = "ready"
    order.ready_at = NOW
    assert (await check(db, order, pickup_code(order))).outcome == "verified"
    event = (
        await db.scalars(select(AccessEvent).where(AccessEvent.action == "pickup_verified"))
    ).one()
    assert event.detail == "Pickup code verified at the counter"
    assert event.print_mode == "physical"


async def test_orders_cannot_be_completed_any_other_way(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    with pytest.raises(InvalidTransition):
        transition(order, "completed", now=T)
    await db.commit()
    # Not even by writing to the database directly.
    with pytest.raises(IntegrityError, match="completed_requires_pickup_verification"):
        await db.execute(update(Order).where(Order.id == order.id).values(status="completed"))
    await db.rollback()


async def test_only_ready_orders_can_be_picked_up(db, simulated_agent):
    order, _ = await paid_order_with_document(db, simulated_agent, NOW)
    with pytest.raises(PickupNotAllowed):
        await check(db, order, pickup_code(order))


async def test_another_shop_cannot_see_or_complete_the_order(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    with pytest.raises(OrderNotFound):
        await check(db, order, pickup_code(order), shop_id=uuid.uuid4())
    assert order.status == "ready"


@pytest.mark.parametrize("bad", ["", "12", "12345", "12a4", " 1234"])
async def test_malformed_codes_are_rejected_before_any_lookup(db, simulated_agent, bad):
    order, _ = await ready_order(db, simulated_agent, NOW)
    with pytest.raises(InvalidCodeFormat):
        await check(db, order, bad)


async def test_five_wrong_codes_lock_the_order_even_against_the_right_code(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    results = [await check(db, order, wrong(order)) for _ in range(5)]
    assert [r.attempts_left for r in results[:4]] == [4, 3, 2, 1]
    assert results[4].outcome == "locked"
    assert results[4].locked_until == T + LOCK_DURATION

    during = await check(db, order, pickup_code(order), at=T + timedelta(minutes=14))
    assert during.outcome == "locked"
    assert order.status == "ready"

    after = await check(db, order, pickup_code(order), at=T + LOCK_DURATION, actor="staff-2")
    assert after.outcome == "verified"
    locked = (
        await db.scalars(select(AccessEvent).where(AccessEvent.action == "pickup_locked"))
    ).all()
    assert len(locked) == 1


async def test_third_lockout_blocks_until_the_owner_unlocks_with_a_reason(db, simulated_agent):
    order, _ = await ready_order(db, simulated_agent, NOW)
    at = T
    for round_ in range(3):
        for i in range(5):
            await check(db, order, wrong(order), at=at, actor=f"staff-{round_}-{i}")
        at += LOCK_DURATION
    assert order.pickup_blocked
    assert (await check(db, order, pickup_code(order), at=at, actor="x")).outcome == "blocked"

    with pytest.raises(PermissionError):
        await unlock_pickup(
            db,
            order_id=order.id,
            shop_id=order.shop_id,
            actor_id="operator",
            actor_role="operator",
            reason="Customer showed ID",
            now=at,
        )
    with pytest.raises(ValueError):
        await unlock_pickup(
            db,
            order_id=order.id,
            shop_id=order.shop_id,
            actor_id="owner",
            actor_role="owner",
            reason="ok",
            now=at,
        )
    await unlock_pickup(
        db,
        order_id=order.id,
        shop_id=order.shop_id,
        actor_id="owner",
        actor_role="owner",
        reason="Customer showed the order on their phone and photo ID",
        now=at,
    )
    assert order.status == "ready"  # unlocking never marks the order collected
    unlocked = (
        await db.scalars(select(AccessEvent).where(AccessEvent.action == "pickup_unlocked"))
    ).one()
    assert "photo ID" in unlocked.detail
    assert (await check(db, order, pickup_code(order), at=at, actor="y")).outcome == "verified"


async def test_staff_member_rate_limit(db, simulated_agent):
    orders = [(await ready_order(db, simulated_agent, NOW))[0] for _ in range(3)]
    outcomes = []
    for i in range(11):
        order = orders[i % 3]
        outcomes.append((await check(db, order, wrong(order), at=T + timedelta(seconds=i))).outcome)
    assert outcomes[-1] == "rate_limited"
    # A rate-limited check never evaluates the code, so even the right one is refused.
    right = await check(db, orders[0], pickup_code(orders[0]), at=T + timedelta(seconds=20))
    assert right.outcome == "rate_limited"
    later = await check(db, orders[0], pickup_code(orders[0]), at=T + timedelta(minutes=2))
    assert later.outcome == "verified"


async def test_shop_wide_limit_stops_guessing_spread_across_orders(db, simulated_agent):
    orders = [(await ready_order(db, simulated_agent, NOW))[0] for _ in range(6)]
    at = T
    for i in range(20):  # 20 wrong codes from different staff, 4 per order (below the lock)
        order = orders[i % 5]
        await check(db, order, wrong(order), at=at, actor=f"staff-{i}")
        at += timedelta(seconds=10)
    result = await check(db, orders[5], wrong(orders[5]), at=at, actor="fresh")
    assert result.outcome == "rate_limited"
    attempts = (await db.scalars(select(PickupAttempt.outcome))).all()
    assert attempts.count("wrong_code") == 20 and attempts.count("rate_limited") == 1
