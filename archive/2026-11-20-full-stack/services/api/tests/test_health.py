"""Smoke tests for the API skeleton. Requires `docker compose up -d`."""


async def test_health_reports_every_dependency(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert set(body["checks"]) == {
        "database",
        "storage",
        "mail",
        "malware_scan",
        "encryption_key",
        "key_store",
        "payments",
    }
    for name in ("database", "storage", "mail", "encryption_key"):
        assert body["checks"][name]["status"] == "ok", (name, body["checks"][name])


async def test_health_never_leaks_secrets(client):
    text = (await client.get("/api/v1/health")).text
    assert "quire_dev_password" not in text
    assert "QUIRE_MASTER_KEY" not in text
