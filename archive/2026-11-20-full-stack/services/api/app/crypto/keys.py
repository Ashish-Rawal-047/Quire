"""Root key access and purpose-bound key derivation."""

from __future__ import annotations

import base64

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import get_settings


class EncryptionUnavailable(RuntimeError):
    """Raised when no root key is configured. Uploads are refused rather than stored unencrypted."""


def root_key() -> bytes:
    value = get_settings().master_key
    if not value:
        raise EncryptionUnavailable("QUIRE_MASTER_KEY is not set")
    return base64.b64decode(value)


def derive_key(purpose: str) -> bytes:
    """A 32-byte key for one purpose only, so no single derived key is reused across features."""
    return HKDF(
        algorithm=hashes.SHA256(), length=32, salt=None, info=f"quire/{purpose}/v1".encode()
    ).derive(root_key())
