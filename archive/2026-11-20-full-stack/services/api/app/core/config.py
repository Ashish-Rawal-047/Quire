"""Application settings, loaded from environment variables (prefix QUIRE_) or services/api/.env."""

from __future__ import annotations

import base64
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="QUIRE_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    env: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+asyncpg://quire:quire_dev_password@localhost:5433/quire"

    s3_endpoint: str | None = "http://localhost:9000"
    s3_access_key: str = "quire"
    s3_secret_key: str = Field(default="quire_dev_password", repr=False)
    s3_bucket: str = "quire-documents"
    s3_region: str = "ap-south-1"

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    mail_from: str = "Quire <no-reply@quire.local>"
    # "memory" keeps sent mail in-process (tests only). Never logged either way.
    mail_backend: Literal["smtp", "memory"] = "smtp"

    master_key: str = Field(default="", repr=False)

    # Key store for epoch keys (see app/crypto/keystore.py). Must be excluded from backups.
    keystore_dir: Path = Path("var/keystore")
    # New documents share one epoch key per window of this many hours.
    key_epoch_hours: int = Field(default=6, ge=1, le=24)
    # Per-document scratch folders (none are used in Phase 1; purge and sweeps still clear them).
    workspace_dir: Path = Path("var/workspaces")
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, ge=1024)
    # How often the retention sweeper runs, in seconds. 0 disables it (tests drive it directly).
    retention_sweep_seconds: int = Field(default=60, ge=0)

    clamav_enabled: bool = False
    clamav_host: str = "localhost"
    clamav_port: int = 3310

    payment_provider: Literal["mock", "razorpay"] = "mock"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = Field(default="", repr=False)
    razorpay_webhook_secret: str = Field(default="", repr=False)

    web_origin: str = "http://localhost:3000"

    # Sessions. Cookies are HttpOnly, SameSite=Lax and Secure. Browsers accept Secure cookies
    # from http://localhost, so local development keeps them on as well.
    cookie_secure: bool = True
    session_idle_days: int = Field(default=7, ge=1, le=30)
    session_absolute_days: int = Field(default=30, ge=1, le=90)
    # Peers whose X-Forwarded-For is trusted. Empty by default: the Next.js dev proxy passes a
    # client-supplied X-Forwarded-For through unchanged, so trusting it would let anyone pick
    # their own rate-limit identity. Production: set this to a reverse proxy that OVERWRITES the
    # header, and run uvicorn with --no-proxy-headers (or --forwarded-allow-ips set to it).
    trusted_proxies: list[str] = []

    @field_validator("master_key")
    @classmethod
    def _validate_master_key(cls, value: str) -> str:
        if not value:
            return value
        try:
            raw = base64.b64decode(value, validate=True)
        except ValueError as exc:  # binascii.Error is a ValueError
            raise ValueError("QUIRE_MASTER_KEY must be base64") from exc
        if len(raw) != 32:
            raise ValueError("QUIRE_MASTER_KEY must decode to exactly 32 bytes")
        return value

    @property
    def master_key_configured(self) -> bool:
        return bool(self.master_key)

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
