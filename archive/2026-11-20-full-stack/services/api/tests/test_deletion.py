"""Deletion covers every stored form of a document, on the published schedule."""

import os
import time
import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.storage import get_s3
from app.models import AccessEvent, Document, Order
from app.services.documents import DocumentGone, put_artifact, read_plaintext
from app.services.orders import transition
from app.services.pickup import pickup_code, verify_pickup
from app.services.retention import purge_document, run_retention_sweep
from app.services.workspace import workspace_path
from tests.conftest import NOW, bucket_keys
from tests.factories import new_order, paid_order_with_document, ready_order, upload


async def test_purge_removes_original_derived_files_temp_files_and_key(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    await put_artifact(document, "preview", "page-1", b"webp preview bytes")
    await put_artifact(document, "thumbnail", "page-1", b"webp thumb bytes")
    await put_artifact(document, "print_ready", "job-1", b"rendered pages")
    scratch = workspace_path(document.id)
    scratch.mkdir(parents=True)
    (scratch / "render.tmp").write_bytes(b"temporary render")
    assert len(bucket_keys(f"docs/{document.id}/")) == 4
    assert await read_plaintext(document, "preview", "page-1") == b"webp preview bytes"

    removed = await purge_document(db, document, now=NOW, reason="customer_request")

    assert removed == 4
    assert bucket_keys(f"docs/{document.id}/") == []
    assert not scratch.exists()
    assert document.state == "purged"
    assert document.wrapped_key is None and document.name_sealed is None
    with pytest.raises(DocumentGone):
        await read_plaintext(document)
    events = (await db.scalars(select(AccessEvent).where(AccessEvent.action == "deleted"))).all()
    assert [e.detail for e in events] == ["Deleted at your request"]


async def test_purge_keeps_order_history_without_content(db, simulated_agent):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    await purge_document(db, document, now=NOW, reason="customer_request")
    await db.commit()
    row = await db.get(Order, order.id)
    assert row.number.startswith("PF-") and row.status == "paid"
    stored = await db.get(Document, document.id)
    assert stored.size_bytes > 0 and stored.content_type == "application/pdf"


async def _purged(db, document_id) -> bool:
    return (await db.get(Document, document_id, populate_existing=True)).state == "purged"


async def test_unpaid_files_are_deleted_24_hours_after_upload(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    document = await upload(db, order, NOW)
    await run_retention_sweep(db, now=NOW + timedelta(hours=23, minutes=59))
    assert not await _purged(db, document.id)
    await run_retention_sweep(db, now=NOW + timedelta(hours=24))
    assert await _purged(db, document.id)
    assert (await db.get(Document, document.id)).purge_reason == "unpaid"


async def test_collected_files_are_deleted_1_hour_after_pickup(db, simulated_agent):
    order, document = await ready_order(db, simulated_agent, NOW)
    picked_up = NOW + timedelta(minutes=30)
    result = await verify_pickup(
        db,
        order_id=order.id,
        shop_id=order.shop_id,
        actor_id="staff-1",
        code=pickup_code(order),
        now=picked_up,
    )
    assert result.outcome == "verified"
    await run_retention_sweep(db, now=picked_up + timedelta(minutes=59))
    assert not await _purged(db, document.id)
    await run_retention_sweep(db, now=picked_up + timedelta(hours=1))
    assert await _purged(db, document.id)
    assert (await db.get(Document, document.id)).purge_reason == "collected"


async def test_uncollected_files_are_deleted_24_hours_after_ready(db, simulated_agent):
    order, document = await ready_order(db, simulated_agent, NOW)
    await run_retention_sweep(db, now=order.ready_at + timedelta(hours=23, minutes=59))
    assert not await _purged(db, document.id)
    await run_retention_sweep(db, now=order.ready_at + timedelta(hours=24))
    assert await _purged(db, document.id)


async def test_cancelled_files_are_deleted_within_5_minutes(db, simulated_agent):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    cancelled = NOW + timedelta(minutes=10)
    transition(order, "cancelled", now=cancelled)
    await run_retention_sweep(db, now=cancelled + timedelta(minutes=4))
    assert not await _purged(db, document.id)
    await run_retention_sweep(db, now=cancelled + timedelta(minutes=5))
    assert await _purged(db, document.id)


async def test_no_file_outlives_72_hours_after_payment(db, simulated_agent):
    order, document = await paid_order_with_document(db, simulated_agent, NOW)
    transition(order, "accepted", now=NOW + timedelta(minutes=5))  # then the shop goes silent
    await run_retention_sweep(db, now=order.paid_at + timedelta(hours=71, minutes=59))
    assert not await _purged(db, document.id)
    await run_retention_sweep(db, now=order.paid_at + timedelta(hours=72))
    assert await _purged(db, document.id)
    assert (await db.get(Document, document.id)).purge_reason == "hard_cap"


async def test_sweep_removes_orphaned_objects_workspaces_and_keys(db, simulated_agent, keystore):
    bucket = get_settings().s3_bucket
    orphan = uuid.uuid4()
    get_s3().put_object(Bucket=bucket, Key=f"docs/{orphan}/original", Body=b"ciphertext")
    workspace_path(orphan).mkdir(parents=True)
    orphan_key = str(uuid.uuid4())
    keystore.create(orphan_key)
    hour_ago = time.time() - 2 * 3600
    os.utime(get_settings().keystore_dir / f"{orphan_key}.key", (hour_ago, hour_ago))

    # A live document must survive the same sweep.
    order = await new_order(db, simulated_agent, utcnow())
    live = await upload(db, order, utcnow())

    report = await run_retention_sweep(db, now=utcnow() + timedelta(hours=2))
    assert report.orphan_objects_removed == 1
    assert report.workspaces_removed == 1
    assert report.orphan_keys_destroyed == 1
    assert bucket_keys(f"docs/{orphan}/") == []
    assert not keystore.exists(orphan_key)
    assert bucket_keys(f"docs/{live.id}/") == [f"docs/{live.id}/original"]
