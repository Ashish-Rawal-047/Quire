"""One-time sign-in codes: expiry, single use, attempt limits, rate limits, enumeration."""

import logging
import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select, text, update

from app.core import clock
from app.core.mail import OUTBOX
from app.models.auth import OtpChallenge, User
from tests.conftest import make_client

REQUEST = "/api/v1/auth/otp/request"
VERIFY = "/api/v1/auth/otp/verify"


def last_code(email: str) -> str:
    return next(m for m in reversed(OUTBOX) if m.to == email).body.split()[5]


async def request(c, email):
    return await c.post(REQUEST, json={"email": email})


async def verify(c, challenge_id, code):
    return await c.post(VERIFY, json={"challenge_id": challenge_id, "code": code})


def wrong(code: str) -> str:
    return f"{(int(code) + 1) % 1_000_000:06d}"


async def test_sign_in_creates_the_account_and_a_session(client):
    r = await request(client, "Asha@Example.com ")
    assert r.status_code == 202
    body = r.json()
    assert body["expires_in"] == 600 and body["resend_after"] == 60
    assert OUTBOX[-1].to == "asha@example.com"
    assert (
        "sign-in code" in OUTBOX[-1].subject
        and last_code("asha@example.com") not in OUTBOX[-1].subject
    )

    r = await verify(client, body["challenge_id"], last_code("asha@example.com"))
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "asha@example.com"
    assert (await client.get("/api/v1/me")).status_code == 200


async def test_responses_are_identical_for_known_and_unknown_addresses(client, db):
    db.add(User(email="known@example.com", created_at=clock.utcnow()))
    await db.commit()
    known = await request(client, "known@example.com")
    unknown = await request(client, "nobody-here@example.com")
    assert known.status_code == unknown.status_code == 202
    assert set(known.json()) == set(unknown.json())
    assert {k: v for k, v in known.json().items() if k != "challenge_id"} == {
        k: v for k, v in unknown.json().items() if k != "challenge_id"
    }
    assert known.headers.keys() == unknown.headers.keys()
    # Both receive the same email; nothing says whether an account exists.
    bodies = [m.body.replace(m.body.split()[5], "######") for m in OUTBOX]
    assert bodies[0] == bodies[1]


async def test_invalid_email_is_rejected_without_echoing_it(client):
    r = await request(client, "not-an-email<script>")
    assert r.status_code == 422
    assert "script" not in r.text


async def test_code_works_once(client):
    challenge = (await request(client, "once@example.com")).json()["challenge_id"]
    code = last_code("once@example.com")
    assert (await verify(client, challenge, code)).status_code == 200
    async with make_client() as other:
        r = await verify(other, challenge, code)
    assert r.status_code == 410 and r.json()["code"] == "code_expired"


async def test_code_expires_after_10_minutes(client, db):
    challenge = (await request(client, "late@example.com")).json()["challenge_id"]
    await db.execute(update(OtpChallenge).values(expires_at=clock.utcnow() - timedelta(seconds=1)))
    await db.commit()
    r = await verify(client, challenge, last_code("late@example.com"))
    assert r.status_code == 410


async def test_new_code_supersedes_the_previous_one(client, db):
    first = (await request(client, "two@example.com")).json()["challenge_id"]
    first_code = last_code("two@example.com")
    # Skip the cooldown by ageing the first challenge.
    await db.execute(update(OtpChallenge).values(created_at=clock.utcnow() - timedelta(seconds=61)))
    await db.commit()
    second = (await request(client, "two@example.com")).json()["challenge_id"]
    assert (await verify(client, first, first_code)).status_code == 410
    assert (await verify(client, second, last_code("two@example.com"))).status_code == 200


async def test_five_wrong_guesses_kill_the_code(client):
    challenge = (await request(client, "guess@example.com")).json()["challenge_id"]
    code = last_code("guess@example.com")
    left = []
    for _ in range(5):
        r = await verify(client, challenge, wrong(code))
        assert r.status_code == 400
        left.append(r.json()["attempts_left"])
    assert left == [4, 3, 2, 1, 0]
    r = await verify(client, challenge, code)  # the right code no longer works
    assert r.status_code == 410


@pytest.mark.parametrize("bad", ["12345", "1234567", "abcdef", "12 456", ""])
async def test_malformed_codes_count_as_wrong(client, bad):
    challenge = (await request(client, "fmt@example.com")).json()["challenge_id"]
    r = await verify(client, challenge, bad)
    assert r.status_code in (400, 422)


async def test_unknown_challenge_looks_like_an_expired_one(client):
    r = await verify(client, str(uuid.uuid4()), "123456")
    assert r.status_code == 410 and r.json()["code"] == "code_expired"


async def test_resend_cooldown(client):
    assert (await request(client, "wait@example.com")).status_code == 202
    r = await request(client, "wait@example.com")
    assert r.status_code == 429
    assert 1 <= r.json()["retry_after"] <= 60
    assert r.headers["retry-after"] == str(r.json()["retry_after"])
    assert len(OUTBOX) == 1


async def test_five_codes_per_address_per_hour(client, db):
    for i in range(5):
        assert (await request(client, "many@example.com")).status_code == 202, i
        await db.execute(
            update(OtpChallenge).values(created_at=OtpChallenge.created_at - timedelta(seconds=70))
        )
        await db.commit()
    r = await request(client, "many@example.com")
    assert r.status_code == 429 and r.json()["code"] == "rate_limited"


async def test_twenty_codes_per_client_per_hour(client):
    for i in range(20):
        assert (await request(client, f"user{i}@example.com")).status_code == 202
    r = await request(client, "user20@example.com")
    assert r.status_code == 429
    # A different client (IP) is unaffected.
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app, client=("198.51.100.7", 1)),
        base_url="https://testserver",
        headers={"origin": "http://localhost:3000"},
    ) as other:
        assert (await request(other, "user20@example.com")).status_code == 202


async def test_forwarded_for_is_trusted_only_from_the_proxy(db):
    """A client can't dodge the per-client limit by inventing X-Forwarded-For."""
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app, client=("203.0.113.99", 1)),
        base_url="https://testserver",
        headers={"origin": "http://localhost:3000"},
    ) as c:
        for i in range(20):
            await c.post(
                REQUEST,
                json={"email": f"x{i}@example.com"},
                headers={"x-forwarded-for": f"10.0.0.{i}"},
            )
        r = await c.post(
            REQUEST, json={"email": "x20@example.com"}, headers={"x-forwarded-for": "10.9.9.9"}
        )
    assert r.status_code == 429
    hashes = set((await db.scalars(select(OtpChallenge.client_hash))).all())
    assert len(hashes) == 1


async def test_ten_failures_lock_verification_for_the_address(client, db):
    email = "brute@example.com"
    for _round in range(2):
        challenge = (await request(client, email)).json()["challenge_id"]
        code = last_code(email)
        for _ in range(5):
            await verify(client, challenge, wrong(code))
        await db.execute(
            update(OtpChallenge).values(created_at=OtpChallenge.created_at - timedelta(seconds=70))
        )
        await db.commit()
    challenge = (await request(client, email)).json()["challenge_id"]
    r = await verify(client, challenge, last_code(email))  # even the right code
    assert r.status_code == 429 and r.json()["code"] == "verify_locked"
    assert 1700 <= r.json()["retry_after"] <= 1800


async def test_codes_and_addresses_never_reach_the_logs(client, caplog):
    caplog.set_level(logging.DEBUG)
    challenge = (await request(client, "private@example.com")).json()["challenge_id"]
    code = last_code("private@example.com")
    await verify(client, challenge, wrong(code))
    await verify(client, challenge, code)
    logged = "\n".join(r.getMessage() for r in caplog.records)
    assert code not in logged and "private@example.com" not in logged


async def test_only_hashes_are_stored(client, db):
    await request(client, "hash@example.com")
    code = last_code("hash@example.com")
    row = (await db.execute(text("SELECT * FROM otp_challenges"))).mappings().one()
    assert all(code not in str(v) for v in row.values())
    assert "203.0.113.10" not in str(row["client_hash"])


async def test_disabled_account_cannot_sign_in(client, db):
    db.add(User(email="gone@example.com", created_at=clock.utcnow(), disabled_at=clock.utcnow()))
    await db.commit()
    challenge = (await request(client, "gone@example.com")).json()["challenge_id"]
    r = await verify(client, challenge, last_code("gone@example.com"))
    assert r.status_code == 403
    assert "set-cookie" not in r.headers


async def test_a_configured_proxy_contributes_only_the_address_it_saw(db, monkeypatch):
    """With a trusted reverse proxy, only the right-most X-Forwarded-For entry (added by that
    proxy) is used; anything the client put to its left is ignored."""
    from httpx import ASGITransport, AsyncClient

    from app.core.config import get_settings
    from app.main import app

    monkeypatch.setattr(get_settings(), "trusted_proxies", ["192.0.2.1"])
    async with AsyncClient(
        transport=ASGITransport(app=app, client=("192.0.2.1", 1)),
        base_url="https://testserver",
        headers={"origin": "http://localhost:3000"},
    ) as proxy:
        for i in range(20):
            await proxy.post(
                REQUEST,
                json={"email": f"p{i}@example.com"},
                headers={"x-forwarded-for": f"10.0.0.{i}, 198.51.100.20"},
            )
        blocked = await proxy.post(
            REQUEST, json={"email": "p20@example.com"}, headers={"x-forwarded-for": "198.51.100.20"}
        )
        other = await proxy.post(
            REQUEST, json={"email": "p21@example.com"}, headers={"x-forwarded-for": "198.51.100.21"}
        )
    assert blocked.status_code == 429
    assert other.status_code == 202
