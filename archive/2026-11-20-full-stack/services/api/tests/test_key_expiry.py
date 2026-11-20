"""Epoch keys live exactly as long as the files they protect, and no longer.

NOW is 10:00 UTC, inside the 06:00–12:00 epoch window (6-hour windows).
"""

from datetime import timedelta

import pytest
from sqlalchemy import select

from app.crypto.keystore import KeyDestroyed
from app.models import AccessEvent, Document, KeyEpoch
from app.services.documents import PAID_RETENTION_CAP, UNPAID_RETENTION, read_plaintext
from app.services.epochs import EpochUnavailable, set_document_expiry, window_start
from app.services.orders import mark_paid, transition
from app.services.retention import purge_document, run_retention_sweep
from tests.conftest import NOW
from tests.factories import new_order, upload

WINDOW = window_start(NOW, 6)  # 06:00


async def _epoch(db, document) -> KeyEpoch:
    return await db.get(KeyEpoch, document.epoch_id, populate_existing=True)


async def test_documents_in_one_window_share_an_epoch_that_outlives_them_all(db, simulated_agent):
    first = await upload(db, await new_order(db, simulated_agent, NOW), NOW)
    later = NOW + timedelta(hours=1, minutes=30)
    second = await upload(db, await new_order(db, simulated_agent, later), later)
    assert first.epoch_id == second.epoch_id
    epoch = await _epoch(db, first)
    assert epoch.accepts_from == WINDOW and epoch.accepts_until == WINDOW + timedelta(hours=6)
    assert epoch.retain_until == max(first.hard_expires_at, second.hard_expires_at)
    assert epoch.retain_until == later + UNPAID_RETENTION


async def test_payment_extends_the_key_to_the_files_new_expiry(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    transition(order, "awaiting_payment", now=NOW)
    paid_at = NOW + timedelta(hours=20)
    await mark_paid(db, order, now=paid_at)
    assert document.hard_expires_at == paid_at + PAID_RETENTION_CAP
    assert (await _epoch(db, document)).retain_until == paid_at + PAID_RETENTION_CAP


async def test_key_is_not_destroyed_72_hours_after_the_window_while_a_file_needs_it(
    db, simulated_agent, keystore
):
    """The case a fixed '72 h after the start of the day/window' rule gets wrong."""
    early = await upload(db, await new_order(db, simulated_agent, WINDOW), WINDOW)
    late_upload = WINDOW + timedelta(hours=5, minutes=55)  # 11:55, end of the window
    order = await new_order(db, simulated_agent, late_upload)
    late = await upload(db, order, late_upload)
    transition(order, "awaiting_payment", now=late_upload)
    paid_at = late_upload + timedelta(hours=23)  # paid the next day
    await mark_paid(db, order, now=paid_at)
    await db.commit()

    naive_deadline = WINDOW + timedelta(hours=72, minutes=1)
    await run_retention_sweep(db, now=naive_deadline)
    epoch = await _epoch(db, late)
    assert epoch.destroyed_at is None
    assert keystore.exists(str(epoch.id))
    early_row = await db.get(Document, early.id, populate_existing=True)
    assert early_row.state == "purged"  # its own 24 h passed
    assert await read_plaintext(await db.get(Document, late.id, populate_existing=True))

    expiry = paid_at + PAID_RETENTION_CAP
    await run_retention_sweep(db, now=expiry - timedelta(minutes=1))
    assert (await _epoch(db, late)).destroyed_at is None

    await run_retention_sweep(db, now=expiry)
    epoch = await _epoch(db, late)
    assert epoch.destroyed_at == expiry
    assert not keystore.exists(str(epoch.id))
    assert (await db.get(Document, late.id, populate_existing=True)).state == "purged"


async def test_key_is_destroyed_early_once_every_file_under_it_is_gone(
    db, simulated_agent, keystore
):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    await purge_document(db, document, now=NOW + timedelta(minutes=5), reason="customer_request")
    await db.commit()

    # Window still open: new uploads may still join this epoch, so it stays.
    await run_retention_sweep(db, now=NOW + timedelta(hours=1))
    assert (await _epoch(db, document)).destroyed_at is None

    # Window closed (12:00 + 5 min margin) and nothing left under it: destroyed long before
    # its retain_until (the next day).
    sweep_at = WINDOW + timedelta(hours=6, minutes=5)
    await run_retention_sweep(db, now=sweep_at)
    epoch = await _epoch(db, document)
    assert epoch.destroyed_at == sweep_at < epoch.retain_until
    assert not keystore.exists(str(epoch.id))


async def test_database_backups_become_useless_once_the_epoch_key_is_destroyed(
    db, simulated_agent, keystore
):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    # What a database backup taken now would contain for this document:
    backup = {"epoch": str(document.epoch_id), "wrapped_key": document.wrapped_key}
    aad = b"quire-dek:" + document.id.bytes

    await purge_document(db, document, now=NOW + timedelta(minutes=5), reason="customer_request")
    await db.commit()
    # Honest residual window: until the epoch key is destroyed, the backed-up wrapped key can
    # still be unwrapped (the ciphertext itself is gone from storage and is never backed up).
    assert len(keystore.unwrap(backup["epoch"], backup["wrapped_key"], aad)) == 32

    await run_retention_sweep(db, now=WINDOW + timedelta(hours=6, minutes=5))
    with pytest.raises(KeyDestroyed):
        keystore.unwrap(backup["epoch"], backup["wrapped_key"], aad)

    events = (
        await db.scalars(select(AccessEvent).where(AccessEvent.action == "key_destroyed"))
    ).all()
    assert [e.document_id for e in events] == [document.id]


async def test_new_files_never_join_a_closed_epoch(db, simulated_agent):
    first = await upload(db, await new_order(db, simulated_agent, NOW), NOW)
    next_window = WINDOW + timedelta(hours=6, minutes=1)
    second = await upload(db, await new_order(db, simulated_agent, next_window), next_window)
    assert second.epoch_id != first.epoch_id
    assert (await _epoch(db, second)).accepts_from == WINDOW + timedelta(hours=6)


async def test_expiry_cannot_be_extended_after_the_key_is_destroyed(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    await purge_document(db, document, now=NOW, reason="customer_request")
    await db.commit()
    await run_retention_sweep(db, now=WINDOW + timedelta(hours=7))
    with pytest.raises(EpochUnavailable):
        await set_document_expiry(
            db, document, NOW + timedelta(days=5), now=WINDOW + timedelta(hours=7)
        )
