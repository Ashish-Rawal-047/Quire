"""Deletion: purging documents and destroying epoch keys on schedule.

Purging a document removes, in this order:
1. every object under its storage prefix — the encrypted original and every derived file
   (previews, thumbnails, print-ready renders), which are all stored under that prefix;
2. its scratch folder, if any;
3. its wrapped data key and its encrypted filename, from the live database.

Backups of the database still hold the wrapped data key until the document's epoch key is
destroyed. That happens as soon as the epoch's window has closed and all its documents are purged,
and never later than `retain_until` (the last hard expiry under that key).
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.storage import get_s3
from app.crypto.keystore import KeyStore, get_keystore
from app.models import Document, KeyEpoch, Order
from app.services import audit
from app.services.workspace import remove_workspace, sweep_workspaces

# A closed epoch is kept a little past its window so in-flight uploads can't race its destruction.
EPOCH_CLOSE_MARGIN = timedelta(minutes=5)
# Orphans (objects or keys with no database record) are only removed once they are this old,
# so an upload that is still being committed is never touched.
ORPHAN_AGE = timedelta(hours=1)

PURGE_REASONS = {
    "collected": "1 hour after pickup",
    "uncollected": "24 hours after the order was ready",
    "cancelled": "Order cancelled",
    "unpaid": "Not paid within 24 hours",
    "hard_cap": "Maximum retention period reached",
    "customer_request": "Deleted at your request",
    "removed": "Removed from the order",
}


class PurgeIncomplete(Exception):
    """Objects were still present after deletion. The sweep retries; the key is still destroyed
    at the hard cap, which makes any leftover ciphertext unreadable."""


@dataclass
class SweepReport:
    purged: list[uuid.UUID] = field(default_factory=list)
    epochs_destroyed: list[uuid.UUID] = field(default_factory=list)
    workspaces_removed: int = 0
    orphan_objects_removed: int = 0
    orphan_keys_destroyed: int = 0
    errors: list[str] = field(default_factory=list)


def _list_keys(prefix: str) -> list[str]:
    s3, bucket = get_s3(), get_settings().s3_bucket
    keys: list[str] = []
    token: str | None = None
    while True:
        kwargs = {"Bucket": bucket, "Prefix": prefix}
        if token:
            kwargs["ContinuationToken"] = token
        page = s3.list_objects_v2(**kwargs)
        keys += [o["Key"] for o in page.get("Contents", [])]
        if not page.get("IsTruncated"):
            return keys
        token = page["NextContinuationToken"]


def _delete_prefix(prefix: str) -> int:
    s3, bucket = get_s3(), get_settings().s3_bucket
    keys = _list_keys(prefix)
    for i in range(0, len(keys), 1000):
        s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": k} for k in keys[i : i + 1000]], "Quiet": True},
        )
    if _list_keys(prefix):
        raise PurgeIncomplete(prefix)
    return len(keys)


async def purge_document(
    session: AsyncSession, document: Document, *, now: datetime, reason: str
) -> int:
    """Delete everything stored for one document. Returns the number of objects removed."""
    if document.state == "purged":
        return 0
    if reason not in PURGE_REASONS:
        raise ValueError(reason)
    removed = await asyncio.to_thread(_delete_prefix, document.object_prefix)
    await asyncio.to_thread(remove_workspace, document.id)
    document.wrapped_key = None
    document.name_sealed = None
    document.state = "purged"
    document.purged_at = now
    document.purge_reason = reason
    audit.record(
        session,
        order_id=document.order_id,
        document_id=document.id,
        action="deleted",
        actor_kind="system",
        at=now,
        detail=PURGE_REASONS[reason],
    )
    await session.flush()
    return removed


def _reason(document: Document, order: Order, now: datetime) -> str:
    if now < document.hard_expires_at:
        if order.status == "completed":
            return "collected"
        if order.status == "cancelled":
            return "cancelled"
        if order.status in ("ready", "uncollected"):
            return "uncollected"
    return "unpaid" if order.paid_at is None else "hard_cap"


async def purge_due_documents(session: AsyncSession, *, now: datetime) -> list[uuid.UUID]:
    rows = (
        await session.execute(
            select(Document, Order)
            .join(Order, Order.id == Document.order_id)
            .where(
                Document.state == "stored",
                or_(Document.hard_expires_at <= now, Order.purge_after <= now),
            )
            .with_for_update(of=Document, skip_locked=True)
        )
    ).all()
    purged = []
    for document, order in rows:
        await purge_document(session, document, now=now, reason=_reason(document, order, now))
        purged.append(document.id)
    return purged


async def destroy_due_epochs(
    session: AsyncSession, *, now: datetime, keystore: KeyStore | None = None
) -> list[uuid.UUID]:
    """Destroy epoch keys that no longer protect any needed document.

    An epoch is due when its window has closed and none of its documents are still stored, or
    unconditionally once `retain_until` has passed (any stragglers are purged first). The key is
    destroyed in the key store *before* the database records it, so a failed commit can only
    leave a key recorded as live that is already gone — never the reverse.
    """
    keystore = keystore or get_keystore()
    epochs = (
        await session.scalars(
            select(KeyEpoch)
            .where(
                KeyEpoch.destroyed_at.is_(None),
                or_(
                    KeyEpoch.retain_until <= now,
                    KeyEpoch.accepts_until <= now - EPOCH_CLOSE_MARGIN,
                ),
            )
            .with_for_update(skip_locked=True)
        )
    ).all()
    destroyed = []
    for epoch in epochs:
        stored = (
            await session.scalars(
                select(Document).where(Document.epoch_id == epoch.id, Document.state == "stored")
            )
        ).all()
        if stored and epoch.retain_until > now:
            continue  # still protecting a document that may legitimately be needed
        for document in stored:
            order = await session.get(Order, document.order_id)
            assert order is not None
            await purge_document(session, document, now=now, reason=_reason(document, order, now))

        keystore.destroy(str(epoch.id))
        epoch.destroyed_at = now
        protected = (
            await session.scalars(select(Document).where(Document.epoch_id == epoch.id))
        ).all()
        for document in protected:
            audit.record(
                session,
                order_id=document.order_id,
                document_id=document.id,
                action="key_destroyed",
                actor_kind="system",
                at=now,
                detail="Backup copies of this file can no longer be decrypted",
            )
        await session.flush()
        destroyed.append(epoch.id)
    return destroyed


def _orphan_object_prefixes(live: set[str], older_than: datetime) -> list[str]:
    s3, bucket = get_s3(), get_settings().s3_bucket
    orphans: set[str] = set()
    token: str | None = None
    while True:
        kwargs = {"Bucket": bucket, "Prefix": "docs/"}
        if token:
            kwargs["ContinuationToken"] = token
        page = s3.list_objects_v2(**kwargs)
        for obj in page.get("Contents", []):
            prefix = "/".join(obj["Key"].split("/")[:2]) + "/"
            if prefix not in live and obj["LastModified"] <= older_than:
                orphans.add(prefix)
        if not page.get("IsTruncated"):
            return sorted(orphans)
        token = page["NextContinuationToken"]


async def run_retention_sweep(
    session: AsyncSession, *, now: datetime, keystore: KeyStore | None = None
) -> SweepReport:
    """One pass of the retention job. Commits as it goes so progress survives a later failure."""
    keystore = keystore or get_keystore()
    report = SweepReport()

    report.purged = await purge_due_documents(session, now=now)
    await session.commit()

    report.epochs_destroyed = await destroy_due_epochs(session, now=now, keystore=keystore)
    await session.commit()

    live_docs = set(await session.scalars(select(Document.id).where(Document.state == "stored")))
    report.workspaces_removed = await asyncio.to_thread(sweep_workspaces, live_docs)

    # Objects with no stored document: a crash between upload and commit, or a restored database.
    live_prefixes = {f"docs/{d}/" for d in live_docs}
    for prefix in await asyncio.to_thread(_orphan_object_prefixes, live_prefixes, now - ORPHAN_AGE):
        report.orphan_objects_removed += await asyncio.to_thread(_delete_prefix, prefix)

    # Keys with no live epoch record (e.g. the transaction that created them rolled back).
    live_epochs = {
        str(e)
        for e in await session.scalars(select(KeyEpoch.id).where(KeyEpoch.destroyed_at.is_(None)))
    }
    for key_id in keystore.list_ids(older_than_seconds=ORPHAN_AGE.total_seconds()):
        if key_id not in live_epochs:
            keystore.destroy(key_id)
            report.orphan_keys_destroyed += 1
    return report


async def count_stored(session: AsyncSession) -> int:
    return await session.scalar(
        select(func.count()).select_from(Document).where(Document.state == "stored")
    )
