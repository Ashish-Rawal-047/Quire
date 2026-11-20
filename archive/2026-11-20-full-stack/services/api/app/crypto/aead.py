"""Authenticated encryption: small sealed blobs, and chunked streaming encryption for files.

Streaming format (the STREAM construction, Hoang et al. 2015) — AES-256-GCM per chunk:

    header  = b"QENC" | version (1 byte) | chunk_size (u32 BE) | nonce_prefix (7 bytes)   (16 bytes)
    chunk_i = AES-GCM(key, nonce = prefix | i (u32 BE) | final flag (1 byte), aad)          (n + 16)

Every chunk is authenticated with its position and whether it is the last one, so reordering,
dropping or truncating chunks is detected. The `aad` binds the ciphertext to its object key, so a
ciphertext copied to another document's location fails to decrypt.

Only one chunk of plaintext (plus one chunk of look-ahead) is held at a time, so memory is bounded
regardless of the file size.
"""

from __future__ import annotations

import os
import struct
from collections.abc import Callable, Iterator

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

CHUNK_SIZE = 64 * 1024
TAG_SIZE = 16
_MAGIC = b"QENC"
_VERSION = 1
_HEADER = struct.Struct(">4sBI7s")
HEADER_SIZE = _HEADER.size  # 16
_MAX_CHUNKS = 2**32 - 1


class DecryptionError(Exception):
    """The ciphertext is damaged, truncated, reordered, or was encrypted for a different place."""


def seal(key: bytes, plaintext: bytes, aad: bytes) -> bytes:
    nonce = os.urandom(12)
    return nonce + AESGCM(key).encrypt(nonce, plaintext, aad)


def open_sealed(key: bytes, sealed: bytes, aad: bytes) -> bytes:
    try:
        return AESGCM(key).decrypt(sealed[:12], sealed[12:], aad)
    except (InvalidTag, ValueError) as exc:
        raise DecryptionError("sealed value failed authentication") from exc


def _nonce(prefix: bytes, counter: int, final: bool) -> bytes:
    return prefix + counter.to_bytes(4, "big") + (b"\x01" if final else b"\x00")


class StreamEncryptor:
    def __init__(self, key: bytes, aad: bytes, chunk_size: int = CHUNK_SIZE) -> None:
        self._aead = AESGCM(key)
        self._aad = aad
        self._prefix = os.urandom(7)
        self._counter = 0
        self._finished = False
        self.chunk_size = chunk_size

    def header(self) -> bytes:
        return _HEADER.pack(_MAGIC, _VERSION, self.chunk_size, self._prefix)

    def seal_chunk(self, plaintext: bytes, *, final: bool) -> bytes:
        if self._finished:
            raise RuntimeError("stream already finalised")
        if len(plaintext) > self.chunk_size or (not final and len(plaintext) != self.chunk_size):
            raise ValueError("only the final chunk may be shorter than chunk_size")
        if self._counter >= _MAX_CHUNKS:
            raise ValueError("stream too long")
        out = self._aead.encrypt(_nonce(self._prefix, self._counter, final), plaintext, self._aad)
        self._counter += 1
        self._finished = final
        return out


def encrypt_bytes(key: bytes, data: bytes, aad: bytes, chunk_size: int = CHUNK_SIZE) -> bytes:
    """Whole-buffer convenience for small artifacts (previews, thumbnails)."""
    enc = StreamEncryptor(key, aad, chunk_size)
    out = bytearray(enc.header())
    chunks = [data[i : i + chunk_size] for i in range(0, len(data), chunk_size)] or [b""]
    for i, chunk in enumerate(chunks):
        out += enc.seal_chunk(chunk, final=i == len(chunks) - 1)
    return bytes(out)


def _read_exact(read: Callable[[int], bytes], n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        piece = read(n - len(buf))
        if not piece:
            break
        buf += piece
    return bytes(buf)


def decrypt_stream(key: bytes, aad: bytes, read: Callable[[int], bytes]) -> Iterator[bytes]:
    """Yield plaintext chunks from a reader. Raises DecryptionError on any tampering."""
    header = _read_exact(read, HEADER_SIZE)
    if len(header) != HEADER_SIZE:
        raise DecryptionError("missing header")
    magic, version, chunk_size, prefix = _HEADER.unpack(header)
    if magic != _MAGIC or version != _VERSION or not 0 < chunk_size <= 16 * 1024 * 1024:
        raise DecryptionError("unrecognised header")

    aead = AESGCM(key)
    block = chunk_size + TAG_SIZE
    current = _read_exact(read, block)
    if len(current) < TAG_SIZE:
        raise DecryptionError("truncated")
    counter = 0
    while True:
        following = _read_exact(read, block) if len(current) == block else b""
        final = not following
        try:
            yield aead.decrypt(_nonce(prefix, counter, final), current, aad)
        except InvalidTag as exc:
            raise DecryptionError("chunk failed authentication") from exc
        if final:
            return
        if len(following) < TAG_SIZE:
            raise DecryptionError("truncated")
        current = following
        counter += 1


def decrypt_bytes(key: bytes, data: bytes, aad: bytes) -> bytes:
    pos = 0

    def read(n: int) -> bytes:
        nonlocal pos
        piece = data[pos : pos + n]
        pos += len(piece)
        return piece

    return b"".join(decrypt_stream(key, aad, read))
