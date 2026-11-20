"""Small security helpers: keyed hashes, client identification, cookie names, CSRF tokens."""

from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress

from starlette.requests import HTTPConnection

from app.core.config import get_settings
from app.crypto.keys import derive_key


def _mac(purpose: str, data: bytes) -> bytes:
    return hmac.new(derive_key(purpose), data, hashlib.sha256).digest()


def token_hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def session_cookie_name() -> str:
    # The __Host- prefix makes browsers refuse the cookie unless it is Secure, has Path=/ and no
    # Domain, so a sibling subdomain can't plant or overwrite it.
    return "__Host-quire_session" if get_settings().cookie_secure else "quire_session"


def csrf_cookie_name() -> str:
    return "__Host-quire_csrf" if get_settings().cookie_secure else "quire_csrf"


CSRF_HEADER = "x-csrf-token"


def csrf_token_for(session_token: str) -> str:
    """Signed double-submit token, bound to the session: a token from another session (or one
    planted by an attacker) never matches."""
    digest = _mac("csrf", token_hash(session_token))
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def csrf_matches(session_token: str, presented: str | None) -> bool:
    if not presented:
        return False
    return hmac.compare_digest(csrf_token_for(session_token), presented)


def client_ip(conn: HTTPConnection) -> str:
    """The caller's IP. X-Forwarded-For is trusted only from a configured proxy, and then only
    its right-most entry: the address that proxy saw (anything to its left is client-supplied)."""
    peer = conn.client.host if conn.client else ""
    if peer in get_settings().trusted_proxies:
        forwarded = conn.headers.get("x-forwarded-for", "")
        candidate = forwarded.split(",")[-1].strip() if forwarded else ""
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            pass
    return peer


def client_hash(conn: HTTPConnection) -> str:
    """A keyed hash of the IP address, for rate limiting. Raw IPs are never stored."""
    return _mac("client-id", client_ip(conn).encode()).hex()


def otp_mac(challenge_id: bytes, code: str) -> bytes:
    return _mac("otp", challenge_id + code.encode())
