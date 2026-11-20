"""Pickup-code verification: the only way an order becomes `completed`.

The 4-digit code is not stored. It is derived from a per-order random nonce with a server-side
key (HMAC-SHA256), so a database leak alone does not reveal any code, and the customer's app can
re-display it at any time.

Ten thousand possible codes is a small space, so guessing is limited at three levels:

* per order — 5 wrong codes lock the order for 15 minutes; the 3rd lock blocks it until the shop
  owner unlocks it with a written reason (logged on the customer's access receipt);
* per staff member — at most 10 checks a minute;
* per shop — at most 20 wrong codes in 10 minutes across all orders, so a shop can't spread
  guesses over many orders.

While an order is locked or rate-limited the submitted code is not even compared.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crypto.keys import derive_key
from app.models import Order, PickupAttempt
from app.services import audit
from app.services.orders import COLLECTED_RETENTION, OrderNotFound, earliest

MAX_FAILURES = 5
LOCK_DURATION = timedelta(minutes=15)
MAX_LOCKOUTS = 3
ACTOR_LIMIT = 10
ACTOR_WINDOW = timedelta(minutes=1)
SHOP_FAILURE_LIMIT = 20
SHOP_WINDOW = timedelta(minutes=10)

Outcome = Literal["verified", "wrong_code", "locked", "blocked", "rate_limited"]


class PickupNotAllowed(Exception):
    """The order is not waiting for pickup (wrong state)."""


class InvalidCodeFormat(ValueError):
    pass


@dataclass(frozen=True)
class PickupResult:
    outcome: Outcome
    attempts_left: int | None = None
    locked_until: datetime | None = None


def pickup_code(order: Order) -> str:
    digest = hmac.new(
        derive_key("pickup-code"), b"pickup:" + order.id.bytes + order.pickup_nonce, hashlib.sha256
    ).digest()
    return f"{int.from_bytes(digest[:8], 'big') % 10_000:04d}"


async def _load(session: AsyncSession, order_id: uuid.UUID, shop_id: uuid.UUID) -> Order:
    order = (
        await session.execute(
            select(Order)
            .where(Order.id == order_id, Order.shop_id == shop_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if order is None:
        raise OrderNotFound()
    return order


async def _count(session: AsyncSession, *conditions) -> int:
    return await session.scalar(select(func.count()).select_from(PickupAttempt).where(*conditions))


async def verify_pickup(
    session: AsyncSession,
    *,
    order_id: uuid.UUID,
    shop_id: uuid.UUID,
    actor_id: str,
    code: str,
    now: datetime,
) -> PickupResult:
    """Check a pickup code. Every attempt is recorded; the caller commits whatever the outcome."""
    if not re.fullmatch(r"\d{4}", code or ""):
        raise InvalidCodeFormat("The pickup code is 4 digits")
    order = await _load(session, order_id, shop_id)
    if order.status != "ready":
        raise PickupNotAllowed(order.status)

    def attempt(outcome: str) -> None:
        session.add(
            PickupAttempt(
                order_id=order.id, shop_id=shop_id, actor_id=actor_id, outcome=outcome, at=now
            )
        )

    actor_recent = await _count(
        session, PickupAttempt.actor_id == actor_id, PickupAttempt.at > now - ACTOR_WINDOW
    )
    shop_failures = await _count(
        session,
        PickupAttempt.shop_id == shop_id,
        PickupAttempt.outcome == "wrong_code",
        PickupAttempt.at > now - SHOP_WINDOW,
    )
    if actor_recent >= ACTOR_LIMIT or shop_failures >= SHOP_FAILURE_LIMIT:
        attempt("rate_limited")
        await session.flush()
        return PickupResult("rate_limited")

    if order.pickup_blocked:
        attempt("locked")
        await session.flush()
        return PickupResult("blocked")
    if order.pickup_locked_until is not None and now < order.pickup_locked_until:
        attempt("locked")
        await session.flush()
        return PickupResult("locked", locked_until=order.pickup_locked_until)

    if hmac.compare_digest(code, pickup_code(order)):
        order.status = "completed"
        order.completed_at = now
        order.pickup_verified_at = now
        order.pickup_verified_by = actor_id
        order.pickup_failed_attempts = 0
        order.pickup_locked_until = None
        order.purge_after = earliest(order.purge_after, now + COLLECTED_RETENTION)
        attempt("success")
        simulated = order.print_mode == "simulated"
        audit.record(
            session,
            order_id=order.id,
            action="pickup_verified",
            actor_kind="shop",
            actor_id=actor_id,
            print_mode=order.print_mode,
            at=now,
            detail=(
                "Demo pickup check · SIMULATED — no prints were handed over"
                if simulated
                else "Pickup code verified at the counter"
            ),
        )
        await session.flush()
        return PickupResult("verified")

    attempt("wrong_code")
    order.pickup_failed_attempts += 1
    if order.pickup_failed_attempts < MAX_FAILURES:
        await session.flush()
        return PickupResult("wrong_code", attempts_left=MAX_FAILURES - order.pickup_failed_attempts)

    order.pickup_failed_attempts = 0
    order.pickup_lockouts += 1
    if order.pickup_lockouts >= MAX_LOCKOUTS:
        order.pickup_blocked = True
        detail = "Pickup blocked after repeated wrong codes — the shop owner must review it"
        result = PickupResult("blocked")
    else:
        order.pickup_locked_until = now + LOCK_DURATION
        detail = "Pickup locked for 15 minutes after 5 wrong codes"
        result = PickupResult("locked", locked_until=order.pickup_locked_until)
    audit.record(
        session,
        order_id=order.id,
        action="pickup_locked",
        actor_kind="system",
        at=now,
        detail=detail,
    )
    await session.flush()
    return result


async def unlock_pickup(
    session: AsyncSession,
    *,
    order_id: uuid.UUID,
    shop_id: uuid.UUID,
    actor_id: str,
    actor_role: str,
    reason: str,
    now: datetime,
) -> None:
    """Shop owner override. Clears the lock but never marks the order collected."""
    if actor_role != "owner":
        raise PermissionError("Only the shop owner can unlock pickup")
    reason = " ".join((reason or "").split())
    if len(reason) < 10:
        raise ValueError("Give a reason of at least 10 characters")
    order = await _load(session, order_id, shop_id)
    if order.status != "ready":
        raise PickupNotAllowed(order.status)
    order.pickup_blocked = False
    order.pickup_locked_until = None
    order.pickup_failed_attempts = 0
    audit.record(
        session,
        order_id=order.id,
        action="pickup_unlocked",
        actor_kind="shop",
        actor_id=actor_id,
        at=now,
        detail=f"Unlocked by the shop owner: {reason}"[:200],
    )
    await session.flush()
