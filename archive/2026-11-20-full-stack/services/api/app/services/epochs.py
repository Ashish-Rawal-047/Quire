"""Epoch keys: which key wraps a new document's data key, and how long that key must live.

An epoch accepts new documents for a short window (`key_epoch_hours`). Its `retain_until` is the
latest hard expiry of every document wrapped under it, and it is updated whenever a document's
expiry is set or extended (for example at payment). So a key is never destroyed while any file
it protects may still legitimately be needed, and never kept longer than the last of them.

It is destroyed earlier than `retain_until` once its window has closed and every document under
it has been purged (see retention.destroy_due_epochs).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crypto.keystore import KeyStore
from app.models import Document, KeyEpoch

# Arbitrary constant for pg_advisory_xact_lock: serialises epoch creation across API processes.
_EPOCH_LOCK = 0x5155_4952  # "QUIR"


class EpochUnavailable(Exception):
    """The document's epoch key is gone, so its expiry can no longer be extended."""


def window_start(now: datetime, hours: int) -> datetime:
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight + timedelta(hours=(now.hour // hours) * hours)


async def epoch_for_new_document(
    session: AsyncSession, *, now: datetime, hard_expires_at: datetime, keystore: KeyStore
) -> KeyEpoch:
    await session.execute(select(func.pg_advisory_xact_lock(_EPOCH_LOCK)))
    epoch = (
        await session.execute(
            select(KeyEpoch)
            .where(
                KeyEpoch.accepts_from <= now,
                KeyEpoch.accepts_until > now,
                KeyEpoch.destroyed_at.is_(None),
            )
            .order_by(KeyEpoch.created_at.desc())
            .limit(1)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if epoch is None or not keystore.exists(str(epoch.id)):
        hours = get_settings().key_epoch_hours
        start = window_start(now, hours)
        epoch = KeyEpoch(
            id=uuid.uuid4(),
            accepts_from=start,
            accepts_until=start + timedelta(hours=hours),
            retain_until=hard_expires_at,
            created_at=now,
        )
        keystore.create(str(epoch.id))
        session.add(epoch)
    elif hard_expires_at > epoch.retain_until:
        epoch.retain_until = hard_expires_at
    await session.flush()
    return epoch


async def set_document_expiry(
    session: AsyncSession, document: Document, new_expiry: datetime, *, now: datetime
) -> None:
    """Change a document's hard expiry and keep its epoch key alive at least that long."""
    epoch = (
        await session.execute(
            select(KeyEpoch)
            .where(KeyEpoch.id == document.epoch_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one()
    if epoch.destroyed_at is not None or new_expiry <= now:
        raise EpochUnavailable(str(epoch.id))
    document.hard_expires_at = new_expiry
    if new_expiry > epoch.retain_until:
        epoch.retain_until = new_expiry
    await session.flush()
