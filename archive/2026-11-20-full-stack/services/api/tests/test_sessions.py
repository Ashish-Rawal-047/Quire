"""Session cookies, CSRF protection and session invalidation."""

from datetime import timedelta

from sqlalchemy import select, update

from app.auth.security import token_hash
from app.core import clock
from app.models.auth import User, UserSession
from tests.conftest import make_client, sign_in

ME = "/api/v1/me"


def set_cookie_headers(response) -> dict[str, str]:
    return {h.split("=", 1)[0]: h for h in response.headers.get_list("set-cookie")}


async def test_cookie_flags(client):
    from app.core.mail import OUTBOX

    r = await client.post("/api/v1/auth/otp/request", json={"email": "flags@example.com"})
    code = OUTBOX[-1].body.split()[5]
    r = await client.post(
        "/api/v1/auth/otp/verify", json={"challenge_id": r.json()["challenge_id"], "code": code}
    )
    cookies = set_cookie_headers(r)
    session = cookies["__Host-quire_session"].lower()
    for flag in ("httponly", "secure", "samesite=lax", "path=/"):
        assert flag in session
    assert "domain=" not in session
    csrf = cookies["__Host-quire_csrf"].lower()
    assert "secure" in csrf and "samesite=lax" in csrf and "httponly" not in csrf


async def test_session_token_is_stored_hashed(client, db):
    await sign_in(client, "hashed@example.com")
    token = client.cookies.get("__Host-quire_session")
    row = (await db.scalars(select(UserSession))).one()
    assert row.token_hash == token_hash(token)
    assert token.encode() not in row.token_hash


async def test_api_responses_are_not_cached(client):
    await sign_in(client, "cache@example.com")
    r = await client.get(ME)
    assert r.headers["cache-control"] == "no-store"


async def test_unauthenticated_requests_get_401(client):
    r = await client.get(ME)
    assert r.status_code == 401 and r.json()["code"] == "unauthenticated"
    async with make_client() as forged:
        forged.cookies.set("__Host-quire_session", "forged-token")
        assert (await forged.get(ME)).status_code == 401


async def test_mutations_need_the_web_apps_origin():
    async with make_client(origin=None) as c:
        r = await c.post("/api/v1/auth/otp/request", json={"email": "o@example.com"})
        assert r.status_code == 403 and r.json()["code"] == "bad_origin"
    async with make_client(origin="https://evil.example") as c:
        r = await c.post("/api/v1/auth/otp/request", json={"email": "o@example.com"})
        assert r.status_code == 403


async def test_signed_in_mutations_need_the_csrf_token(client):
    await sign_in(client, "csrf@example.com")
    # Without the header (hook disabled by passing an empty token):
    r = await client.patch(ME, json={"display_name": "A"}, headers={"x-csrf-token": ""})
    assert r.status_code == 403 and r.json()["code"] == "csrf_failed"
    r = await client.patch(ME, json={"display_name": "A"}, headers={"x-csrf-token": "guess"})
    assert r.status_code == 403
    r = await client.patch(ME, json={"display_name": "Asha"})
    assert r.status_code == 200 and r.json()["user"]["display_name"] == "Asha"


async def test_csrf_token_from_another_session_is_refused(client):
    await sign_in(client, "victim@example.com")
    async with make_client() as attacker:
        await sign_in(attacker, "attacker@example.com")
        attacker_token = attacker.cookies.get("__Host-quire_csrf")
    r = await client.patch(ME, json={"display_name": "x"}, headers={"x-csrf-token": attacker_token})
    assert r.status_code == 403


async def test_reads_do_not_need_csrf(client):
    await sign_in(client, "read@example.com")
    r = await client.get(ME, headers={"x-csrf-token": ""})
    assert r.status_code == 200


async def test_logout_revokes_the_session(client):
    await sign_in(client, "out@example.com")
    stolen = client.cookies.get("__Host-quire_session")
    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 204
    cleared = set_cookie_headers(r)
    assert "max-age=0" in cleared["__Host-quire_session"].lower()
    async with make_client() as replay:
        replay.cookies.set("__Host-quire_session", stolen)
        assert (await replay.get(ME)).status_code == 401


async def _skip_cooldown(db) -> None:
    from app.models.auth import OtpChallenge

    await db.execute(
        update(OtpChallenge).values(created_at=OtpChallenge.created_at - timedelta(seconds=61))
    )
    await db.commit()


async def test_logout_everywhere_revokes_every_session(client, db):
    await sign_in(client, "all@example.com")
    await _skip_cooldown(db)
    async with make_client() as laptop:
        await sign_in(laptop, "all@example.com")
        assert (await laptop.get(ME)).status_code == 200
        assert (await client.post("/api/v1/auth/logout-all")).status_code == 204
        assert (await laptop.get(ME)).status_code == 401


async def test_signing_in_replaces_any_existing_session(client, db):
    """Session fixation: a cookie that existed before sign-in is never kept."""
    await sign_in(client, "first@example.com")
    before = client.cookies.get("__Host-quire_session")
    await sign_in(client, "second@example.com")
    after = client.cookies.get("__Host-quire_session")
    assert before != after
    old = (
        await db.scalars(select(UserSession).where(UserSession.token_hash == token_hash(before)))
    ).one()
    assert old.revoked_reason == "replaced"


async def test_idle_timeout(client, db):
    await sign_in(client, "idle@example.com")
    await db.execute(update(UserSession).values(idle_expires_at=clock.utcnow()))
    await db.commit()
    assert (await client.get(ME)).status_code == 401


async def test_absolute_timeout_even_when_active(client, db):
    await sign_in(client, "abs@example.com")
    await db.execute(update(UserSession).values(absolute_expires_at=clock.utcnow()))
    await db.commit()
    assert (await client.get(ME)).status_code == 401


async def test_activity_slides_the_idle_timeout_but_never_past_the_absolute_limit(client, db):
    await sign_in(client, "slide@example.com")
    now = clock.utcnow()
    await db.execute(
        update(UserSession).values(
            last_seen_at=now - timedelta(hours=1),
            idle_expires_at=now + timedelta(hours=1),
            absolute_expires_at=now + timedelta(days=2),
        )
    )
    await db.commit()
    assert (await client.get(ME)).status_code == 200
    row = (await db.scalars(select(UserSession).execution_options(populate_existing=True))).one()
    assert row.idle_expires_at == row.absolute_expires_at


async def test_disabling_an_account_ends_its_sessions_immediately(client, db):
    await sign_in(client, "ban@example.com")
    await db.execute(update(User).values(disabled_at=clock.utcnow()))
    await db.commit()
    assert (await client.get(ME)).status_code == 401


async def test_profile_update_rejects_unknown_fields(client):
    await sign_in(client, "strict@example.com")
    r = await client.patch(ME, json={"display_name": "A", "email": "other@example.com"})
    assert r.status_code == 422
    r = await client.patch(ME, json={"role": "owner"})
    assert r.status_code == 422
