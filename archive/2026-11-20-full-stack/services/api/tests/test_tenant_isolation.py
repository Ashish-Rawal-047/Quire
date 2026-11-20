"""Authorization matrix: every shop route × every kind of caller, against shop A.

Expected:
    signed out                  → 401
    customer, other shop's people → 404 (indistinguishable from a shop that doesn't exist)
    staff on an owner-only route → 403
    the right role              → success
Every denial is checked to contain nothing about shop A.
"""

import uuid
from contextlib import AsyncExitStack

import pytest
from sqlalchemy import select

from app.models.shops import ShopMember
from tests.world import API, World, build_world, invitation_state


@pytest.fixture
async def world():
    async with AsyncExitStack() as stack:
        yield await build_world(stack)


HOURS = {"intervals": [{"weekday": 0, "opens_at": "09:00", "closes_at": "21:00"}]}

# (method, path template, body, required role)
ROUTES = [
    ("GET", "/shops/{shop}", None, "staff"),
    ("PATCH", "/shops/{shop}", {"description": "Updated by test"}, "owner"),
    ("PUT", "/shops/{shop}/location", {"latitude": 28.5672, "longitude": 77.2436}, "owner"),
    ("PUT", "/shops/{shop}/hours", HOURS, "owner"),
    ("PUT", "/shops/{shop}/accepting", {"accepting": True}, "staff"),
    ("GET", "/shops/{shop}/members", None, "owner"),
    ("POST", "/shops/{shop}/invitations", {"email": "new-hire@example.com"}, "owner"),
    ("DELETE", "/shops/{shop}/invitations/{invitation}", None, "owner"),
    ("DELETE", "/shops/{shop}/members/{staff_a}", None, "owner"),
]

OUTSIDERS = ["customer", "owner_b", "staff_b"]
STAFF_OF_A = ["staff_a", "multi"]  # multi is staff at A (and B), owner of C


def _path(world: World, template: str, shop: str = "A") -> str:
    return API + template.format(
        shop=world.shops[shop]["id"],
        invitation=world.pending_invitation[shop],
        staff_a=world["staff_a"].user_id,
    )


async def _call(world: World, who: str, method: str, path: str, body):
    client = world[who].client
    return (
        await client.request(method, path, json=body)
        if body is not None
        else await client.request(method, path)
    )


def _assert_no_leak(world: World, response) -> None:
    shop = world.shops["A"]
    for secret in (shop["id"], shop["code"], shop["name"], world["staff_a"].email):
        assert secret not in response.text, (secret, response.text)


@pytest.mark.parametrize(
    ("method", "template", "body", "role"), ROUTES, ids=[f"{m} {t}" for m, t, _, _ in ROUTES]
)
async def test_route_matrix(world, method, template, body, role):
    path = _path(world, template)

    r = await _call(world, "anon", method, path, body)
    assert r.status_code == 401, ("anon", r.status_code)
    _assert_no_leak(world, r)

    unknown = await world["customer"].client.get(f"{API}/shops/{uuid.uuid4()}")
    for who in OUTSIDERS:
        r = await _call(world, who, method, path, body)
        assert r.status_code == 404, (who, r.status_code, r.text)
        assert r.json() == unknown.json(), "denial must look exactly like a missing shop"
        _assert_no_leak(world, r)

    for who in STAFF_OF_A:
        r = await _call(world, who, method, path, body)
        if role == "owner":
            assert r.status_code == 403, (who, r.status_code)
            assert r.json()["code"] == "owner_only"
        else:
            assert r.status_code in (200, 201, 204), (who, r.status_code, r.text)

    r = await _call(world, "owner_a", method, path, body)
    assert r.status_code in (200, 201, 204), ("owner_a", r.status_code, r.text)


async def test_owner_actions_by_staff_change_nothing(world, db):
    a = world.shops["A"]["id"]
    await world["staff_a"].client.patch(f"{API}/shops/{a}", json={"name": "Hijacked"})
    await world["staff_a"].client.delete(f"{API}/shops/{a}/members/{world['owner_a'].user_id}")
    shop = (await world["owner_a"].client.get(f"{API}/shops/{a}")).json()
    assert shop["name"] == "Sharma Xerox"
    members = (await world["owner_a"].client.get(f"{API}/shops/{a}/members")).json()["members"]
    assert {m["email"] for m in members} >= {"owner-a@example.com", "staff-a@example.com"}


async def test_another_shops_ids_are_404_even_for_an_owner(world, db):
    a = world.shops["A"]["id"]
    owner_a = world["owner_a"].client
    # B's pending invitation and B's staff member, addressed through shop A.
    r = await owner_a.delete(f"{API}/shops/{a}/invitations/{world.pending_invitation['B']}")
    assert r.status_code == 404
    assert (await invitation_state(db, world.pending_invitation["B"])).revoked_at is None
    r = await owner_a.delete(f"{API}/shops/{a}/members/{world['staff_b'].user_id}")
    assert r.status_code == 404
    still = await db.scalar(
        select(ShopMember).where(
            ShopMember.user_id == world["staff_b"].user_id, ShopMember.revoked_at.is_(None)
        )
    )
    assert still is not None


async def test_members_list_only_shows_that_shop(world):
    a = world.shops["A"]["id"]
    body = (await world["owner_a"].client.get(f"{API}/shops/{a}/members")).json()
    emails = {m["email"] for m in body["members"]} | {i["email"] for i in body["invitations"]}
    assert emails == {
        "owner-a@example.com",
        "staff-a@example.com",
        "multi@example.com",
        "pending-a@example.com",
    }


async def test_me_shows_only_your_own_memberships(world):
    me = (await world["customer"].client.get(f"{API}/me")).json()
    assert me["memberships"] == [] and me["invitations"] == []
    staff = (await world["staff_a"].client.get(f"{API}/me")).json()
    assert [(m["shop_name"], m["role"]) for m in staff["memberships"]] == [
        ("Sharma Xerox", "staff")
    ]


async def test_one_account_customer_plus_different_roles_in_several_shops(world):
    multi = world["multi"].client
    me = (await multi.get(f"{API}/me")).json()
    roles = {m["shop_name"]: m["role"] for m in me["memberships"]}
    assert roles == {
        "Sharma Xerox": "staff",
        "Campus Copy Centre": "staff",
        "Print Bazaar": "owner",
    }

    a, b, c = (world.shops[k]["id"] for k in "ABC")
    assert (await multi.patch(f"{API}/shops/{c}", json={"description": "Mine"})).status_code == 200
    assert (await multi.patch(f"{API}/shops/{a}", json={"description": "x"})).status_code == 403
    assert (await multi.patch(f"{API}/shops/{b}", json={"description": "x"})).status_code == 403
    assert (
        await multi.put(f"{API}/shops/{a}/accepting", json={"accepting": True})
    ).status_code == 200
    assert (await multi.get(f"{API}/shops/{c}/members")).status_code == 200
    assert (await multi.get(f"{API}/shops/{a}/members")).status_code == 403
    # Still a customer: profile works, and leaving one shop leaves the others untouched.
    assert (await multi.delete(f"{API}/me/memberships/{a}")).status_code == 204
    assert (await multi.get(f"{API}/shops/{a}")).status_code == 404
    assert (await multi.get(f"{API}/shops/{b}")).status_code == 200
    assert (await multi.get(f"{API}/shops/{c}")).status_code == 200


async def test_removed_staff_lose_access_immediately(world):
    a = world.shops["A"]["id"]
    staff = world["staff_a"].client
    assert (await staff.get(f"{API}/shops/{a}")).status_code == 200
    r = await world["owner_a"].client.delete(f"{API}/shops/{a}/members/{world['staff_a'].user_id}")
    assert r.status_code == 204
    assert (await staff.get(f"{API}/shops/{a}")).status_code == 404  # same session, no re-login
    me = (await staff.get(f"{API}/me")).json()
    assert me["memberships"] == []


@pytest.mark.parametrize(
    "body",
    [
        {"name": "X Shop", "status": "listed"},
        {"name": "X Shop", "is_demo": True},
        {"name": "X Shop", "accepting_orders": True},
        {"name": "X Shop", "code": "AAAAAA"},
        {"name": "X Shop", "created_by": str(uuid.uuid4())},
        {"name": "X Shop", "owner_id": str(uuid.uuid4())},
        {"name": "X Shop", "id": str(uuid.uuid4())},
    ],
)
async def test_registration_rejects_server_owned_fields(world, body):
    r = await world["customer"].client.post(f"{API}/shops", json=body)
    assert r.status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {"status": "listed"},
        {"is_demo": True},
        {"accepting_orders": True},
        {"shop_id": str(uuid.uuid4())},
        {"role": "owner"},
        {"latitude": 28.5},
    ],
)
async def test_profile_update_rejects_server_owned_fields(world, body):
    a = world.shops["A"]["id"]
    r = await world["owner_a"].client.patch(f"{API}/shops/{a}", json=body)
    assert r.status_code == 422


async def test_hours_and_invitations_reject_extra_fields(world):
    a = world.shops["A"]["id"]
    owner = world["owner_a"].client
    r = await owner.put(f"{API}/shops/{a}/hours", json={**HOURS, "shop_id": world.shops["B"]["id"]})
    assert r.status_code == 422
    r = await owner.post(
        f"{API}/shops/{a}/invitations", json={"email": "x@example.com", "role": "owner"}
    )
    assert r.status_code == 422


async def test_an_invitation_can_only_be_used_by_its_address(world):
    invitation = world.pending_invitation["A"]  # sent to pending-a@example.com
    for who in ("customer", "staff_b", "owner_b", "multi"):
        r = await world[who].client.post(f"{API}/me/invitations/{invitation}/accept")
        assert r.status_code == 404, who
    r = await world["anon"].client.post(f"{API}/me/invitations/{invitation}/accept")
    assert r.status_code == 401
