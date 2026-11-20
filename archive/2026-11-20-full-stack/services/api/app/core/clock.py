"""One place for "now", so services take an explicit time and tests can control it."""

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC)
