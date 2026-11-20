"""Uploads are encrypted while they stream in: no plaintext on disk, bounded memory."""

import os
import re
import tempfile
import tracemalloc
import uuid
from contextlib import contextmanager
from pathlib import Path

import pytest
import starlette.formparsers
from fastapi import FastAPI, Request, UploadFile
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.storage import get_s3
from app.crypto.aead import CHUNK_SIZE
from app.models import AccessEvent, Document, Order
from app.services.documents import (
    UploadRejected,
    document_filename,
    ingest_stream,
    read_plaintext,
)
from tests.conftest import NOW, bucket_keys
from tests.factories import new_order, pdf_bytes, stream, upload

MARKER = b"CONFIDENTIAL-MARKER"


@contextmanager
def watch_temp_files(monkeypatch, directory: Path):
    """Record every temporary file Python or Starlette creates, and point the temp dir at an
    empty folder so anything written there can also be seen."""
    events: list[str] = []
    real_spooled = tempfile.SpooledTemporaryFile

    class RecordingSpooled(real_spooled):  # type: ignore[misc, valid-type]
        def rollover(self):
            events.append("spooled-to-disk")
            return super().rollover()

    real_inner = tempfile._mkstemp_inner

    def recording_inner(*args, **kwargs):
        fd, name = real_inner(*args, **kwargs)
        events.append(name)
        return fd, name

    monkeypatch.setattr(tempfile, "SpooledTemporaryFile", RecordingSpooled)
    monkeypatch.setattr(starlette.formparsers, "SpooledTemporaryFile", RecordingSpooled)
    monkeypatch.setattr(tempfile, "_mkstemp_inner", recording_inner)
    monkeypatch.setattr(tempfile, "tempdir", str(directory))
    yield events


def _test_app() -> FastAPI:
    test_app = FastAPI()

    @test_app.put("/orders/{order_id}/files")
    async def put_file(order_id: uuid.UUID, request: Request):
        # The shape the real route will have (M3): raw body stream, never multipart parsing.
        async with SessionLocal() as session:
            order = await session.get(Order, order_id)
            document = await ingest_stream(
                session,
                order=order,
                filename=request.headers["x-filename"],
                chunks=request.stream(),
                now=NOW,
            )
            await session.commit()
            return {"id": str(document.id)}

    @test_app.post("/multipart")
    async def multipart(file: UploadFile):
        await file.read()
        return {"ok": True}

    return test_app


async def test_stored_object_is_ciphertext_and_decrypts_back(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    data = pdf_bytes(3 * CHUNK_SIZE + 123)
    document = await upload(db, order, NOW, data, name="Bank statement.pdf")

    raw = get_s3().get_object(Bucket=get_settings().s3_bucket, Key=f"docs/{document.id}/original")
    stored = raw["Body"].read()
    assert MARKER not in stored and data[:64] not in stored
    assert await read_plaintext(document) == data
    assert document.size_bytes == len(data)
    assert document.content_type == "application/pdf"
    # The filename is encrypted with the document's key, not stored in the clear.
    assert b"Bank statement" not in document.name_sealed
    assert document_filename(document) == "Bank statement.pdf"


async def test_streaming_route_writes_no_temporary_files(
    db, simulated_agent, monkeypatch, tmp_path
):
    order = await new_order(db, simulated_agent, NOW)
    await db.commit()
    data = pdf_bytes(3 * 1024 * 1024)  # well above Starlette's 1 MB spooling threshold

    with watch_temp_files(monkeypatch, tmp_path) as events:
        async with AsyncClient(transport=ASGITransport(app=_test_app()), base_url="http://t") as c:
            response = await c.put(
                f"/orders/{order.id}/files",
                content=stream(data, 64 * 1024),
                headers={"x-filename": "Marksheet.pdf"},
            )
    assert response.status_code == 200, response.text
    assert events == []
    assert list(tmp_path.iterdir()) == []

    document = await db.get(Document, uuid.UUID(response.json()["id"]))
    assert await read_plaintext(document) == data


async def test_detector_catches_multipart_spooling(monkeypatch, tmp_path):
    """Control: the same watcher does see Starlette spool a multipart upload to disk."""
    with watch_temp_files(monkeypatch, tmp_path) as events:
        async with AsyncClient(transport=ASGITransport(app=_test_app()), base_url="http://t") as c:
            response = await c.post(
                "/multipart", files={"file": ("a.pdf", pdf_bytes(2 * 1024 * 1024))}
            )
    assert response.status_code == 200
    assert "spooled-to-disk" in events


async def test_memory_stays_bounded_for_large_files(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    size = 32 * 1024 * 1024

    async def generate():
        yield b"%PDF-1.7\n"
        sent = 9
        while sent < size:
            piece = os.urandom(min(64 * 1024, size - sent))
            sent += len(piece)
            yield piece

    tracemalloc.start()
    try:
        document = await ingest_stream(
            db, order=order, filename="big.pdf", chunks=generate(), now=NOW, max_bytes=size
        )
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    assert document.size_bytes == size
    # One 5 MiB ciphertext part (plus its copy for the request) and two 64 KiB plaintext
    # chunks — not the whole 32 MiB file.
    assert peak < 16 * 1024 * 1024, f"peak {peak / 1024 / 1024:.1f} MiB"


async def test_oversized_upload_is_aborted_and_leaves_nothing(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    with pytest.raises(UploadRejected) as err:
        await ingest_stream(
            db,
            order=order,
            filename="huge.pdf",
            chunks=stream(pdf_bytes(7 * 1024 * 1024)),
            now=NOW,
            max_bytes=6 * 1024 * 1024,
        )
    assert err.value.code == "too_large"
    assert bucket_keys("docs/") == []
    uploads = get_s3().list_multipart_uploads(Bucket=get_settings().s3_bucket)
    assert uploads.get("Uploads", []) == []
    assert await db.scalar(select(func.count()).select_from(Document)) == 0


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (b"MZ\x90\x00 not a document" * 100, "unsupported_type"),
        (b"<html><script>alert(1)</script>", "unsupported_type"),
        (b"", "empty"),
    ],
)
async def test_type_is_detected_from_content(db, simulated_agent, content, code):
    order = await new_order(db, simulated_agent, NOW)
    with pytest.raises(UploadRejected) as err:
        await ingest_stream(db, order=order, filename="cv.pdf", chunks=stream(content), now=NOW)
    assert err.value.code == code
    assert bucket_keys("docs/") == []


async def test_upload_is_recorded_without_the_filename(db, simulated_agent):
    order = await new_order(db, simulated_agent, NOW)
    await upload(db, order, NOW, name="Aadhaar card.pdf")
    events = (await db.scalars(select(AccessEvent))).all()
    assert [e.action for e in events] == ["uploaded"]
    assert "Aadhaar" not in (events[0].detail or "")


def test_no_route_uses_multipart_file_parsing():
    """Guard: multipart parsing spools uploads to disk in plaintext, so the API must not use it."""
    app_dir = Path(__file__).resolve().parent.parent / "app"
    pattern = re.compile(r"\bUploadFile\b|\bFile\(|\bForm\(|\.form\(")
    offenders = [
        str(path.relative_to(app_dir))
        for path in app_dir.rglob("*.py")
        if pattern.search(path.read_text(encoding="utf-8"))
    ]
    assert offenders == []
