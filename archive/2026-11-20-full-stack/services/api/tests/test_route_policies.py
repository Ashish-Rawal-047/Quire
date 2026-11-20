"""Every route declares exactly one access policy, and public routes are an explicit allowlist."""

from fastapi import routing as fastapi_routing
from fastapi.routing import APIRoute

from app.main import app

PUBLIC_ALLOWLIST = {
    ("GET", "/api/v1/health"),
    ("POST", "/api/v1/auth/otp/request"),
    ("POST", "/api/v1/auth/otp/verify"),
}
POLICIES = {"public", "user", "shop_staff", "shop_owner"}


def _policies(dependant) -> set[str]:
    found = set()
    for dep in dependant.dependencies:
        name = getattr(dep.call, "__quire_policy__", None)
        if name:
            found.add(name)
        found |= _policies(dep)
    return found


def _api_routes(routes):
    """Yield (full path, APIRoute), following included routers. Newer FastAPI wraps them in
    `_IncludedRouter`; the cross-check against OpenAPI below guards against missing any."""
    for route in routes:
        if isinstance(route, APIRoute):
            yield route.path, route
        elif isinstance(route, fastapi_routing._IncludedRouter):
            for candidate in route.effective_candidates():
                if isinstance(candidate, fastapi_routing._IncludedRouter):
                    yield from _api_routes([candidate])
                elif isinstance(candidate.original_route, APIRoute):
                    yield candidate.path, candidate.original_route


def _routes():
    for path, route in _api_routes(app.routes):
        for method in route.methods:
            yield method, path, _policies(route.dependant)


def test_inventory_covers_every_documented_operation():
    documented = {
        (method.upper(), path) for path, ops in app.openapi()["paths"].items() for method in ops
    }
    walked = {(m, p) for m, p, _ in _routes()}
    assert documented and walked == documented


def test_every_route_declares_a_policy():
    missing = [(m, p) for m, p, found in _routes() if not (found & POLICIES)]
    assert missing == []


def test_public_routes_are_exactly_the_allowlist():
    public = {(m, p) for m, p, found in _routes() if found == {"public"}}
    assert public == PUBLIC_ALLOWLIST


def test_shop_routes_require_shop_membership():
    unscoped = [
        (m, p)
        for m, p, found in _routes()
        if "{shop_id}" in p and not (found & {"shop_staff", "shop_owner"})
    ]
    assert unscoped == []
