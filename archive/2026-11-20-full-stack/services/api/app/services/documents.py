"""Document intake and decryption.

Uploads arrive as a raw request body stream (`request.stream()`), never through multipart form
parsing: Starlette's form parser spools files over 1 MB to a temporary file on disk, in
plaintext. Here each 64 KiB chunk is encrypted as it arrives and the ciphertext is sent to object
storage in 5 MiB multipart parts. Peak memory per upload is about one part of ciphertext plus two
chunks of plaintext, whatever the file size, and plaintext is never written to disk.
"""

from __future__ import annotations

import asyncio
import os
import re
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.storage import get_s3
from app.crypto.aead import (
    CHUNK_SIZE,
    StreamEncryptor,
    decrypt_bytes,
    encrypt_bytes,
    open_sealed,
    seal,
)
from app.crypto.keystore import KeyStore, get_keystore
from app.models import Document, Order
from app.services import audit
from app.services.epochs import epoch_for_new_document

PART_SIZE = 5 * 1024 * 1024  # S3 minimum for every multipart part except the last
UNPAID_RETENTION = timedelta(hours=24)
PAID_RETENTION_CAP = timedelta(hours=72)

ArtifactKind = Literal["preview", "thumbnail", "print_ready"]

_SIGNATURES: tuple[tuple[bytes, str, str], ...] = (
    (b"%PDF-", "application/pdf", "PDF"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "PNG"),
    (b"\xff\xd8\xff", "image/jpeg", "JPEG"),
)


class UploadRejected(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class DocumentGone(Exception):
    """The document has been purged; its key and content no longer exist."""


def object_prefix(document_id: uuid.UUID) -> str:
    return f"docs/{document_id}/"


def object_key(document_id: uuid.UUID, kind: str = "original", name: str = "") -> str:
    if kind == "original":
        return f"{object_prefix(document_id)}original"
    if not re.fullmatch(r"[a-z0-9_-]{1,40}", name):
        raise ValueError("invalid artifact name")
    return f"{object_prefix(document_id)}{kind}/{name}"


def _object_aad(key: str) -> bytes:
    return f"quire-object:{key}".encode()


def _dek_aad(document_id: uuid.UUID) -> bytes:
    return b"quire-dek:" + document_id.bytes


def _name_aad(document_id: uuid.UUID) -> bytes:
    return b"quire-name:" + document_id.bytes


def clean_filename(name: str) -> str:
    base = re.split(r"[\\/]", name or "")[-1]
    base = re.sub(r"[\x00-\x1f\x7f]", "", base).strip()
    return base[:180] or "document"


def sniff(head: bytes) -> tuple[str, str]:
    """Detect the type from magic bytes. The extension and browser MIME type are ignored."""
    for magic, mime, label in _SIGNATURES:
        if head.startswith(magic):
            return mime, label
    raise UploadRejected("unsupported_type", "Only PDF, PNG and JPEG files can be printed.")


def _human_size(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.1f} MB"


async def ingest_stream(
    session: AsyncSession,
    *,
    order: Order,
    filename: str,
    chunks: AsyncIterator[bytes],
    now: datetime,
    keystore: KeyStore | None = None,
    max_bytes: int | None = None,
) -> Document:
    """Encrypt an upload as it streams in and store only ciphertext. Returns the new Document."""
    if order.status != "draft":
        raise UploadRejected("order_locked", "Files can only be added before checkout.")
    keystore = keystore or get_keystore()
    settings = get_settings()
    limit = max_bytes or settings.max_upload_bytes
    s3, bucket = get_s3(), settings.s3_bucket

    document_id = uuid.uuid4()
    key = object_key(document_id)
    data_key = os.urandom(32)
    enc = StreamEncryptor(data_key, _object_aad(key))

    upload = await asyncio.to_thread(
        s3.create_multipart_upload,
        Bucket=bucket,
        Key=key,
        ContentType="application/octet-stream",
    )
    upload_id = upload["UploadId"]
    parts: list[dict] = []
    out = bytearray(enc.header())
    buf = bytearray()
    pending: bytes | None = None
    total = 0
    ciphertext_bytes = 0
    detected: tuple[str, str] | None = None

    async def send_part(data: bytes) -> None:
        number = len(parts) + 1
        result = await asyncio.to_thread(
            s3.upload_part,
            Bucket=bucket,
            Key=key,
            UploadId=upload_id,
            PartNumber=number,
            Body=data,
        )
        parts.append({"ETag": result["ETag"], "PartNumber": number})

    try:
        async for piece in chunks:
            if not piece:
                continue
            total += len(piece)
            if total > limit:
                raise UploadRejected(
                    "too_large", f"Files can be up to {limit // (1024 * 1024)} MB."
                )
            buf += piece
            if detected is None and len(buf) >= 8:
                detected = sniff(bytes(buf[:8]))
            while len(buf) >= CHUNK_SIZE:
                chunk = bytes(buf[:CHUNK_SIZE])
                del buf[:CHUNK_SIZE]
                if pending is not None:
                    out += enc.seal_chunk(pending, final=False)
                pending = chunk
                if len(out) >= PART_SIZE:
                    ciphertext_bytes += len(out)
                    await send_part(bytes(out))
                    out.clear()

        if total == 0:
            raise UploadRejected("empty", "This file is empty.")
        if detected is None:
            detected = sniff(bytes(buf))
        if buf:
            if pending is not None:
                out += enc.seal_chunk(pending, final=False)
            pending = bytes(buf)
        assert pending is not None
        out += enc.seal_chunk(pending, final=True)
        ciphertext_bytes += len(out)
        await send_part(bytes(out))
        await asyncio.to_thread(
            s3.complete_multipart_upload,
            Bucket=bucket,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )
    except BaseException:
        try:
            await asyncio.to_thread(
                s3.abort_multipart_upload, Bucket=bucket, Key=key, UploadId=upload_id
            )
        except Exception:  # noqa: BLE001 — the original error matters more; sweeps clean up
            pass
        raise
    finally:
        # Best effort only: Python cannot guarantee that copies of plaintext are wiped from memory.
        buf[:] = bytes(len(buf))
        out.clear()
        pending = None

    mime, label = detected
    hard_expires_at = (
        order.paid_at + PAID_RETENTION_CAP if order.paid_at else now + UNPAID_RETENTION
    )
    epoch = await epoch_for_new_document(
        session, now=now, hard_expires_at=hard_expires_at, keystore=keystore
    )
    document = Document(
        id=document_id,
        order_id=order.id,
        epoch_id=epoch.id,
        state="stored",
        content_type=mime,
        size_bytes=total,
        ciphertext_bytes=ciphertext_bytes,
        name_sealed=seal(data_key, clean_filename(filename).encode(), _name_aad(document_id)),
        wrapped_key=keystore.wrap(str(epoch.id), data_key, _dek_aad(document_id)),
        object_prefix=object_prefix(document_id),
        # Malware scanning (ClamAV INSTREAM during intake) is not built yet — never claim "clean".
        scan_status="not_scanned",
        uploaded_at=now,
        hard_expires_at=hard_expires_at,
    )
    session.add(document)
    await session.flush()
    audit.record(
        session,
        order_id=order.id,
        document_id=document_id,
        action="uploaded",
        actor_kind="customer",
        at=now,
        detail=f"{label} · {_human_size(total)} · encrypted with its own key",
    )
    await session.flush()
    return document


def data_key_for(document: Document, keystore: KeyStore | None = None) -> bytes:
    if document.state != "stored" or document.wrapped_key is None:
        raise DocumentGone(str(document.id))
    keystore = keystore or get_keystore()
    return keystore.unwrap(str(document.epoch_id), document.wrapped_key, _dek_aad(document.id))


def document_filename(document: Document, keystore: KeyStore | None = None) -> str:
    if document.name_sealed is None:
        raise DocumentGone(str(document.id))
    key = data_key_for(document, keystore)
    return open_sealed(key, document.name_sealed, _name_aad(document.id)).decode()


async def put_artifact(
    document: Document,
    kind: ArtifactKind,
    name: str,
    data: bytes,
    keystore: KeyStore | None = None,
) -> str:
    """Store a derived file (preview, thumbnail, print-ready render), encrypted with the
    document's own key and under the document's prefix, so purge removes it with the original."""
    key = object_key(document.id, kind, name)
    sealed = encrypt_bytes(data_key_for(document, keystore), data, _object_aad(key))
    await asyncio.to_thread(
        get_s3().put_object, Bucket=get_settings().s3_bucket, Key=key, Body=sealed
    )
    return key


async def read_plaintext(
    document: Document,
    kind: str = "original",
    name: str = "",
    keystore: KeyStore | None = None,
) -> bytes:
    """Decrypt a whole object into memory. For small objects and tests; printing streams instead."""
    data_key = data_key_for(document, keystore)
    key = object_key(document.id, kind, name)
    body = await asyncio.to_thread(
        lambda: get_s3().get_object(Bucket=get_settings().s3_bucket, Key=key)["Body"].read()
    )
    return decrypt_bytes(data_key, body, _object_aad(key))
