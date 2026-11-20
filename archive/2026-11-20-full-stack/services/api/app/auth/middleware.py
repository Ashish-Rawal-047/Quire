"""Request guard for every API call (pure ASGI, so it never reads or buffers request bodies).

* Unsafe methods (anything but GET/HEAD/OPTIONS) must come from the web app's own origin.
  Browsers always send `Origin` on such requests; a missing or foreign one is refused.
* If a session cookie is present, unsafe methods must also carry the session-bound CSRF token in
  `X-CSRF-Token` (signed double-submit).
* Every response is marked `Cache-Control: no-store`: API responses are personal.
"""

from __future__ import annotations

from http.cookies import CookieError, SimpleCookie

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.errors import problem_response
from app.auth.security import CSRF_HEADER, csrf_matches, session_cookie_name
from app.core.config import get_settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _cookie(headers: dict[str, str], name: str) -> str | None:
    raw = headers.get("cookie")
    if not raw:
        return None
    jar = SimpleCookie()
    try:
        jar.load(raw)
    except CookieError:
        return None
    morsel = jar.get(name)
    return morsel.value if morsel else None


class RequestGuard:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope["method"] not in SAFE_METHODS:
            headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in scope["headers"]}
            if headers.get("origin") != get_settings().web_origin:
                await problem_response(403, "bad_origin", "Request refused")(scope, receive, send)
                return
            token = _cookie(headers, session_cookie_name())
            if token is not None and not csrf_matches(token, headers.get(CSRF_HEADER)):
                await problem_response(403, "csrf_failed", "Request refused")(scope, receive, send)
                return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"cache-control", b"no-store"))
                headers.append((b"x-content-type-options", b"nosniff"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
