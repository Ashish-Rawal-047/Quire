"""Quire API entry point.

Run locally:  uvicorn app.main:app --reload --port 8000   (from services/api, venv active)
The web app proxies /api/* to this server, so the browser sees a single origin.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import install_error_handlers
from app.api.v1.router import api_router
from app.auth.middleware import RequestGuard
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.storage import ensure_bucket

log = logging.getLogger("quire")


async def _retention_loop(interval: int) -> None:
    """Purge due documents and destroy due epoch keys: on startup, then every `interval` seconds."""
    from app.services.retention import run_retention_sweep

    while True:
        try:
            async with SessionLocal() as session:
                report = await run_retention_sweep(session, now=utcnow())
            if report.purged or report.epochs_destroyed:
                # Counts only: never filenames, customer details or content.
                log.info(
                    "retention sweep: %d documents purged, %d epoch keys destroyed",
                    len(report.purged),
                    len(report.epochs_destroyed),
                )
        except Exception as exc:  # noqa: BLE001 — keep sweeping; the next pass retries
            log.warning("retention sweep failed: %s", type(exc).__name__)
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if not settings.is_production:
        try:
            ensure_bucket()
        except Exception as exc:  # noqa: BLE001 — surfaced via /health instead of crashing dev
            log.warning("Object storage not ready: %s", type(exc).__name__)
    sweeper = None
    if settings.retention_sweep_seconds and settings.master_key_configured:
        sweeper = asyncio.create_task(_retention_loop(settings.retention_sweep_seconds))
    yield
    if sweeper:
        sweeper.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await sweeper


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Quire API",
        version="0.1.0",
        lifespan=lifespan,
        # Interactive docs only outside production.
        docs_url=None if settings.is_production else "/api/docs",
        openapi_url=None if settings.is_production else "/api/openapi.json",
        redoc_url=None,
    )
    install_error_handlers(app)
    app.add_middleware(RequestGuard)
    app.include_router(api_router)
    return app


app = create_app()
