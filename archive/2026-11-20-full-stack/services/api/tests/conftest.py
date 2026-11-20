"""Test setup: a separate database (`quire_test`, migrated with Alembic), a separate bucket and a
throwaway key store and root key. Needs the docker compose services running."""

import asyncio
import base64
import os
import shutil
import sys
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_SCRATCH = Path(tempfile.mkdtemp(prefix="quire-tests-"))
_BASE_URL = os.environ.get(
    "QUIRE_TEST_DATABASE_URL",
    "postgresql+asyncpg://quire:quire_dev_password@localhost:5433/quire_test",
)
os.environ.update(
    {
        "QUIRE_ENV": "test",
        "QUIRE_DATABASE_URL": _BASE_URL,
        "QUIRE_S3_BUCKET": "quire-test-documents",
        "QUIRE_MASTER_KEY": base64.b64encode(os.urandom(32)).decode(),
        "QUIRE_KEYSTORE_DIR": str(_SCRATCH / "keystore"),
        "QUIRE_WORKSPACE_DIR": str(_SCRATCH / "workspaces"),
        "QUIRE_RETENTION_SWEEP_SECONDS": "0",
        "QUIRE_MAIL_BACKEND": "memory",
        "QUIRE_WEB_ORIGIN": "http://localhost:3000",
        "QUIRE_COOKIE_SECURE": "true",
    }
)

from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.db import SessionLocal  # noqa: E402
from app.core.storage import ensure_bucket, get_s3  # noqa: E402
from app.crypto.keystore import get_keystore  # noqa: E402
from app.main import app  # noqa: E402
from app.models import PrintAgent  # noqa: E402

WEB_ORIGIN = "http://localhost:3000"
NOW = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)


async def _prepare_database() -> None:
    import asyncpg

    dsn = _BASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    admin = await asyncpg.connect(dsn.rsplit("/", 1)[0] + "/postgres")
    try:
        if not await admin.fetchval("SELECT 1 FROM pg_database WHERE datname = 'quire_test'"):
            await admin.execute("CREATE DATABASE quire_test")
    finally:
        await admin.close()
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    finally:
        await conn.close()


def pytest_sessionstart(session):
    from alembic import command
    from alembic.config import Config

    asyncio.run(_prepare_database())
    # The schema under test is the real migration, not metadata.create_all().
    command.upgrade(Config(str(ROOT / "alembic.ini")), "head")
    ensure_bucket()


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_SCRATCH, ignore_errors=True)


def _empty_bucket() -> None:
    s3 = get_s3()
    bucket = os.environ["QUIRE_S3_BUCKET"]
    keys = [o["Key"] for o in s3.list_objects_v2(Bucket=bucket).get("Contents", [])]
    if keys:
        s3.delete_objects(Bucket=bucket, Delete={"Objects": [{"Key": k} for k in keys]})


def bucket_keys(prefix: str = "") -> list[str]:
    page = get_s3().list_objects_v2(Bucket=os.environ["QUIRE_S3_BUCKET"], Prefix=prefix)
    return sorted(o["Key"] for o in page.get("Contents", []))


async def _truncate_all() -> None:
    async with SessionLocal() as cleanup:
        tables = (
            await cleanup.scalars(
                text(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' "
                    "AND tablename <> 'alembic_version'"
                )
            )
        ).all()
        # TRUNCATE bypasses the append-only trigger on access_events (row triggers don't fire).
        await cleanup.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
        await cleanup.commit()


@pytest.fixture(autouse=True)
async def _clean_state():
    """Every test starts from empty tables, an empty bucket, key store and outbox."""
    from app.core.mail import OUTBOX

    OUTBOX.clear()
    yield
    await _truncate_all()
    _empty_bucket()
    for key_id in get_keystore().list_ids():
        get_keystore().destroy(key_id)
    shutil.rmtree(_SCRATCH / "workspaces", ignore_errors=True)


@pytest.fixture
async def db():
    async with SessionLocal() as session:
        yield session


@pytest.fixture
def keystore():
    return get_keystore()


async def make_user(db, email: str | None = None):
    from app.models import User

    user = User(email=email or f"user-{uuid.uuid4().hex[:10]}@example.com", created_at=NOW)
    db.add(user)
    await db.flush()
    return user


async def make_shop(db, owner=None, **fields):
    """A shop row with its owner membership, created directly (service-level tests)."""
    from app.services.shops import create_shop

    owner = owner or await make_user(db)
    shop, _ = await create_shop(db, user=owner, fields={"name": "Sharma Xerox", **fields}, now=NOW)
    return shop


@pytest.fixture
async def shop_id(db) -> uuid.UUID:
    return (await make_shop(db)).id


@pytest.fixture
async def simulated_agent(db, shop_id) -> PrintAgent:
    from app.services.printing import register_agent

    return await register_agent(
        db, shop_id=shop_id, name="Counter laser", mode="simulated", now=NOW
    )


@pytest.fixture
async def physical_agent(db, shop_id) -> PrintAgent:
    """Phase 1 refuses physical agents in the service, so tests insert one directly to check how
    physical orders would be presented."""
    agent = PrintAgent(shop_id=shop_id, name="Office laser", mode="physical", created_at=NOW)
    db.add(agent)
    await db.flush()
    return agent


def _add_csrf_header(c: AsyncClient):
    async def hook(request):
        token = c.cookies.get("__Host-quire_csrf")
        if token and "x-csrf-token" not in request.headers:
            request.headers["x-csrf-token"] = token

    return hook


def make_client(*, origin: str | None = WEB_ORIGIN, csrf: bool = True) -> AsyncClient:
    """A browser-like client: HTTPS (so Secure cookies are kept), the web app's Origin, and the
    CSRF header echoed from its cookie, exactly as apps/web does."""
    headers = {"origin": origin} if origin else {}
    c = AsyncClient(
        transport=ASGITransport(app=app, client=("203.0.113.10", 50000)),
        base_url="https://testserver",
        headers=headers,
    )
    if csrf:
        c.event_hooks["request"] = [_add_csrf_header(c)]
    return c


@pytest.fixture
async def client():
    """HTTP client that runs the app's startup/shutdown (lifespan) like the real server."""
    async with app.router.lifespan_context(app):
        async with make_client() as c:
            yield c


async def sign_in(c: AsyncClient, email: str) -> dict:
    """Request and enter a code through the real endpoints. Returns the /verify body."""
    from app.core.mail import OUTBOX

    r = await c.post("/api/v1/auth/otp/request", json={"email": email})
    assert r.status_code == 202, r.text
    code = next(
        m for m in reversed(OUTBOX) if m.to == email.lower() and m.subject.endswith("sign-in code")
    ).body.split()[5]
    r = await c.post(
        "/api/v1/auth/otp/verify", json={"challenge_id": r.json()["challenge_id"], "code": code}
    )
    assert r.status_code == 200, r.text
    return r.json()
