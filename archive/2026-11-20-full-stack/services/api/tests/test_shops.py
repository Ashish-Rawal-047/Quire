"""Shop registration, profile, hours, and staff invitations."""

import re
from contextlib import AsyncExitStack
from datetime import timedelta

import pytest
from sqlalchemy import update

from app.core import clock
from app.core.mail import OUTBOX
from app.models.shops import Shop, ShopInvitation
from tests.conftest import make_client, sign_in
from tests.world import API, build_world

SHOPS = f"{API}/shops"


@pytest.fixture
async def owner():
    async with make_client() as c:
        await sign_in(c, "owner@example.com")
        yield c


async def register(c, **fields) -> dict:
    r = await c.post(SHOPS, json={"name": "Sharma Xerox & Stationery", **fields})
    assert r.status_code == 201, r.text
    return r.json()


async def test_registration_creates_a_private_draft_owned_by_the_caller(owner):
    shop = await register(owner, pincode="110024", contact_phone="+91 98110 12345")
    assert shop["status"] == "draft"
    assert shop["accepting_orders"] is False and shop["is_demo"] is False
    assert re.fullmatch(r"[2-9A-HJ-NP-Z]{6}", shop["code"])
    assert shop["your_role"] == "owner"
    assert shop["contact_phone"] == "+919811012345"
    me = (await owner.get(f"{API}/me")).json()
    assert me["memberships"] == [
        {
            "shop_id": shop["id"],
            "shop_code": shop["code"],
            "shop_name": shop["name"],
            "role": "owner",
        }
    ]


async def test_an_account_can_own_at_most_three_shops(owner):
    for i in range(3):
        await register(owner, name=f"Shop {i}")
    r = await owner.post(SHOPS, json={"name": "One too many"})
    assert r.status_code == 409 and r.json()["code"] == "shop_limit"


async def test_registration_requires_sign_in():
    async with make_client() as anon:
        assert (await anon.post(SHOPS, json={"name": "Nope"})).status_code == 401


@pytest.mark.parametrize(
    "fields",
    [
        {"name": "A"},
        {"name": ""},
        {"pincode": "012345"},
        {"pincode": "11002"},
        {"contact_phone": "call me"},
        {"contact_email": "not-an-email"},
        {"description": "x" * 501},
    ],
)
async def test_profile_validation(owner, fields):
    r = await owner.post(SHOPS, json={"name": "Valid name", **fields})
    assert r.status_code == 422
    assert "call me" not in r.text and "not-an-email" not in r.text  # inputs never echoed


async def test_profile_update(owner):
    shop = await register(owner)
    r = await owner.patch(
        f"{SHOPS}/{shop['id']}",
        json={
            "locality": "Lajpat Nagar II",
            "city": "New Delhi",
            "contact_email": "Desk@Sharma.in",
        },
    )
    assert r.status_code == 200
    assert r.json()["contact_email"] == "desk@sharma.in"
    r = await owner.patch(f"{SHOPS}/{shop['id']}", json={"name": None})
    assert r.status_code == 422


@pytest.mark.parametrize(
    "location",
    [
        {"latitude": 51.5, "longitude": -0.12},  # London
        {"latitude": 28.5, "longitude": 120.0},
        {"latitude": 91, "longitude": 77},
    ],
)
async def test_location_must_be_in_india(owner, location):
    shop = await register(owner)
    assert (await owner.put(f"{SHOPS}/{shop['id']}/location", json=location)).status_code == 422


async def test_location_is_stored_to_five_decimals(owner):
    shop = await register(owner)
    r = await owner.put(
        f"{SHOPS}/{shop['id']}/location", json={"latitude": 28.567212345, "longitude": 77.243698765}
    )
    assert r.json()["latitude"] == 28.56721 and r.json()["longitude"] == 77.2437


@pytest.mark.parametrize(
    ("intervals", "ok"),
    [
        (
            [
                {"weekday": 0, "opens_at": "09:00", "closes_at": "13:00"},
                {"weekday": 0, "opens_at": "14:00", "closes_at": "21:30"},
            ],
            True,
        ),
        (
            [
                {"weekday": 0, "opens_at": "09:00", "closes_at": "13:00"},
                {"weekday": 0, "opens_at": "12:00", "closes_at": "18:00"},
            ],
            False,
        ),
        ([{"weekday": 2, "opens_at": "18:00", "closes_at": "09:00"}], False),
        ([{"weekday": 7, "opens_at": "09:00", "closes_at": "10:00"}], False),
        (
            [
                {"weekday": 1, "opens_at": f"{h:02d}:00", "closes_at": f"{h:02d}:30"}
                for h in (8, 10, 12, 14)
            ],
            False,
        ),
    ],
)
async def test_hours_validation(owner, intervals, ok):
    shop = await register(owner)
    r = await owner.put(f"{SHOPS}/{shop['id']}/hours", json={"intervals": intervals})
    assert (r.status_code == 200) is ok, r.text


async def test_hours_replace_the_previous_set(owner):
    shop = await register(owner)
    url = f"{SHOPS}/{shop['id']}/hours"
    await owner.put(
        url,
        json={
            "intervals": [
                {"weekday": d, "opens_at": "09:00", "closes_at": "21:00"} for d in range(6)
            ]
        },
    )
    r = await owner.put(
        url, json={"intervals": [{"weekday": 6, "opens_at": "10:00", "closes_at": "14:00"}]}
    )
    assert r.json()["hours"] == [{"weekday": 6, "opens_at": "10:00", "closes_at": "14:00"}]


# ── Invitations ─────────────────────────────────────────────────────────────────────────────


async def test_invitation_is_emailed_and_accepted_by_signing_in(owner):
    shop = await register(owner)
    r = await owner.post(f"{SHOPS}/{shop['id']}/invitations", json={"email": "Ravi@Example.com"})
    assert r.status_code == 201
    mail = OUTBOX[-1]
    assert mail.to == "ravi@example.com" and shop["name"] in mail.subject
    assert "/sign-in" in mail.body and "expires in 7 days" in mail.body
    async with make_client() as ravi:
        me = await sign_in(ravi, "ravi@example.com")
        assert [i["shop_name"] for i in me["invitations"]] == [shop["name"]]
        r = await ravi.post(f"{API}/me/invitations/{me['invitations'][0]['id']}/accept")
        assert r.json()["memberships"][0]["role"] == "staff"
        assert (await ravi.get(f"{SHOPS}/{shop['id']}")).json()["your_role"] == "staff"
        # Accepted invitations can't be reused.
        r = await ravi.post(f"{API}/me/invitations/{me['invitations'][0]['id']}/accept")
        assert r.status_code == 404


async def test_inviting_reveals_nothing_about_whether_an_account_exists(owner):
    shop = await register(owner)
    async with make_client() as existing:
        await sign_in(existing, "has-account@example.com")
    url = f"{SHOPS}/{shop['id']}/invitations"
    a = await owner.post(url, json={"email": "has-account@example.com"})
    b = await owner.post(url, json={"email": "no-account@example.com"})
    assert a.status_code == b.status_code == 201
    assert set(a.json()) == set(b.json())
    strip = lambda m: m.body  # noqa: E731
    bodies = [strip(m) for m in OUTBOX if "invited" in m.subject]
    assert bodies[0] == bodies[1]


async def test_duplicate_and_member_invitations_are_refused(owner):
    shop = await register(owner)
    url = f"{SHOPS}/{shop['id']}/invitations"
    assert (await owner.post(url, json={"email": "x@example.com"})).status_code == 201
    r = await owner.post(url, json={"email": "X@example.com"})
    assert r.status_code == 409 and r.json()["code"] == "already_invited"
    r = await owner.post(url, json={"email": "owner@example.com"})
    assert r.status_code == 409 and r.json()["code"] == "already_member"


async def test_expired_invitations_cannot_be_accepted_and_can_be_reissued(owner, db):
    shop = await register(owner)
    url = f"{SHOPS}/{shop['id']}/invitations"
    first = (await owner.post(url, json={"email": "late@example.com"})).json()
    await db.execute(
        update(ShopInvitation).values(expires_at=clock.utcnow() - timedelta(seconds=1))
    )
    await db.commit()
    async with make_client() as late:
        me = await sign_in(late, "late@example.com")
        assert me["invitations"] == []
        assert (await late.post(f"{API}/me/invitations/{first['id']}/accept")).status_code == 404
    assert (await owner.post(url, json={"email": "late@example.com"})).status_code == 201


async def test_revoked_and_declined_invitations_are_dead(owner):
    shop = await register(owner)
    url = f"{SHOPS}/{shop['id']}/invitations"
    revoked = (await owner.post(url, json={"email": "rev@example.com"})).json()
    assert (await owner.delete(f"{url}/{revoked['id']}")).status_code == 204
    declined = (await owner.post(url, json={"email": "dec@example.com"})).json()
    async with make_client() as rev:
        await sign_in(rev, "rev@example.com")
        assert (await rev.post(f"{API}/me/invitations/{revoked['id']}/accept")).status_code == 404
    async with make_client() as dec:
        await sign_in(dec, "dec@example.com")
        r = await dec.post(f"{API}/me/invitations/{declined['id']}/decline")
        assert r.status_code == 200 and r.json()["invitations"] == []
        assert (await dec.post(f"{API}/me/invitations/{declined['id']}/accept")).status_code == 404


async def test_twenty_invitations_a_day_per_shop(owner):
    shop = await register(owner)
    url = f"{SHOPS}/{shop['id']}/invitations"
    for i in range(20):
        assert (await owner.post(url, json={"email": f"s{i}@example.com"})).status_code == 201
    r = await owner.post(url, json={"email": "s20@example.com"})
    assert r.status_code == 429


# ── Ownership rules ─────────────────────────────────────────────────────────────────────────


async def test_the_last_owner_can_neither_be_removed_nor_leave():
    async with AsyncExitStack() as stack:
        world = await build_world(stack)
        a = world.shops["A"]["id"]
        owner = world["owner_a"]
        r = await owner.client.delete(f"{SHOPS}/{a}/members/{owner.user_id}")
        assert r.status_code == 409 and r.json()["code"] == "last_owner"
        r = await owner.client.delete(f"{API}/me/memberships/{a}")
        assert r.status_code == 409
        # Staff can leave on their own.
        assert (
            await world["staff_a"].client.delete(f"{API}/me/memberships/{a}")
        ).status_code == 204


async def test_suspended_shops_are_closed_to_their_members(owner, db):
    shop = await register(owner)
    await db.execute(update(Shop).values(status="suspended"))
    await db.commit()
    r = await owner.get(f"{SHOPS}/{shop['id']}")
    assert r.status_code == 403 and r.json()["code"] == "shop_suspended"


async def test_a_customer_can_also_register_a_shop(owner):
    """D1: one account, customer by default, owner of the shop it registers."""
    async with make_client() as c:
        await sign_in(c, "both@example.com")
        assert (await c.get(f"{API}/me")).json()["memberships"] == []
        shop = await register(c, name="Corner Prints")
        me = (await c.get(f"{API}/me")).json()
        assert me["memberships"][0]["shop_id"] == shop["id"]
        # The other owner's shop stays invisible to them.
        other = await register(owner, name="Not yours")
        assert (await c.get(f"{SHOPS}/{other['id']}")).status_code == 404


async def test_invisible_control_characters_are_stripped_from_names(owner):
    shop = await register(owner, name="Sharma‮Xerox​  Centre")
    assert shop["name"] == "SharmaXerox Centre"
    r = await owner.patch(f"{API}/me", json={"display_name": "Ravi‮ Kumar"})
    assert r.json()["user"]["display_name"] == "Ravi Kumar"
    assert (await owner.post(SHOPS, json={"name": "​​​"})).status_code == 422
