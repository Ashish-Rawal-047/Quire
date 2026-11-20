"""Key store for epoch keys: the keys that wrap per-document data keys.

Why a separate store: per-document data keys are stored *wrapped* in Postgres. Postgres backups
and point-in-time recovery keep old rows, so deleting a row cannot remove a key from backups.
Epoch keys therefore live outside the database and outside its backups. Destroying an epoch key
makes every backed-up copy of the data keys it wrapped permanently unusable.

`LocalKeyStore` is the development implementation: one small file per epoch key, each sealed
under the root key. Its directory must be excluded from all backups and snapshots. In production
the same interface maps onto a managed key service whose key deletion is provider-guaranteed
(for example HashiCorp Vault transit keys with deletion allowed, or an HSM). Limits of the local
version are documented in docs/03-retention-and-deletion.md.
"""

from __future__ import annotations

import os
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings
from app.crypto.aead import open_sealed, seal
from app.crypto.keys import derive_key

_KEY_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class KeyDestroyed(Exception):
    """The epoch key no longer exists, so nothing it wrapped can be decrypted again."""


class KeyStore(Protocol):
    def create(self, key_id: str) -> None: ...
    def wrap(self, key_id: str, data_key: bytes, aad: bytes) -> bytes: ...
    def unwrap(self, key_id: str, wrapped: bytes, aad: bytes) -> bytes: ...
    def destroy(self, key_id: str) -> None: ...
    def exists(self, key_id: str) -> bool: ...
    def list_ids(self, older_than_seconds: float = 0) -> list[str]: ...


_NOTICE = """This folder holds Quire's epoch encryption keys.

EXCLUDE IT FROM EVERY BACKUP, SNAPSHOT AND SYNC TOOL.
Deleted documents stay unreadable in database backups only because these keys are destroyed
on schedule and never copied anywhere else.
"""


class LocalKeyStore:
    def __init__(self, directory: Path, root_key: bytes) -> None:
        self._dir = directory
        self._dir.mkdir(parents=True, exist_ok=True)
        self._root = root_key
        notice = self._dir / "DO-NOT-BACK-UP.txt"
        if not notice.exists():
            notice.write_text(_NOTICE, encoding="utf-8")

    def _path(self, key_id: str) -> Path:
        if not _KEY_ID.match(key_id):
            raise ValueError("invalid key id")
        return self._dir / f"{key_id}.key"

    @staticmethod
    def _aad(key_id: str) -> bytes:
        return f"quire-epoch-key:{key_id}".encode()

    def create(self, key_id: str) -> None:
        path = self._path(key_id)
        if path.exists():
            raise FileExistsError(key_id)
        sealed = seal(self._root, os.urandom(32), self._aad(key_id))
        tmp = path.with_suffix(f".tmp-{os.urandom(4).hex()}")
        with open(tmp, "wb") as fh:
            fh.write(sealed)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)

    def _load(self, key_id: str) -> bytes:
        try:
            sealed = self._path(key_id).read_bytes()
        except FileNotFoundError as exc:
            raise KeyDestroyed(key_id) from exc
        return open_sealed(self._root, sealed, self._aad(key_id))

    def wrap(self, key_id: str, data_key: bytes, aad: bytes) -> bytes:
        return seal(self._load(key_id), data_key, aad)

    def unwrap(self, key_id: str, wrapped: bytes, aad: bytes) -> bytes:
        return open_sealed(self._load(key_id), wrapped, aad)

    def destroy(self, key_id: str) -> None:
        """Overwrite, flush and unlink. Idempotent: destroying a missing key is not an error."""
        path = self._path(key_id)
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            return
        with open(path, "r+b") as fh:
            fh.write(os.urandom(size))
            fh.flush()
            os.fsync(fh.fileno())
        path.unlink()

    def exists(self, key_id: str) -> bool:
        return self._path(key_id).exists()

    def list_ids(self, older_than_seconds: float = 0) -> list[str]:
        cutoff = time.time() - older_than_seconds
        return sorted(
            p.stem
            for p in self._dir.glob("*.key")
            if _KEY_ID.match(p.stem) and p.stat().st_mtime <= cutoff
        )


@lru_cache
def get_keystore() -> KeyStore:
    return LocalKeyStore(get_settings().keystore_dir, derive_key("keystore-wrap"))
