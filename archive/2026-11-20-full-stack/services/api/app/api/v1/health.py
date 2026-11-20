"""System health — used by the dev status page and readiness checks. Never returns secrets."""

from __future__ import annotations

import asyncio
import socket
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from app.auth.deps import public
from app.core.config import get_settings
from app.core.db import engine
from app.core.storage import get_s3
from app.crypto.keystore import get_keystore

router = APIRouter(tags=["system"])

CheckStatus = Literal["ok", "down", "disabled", "missing"]


class Check(BaseModel):
    status: CheckStatus
    detail: str


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    environment: str
    checks: dict[str, Check]


async def _check_db() -> Check:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return Check(status="ok", detail="PostgreSQL reachable")
    except Exception as exc:  # noqa: BLE001 — health checks report, never raise
        return Check(status="down", detail=type(exc).__name__)


def _check_storage_sync() -> Check:
    try:
        get_s3().head_bucket(Bucket=get_settings().s3_bucket)
        return Check(status="ok", detail="Object storage bucket reachable")
    except Exception as exc:  # noqa: BLE001
        return Check(status="down", detail=type(exc).__name__)


def _check_keystore() -> Check:
    s = get_settings()
    if not s.master_key_configured:
        return Check(status="missing", detail="No root key, so no key store")
    try:
        get_keystore().list_ids()
        return Check(status="ok", detail="Local key store (development) — keep out of backups")
    except Exception as exc:  # noqa: BLE001
        return Check(status="down", detail=type(exc).__name__)


def _tcp_check(host: str, port: int, label: str) -> Check:
    try:
        with socket.create_connection((host, port), timeout=2):
            return Check(status="ok", detail=f"{label} reachable")
    except OSError as exc:
        return Check(status="down", detail=type(exc).__name__)


@router.get("/health", response_model=Health, dependencies=[Depends(public)])
async def health() -> Health:
    s = get_settings()
    db, storage, mail = await asyncio.gather(
        _check_db(),
        asyncio.to_thread(_check_storage_sync),
        asyncio.to_thread(_tcp_check, s.smtp_host, s.smtp_port, "SMTP (Mailpit)"),
    )
    if s.clamav_enabled:
        scan = await asyncio.to_thread(_tcp_check, s.clamav_host, s.clamav_port, "ClamAV")
    else:
        scan = Check(
            status="disabled",
            detail="Malware scanning not built yet — uploads marked 'not scanned'",
        )

    checks = {
        "database": db,
        "storage": storage,
        "mail": mail,
        "malware_scan": scan,
        "encryption_key": Check(status="ok", detail="Master key configured")
        if s.master_key_configured
        else Check(status="missing", detail="QUIRE_MASTER_KEY not set — uploads disabled"),
        "key_store": await asyncio.to_thread(_check_keystore),
        "payments": Check(
            status="ok",
            detail="Mock gateway — TEST, no money moves"
            if s.payment_provider == "mock"
            else "Razorpay TEST mode",
        ),
    }
    degraded = any(c.status in ("down", "missing") for c in checks.values())
    return Health(status="degraded" if degraded else "ok", environment=s.env, checks=checks)
