"""A small multi-tenant world built entirely through the real HTTP API.

shop A  — owner_a (owner), staff_a (staff), multi (staff)
shop B  — owner_b (owner), staff_b (staff), multi (staff)
shop C  — multi (owner)
customer — signed in, no memberships
anon     — no session
"""

from __future__ import annotations

from contextlib import AsyncExitStack
from dataclasses import dataclass, field

from httpx import AsyncClient

from app.models.shops import ShopInvitation
from tests.conftest import make_client, sign_in

API = "/api/v1"


@dataclass
class Person:
    name: str
    email: str
    client: AsyncClient
    user_id: str = ""


@dataclass
class World:
    people: dict[str, Person] = field(default_factory=dict)
    shops: dict[str, dict] = field(default_factory=dict)
    pending_invitation: dict[str, str] = field(default_factory=dict)

    def __getitem__(self, name: str) -> Person:
        return self.people[name]


async def _person(stack: AsyncExitStack, world: World, name: str, *, signed_in: bool = True):
    client = await stack.enter_async_context(make_client())
    person = Person(name=name, email=f"{name.replace('_', '-')}@example.com", client=client)
    if signed_in:
        person.user_id = (await sign_in(client, person.email))["user"]["id"]
    world.people[name] = person
    return person


async def _invite_and_accept(owner: Person, shop_id: str, invitee: Person) -> None:
    r = await owner.client.post(f"{API}/shops/{shop_id}/invitations", json={"email": invitee.email})
    assert r.status_code == 201, r.text
    me = (await invitee.client.get(f"{API}/me")).json()
    invitation = next(i for i in me["invitations"] if i["id"] == r.json()["id"])
    r = await invitee.client.post(f"{API}/me/invitations/{invitation['id']}/accept")
    assert r.status_code == 200, r.text


async def build_world(stack: AsyncExitStack) -> World:
    world = World()
    for name in ("owner_a", "owner_b", "staff_a", "staff_b", "multi", "customer"):
        await _person(stack, world, name)
    await _person(stack, world, "anon", signed_in=False)

    for key, owner, shop_name in (
        ("A", "owner_a", "Sharma Xerox"),
        ("B", "owner_b", "Campus Copy Centre"),
        ("C", "multi", "Print Bazaar"),
    ):
        r = await world[owner].client.post(f"{API}/shops", json={"name": shop_name})
        assert r.status_code == 201, r.text
        world.shops[key] = r.json()

    await _invite_and_accept(world["owner_a"], world.shops["A"]["id"], world["staff_a"])
    await _invite_and_accept(world["owner_b"], world.shops["B"]["id"], world["staff_b"])
    await _invite_and_accept(world["owner_a"], world.shops["A"]["id"], world["multi"])
    await _invite_and_accept(world["owner_b"], world.shops["B"]["id"], world["multi"])

    for key, owner in (("A", "owner_a"), ("B", "owner_b")):
        r = await world[owner].client.post(
            f"{API}/shops/{world.shops[key]['id']}/invitations",
            json={"email": f"pending-{key.lower()}@example.com"},
        )
        assert r.status_code == 201
        world.pending_invitation[key] = r.json()["id"]
    return world


async def invitation_state(db, invitation_id: str) -> ShopInvitation:
    return await db.get(ShopInvitation, invitation_id, populate_existing=True)
