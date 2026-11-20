"""End-to-end: a sign-in code really reaches the local test inbox (Mailpit) over SMTP."""

import json
import urllib.request
import uuid

import pytest

from app.core.config import get_settings
from app.core.mail import send_mail

MAILPIT = "http://localhost:8025/api/v1"


def _mailpit(path: str) -> dict:
    with urllib.request.urlopen(f"{MAILPIT}{path}", timeout=3) as r:
        return json.loads(r.read())


async def test_code_email_is_delivered_over_smtp(monkeypatch):
    try:
        _mailpit("/messages?limit=1")
    except OSError:
        pytest.skip("Mailpit is not running")
    monkeypatch.setattr(get_settings(), "mail_backend", "smtp")
    to = f"inbox-{uuid.uuid4().hex[:8]}@example.com"
    await send_mail(to, "Your Quire sign-in code", "Your Quire sign-in code is 123456")
    found = _mailpit(f"/search?query=to:{to}")
    assert found["messages_count"] == 1
    assert found["messages"][0]["Subject"] == "Your Quire sign-in code"
