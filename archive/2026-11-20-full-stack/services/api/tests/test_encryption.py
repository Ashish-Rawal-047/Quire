"""Encryption primitives and the key store."""

import os
import uuid

import pytest

from app.crypto.aead import (
    CHUNK_SIZE,
    HEADER_SIZE,
    TAG_SIZE,
    DecryptionError,
    decrypt_bytes,
    encrypt_bytes,
)
from app.crypto.keystore import KeyDestroyed, LocalKeyStore

KEY = os.urandom(32)
AAD = b"quire-object:docs/x/original"


@pytest.mark.parametrize(
    "size", [1, 100, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 3 * CHUNK_SIZE + 17]
)
def test_stream_round_trip(size):
    data = os.urandom(size)
    sealed = encrypt_bytes(KEY, data, AAD)
    if size >= 16:  # a 1-byte input can appear in random ciphertext by chance
        assert data not in sealed
    assert decrypt_bytes(KEY, sealed, AAD) == data


def _chunks(sealed: bytes) -> tuple[bytes, list[bytes]]:
    block = CHUNK_SIZE + TAG_SIZE
    body = sealed[HEADER_SIZE:]
    return sealed[:HEADER_SIZE], [body[i : i + block] for i in range(0, len(body), block)]


def test_tampering_is_detected():
    sealed = bytearray(encrypt_bytes(KEY, os.urandom(2 * CHUNK_SIZE), AAD))
    sealed[HEADER_SIZE + 10] ^= 1
    with pytest.raises(DecryptionError):
        decrypt_bytes(KEY, bytes(sealed), AAD)


def test_truncation_at_a_chunk_boundary_is_detected():
    header, chunks = _chunks(encrypt_bytes(KEY, os.urandom(3 * CHUNK_SIZE), AAD))
    with pytest.raises(DecryptionError):
        decrypt_bytes(KEY, header + b"".join(chunks[:2]), AAD)


def test_reordered_chunks_are_detected():
    header, chunks = _chunks(encrypt_bytes(KEY, os.urandom(3 * CHUNK_SIZE), AAD))
    with pytest.raises(DecryptionError):
        decrypt_bytes(KEY, header + chunks[1] + chunks[0] + chunks[2], AAD)


def test_ciphertext_is_bound_to_its_object_key():
    sealed = encrypt_bytes(KEY, b"%PDF-1.7 hello", AAD)
    with pytest.raises(DecryptionError):
        decrypt_bytes(KEY, sealed, b"quire-object:docs/other/original")


def test_wrong_key_fails():
    sealed = encrypt_bytes(KEY, b"%PDF-1.7 hello", AAD)
    with pytest.raises(DecryptionError):
        decrypt_bytes(os.urandom(32), sealed, AAD)


def test_keystore_wrap_unwrap_and_destroy(tmp_path):
    store = LocalKeyStore(tmp_path, os.urandom(32))
    key_id = str(uuid.uuid4())
    store.create(key_id)
    data_key = os.urandom(32)
    wrapped = store.wrap(key_id, data_key, b"aad")
    assert data_key not in wrapped
    assert store.unwrap(key_id, wrapped, b"aad") == data_key

    store.destroy(key_id)
    assert not store.exists(key_id)
    assert list(tmp_path.glob("*.key")) == []
    with pytest.raises(KeyDestroyed):
        store.unwrap(key_id, wrapped, b"aad")
    store.destroy(key_id)  # idempotent


def test_keystore_files_are_sealed_under_the_root_key(tmp_path):
    key_id = str(uuid.uuid4())
    LocalKeyStore(tmp_path, os.urandom(32)).create(key_id)
    # The same files opened with a different root key are useless.
    with pytest.raises(DecryptionError):
        LocalKeyStore(tmp_path, os.urandom(32)).wrap(key_id, os.urandom(32), b"aad")


def test_keystore_rejects_path_like_ids(tmp_path):
    store = LocalKeyStore(tmp_path, os.urandom(32))
    with pytest.raises(ValueError):
        store.create("../../etc/passwd")


def test_keystore_marks_itself_as_not_for_backup(tmp_path):
    LocalKeyStore(tmp_path, os.urandom(32))
    assert "EXCLUDE IT FROM EVERY BACKUP" in (tmp_path / "DO-NOT-BACK-UP.txt").read_text()
