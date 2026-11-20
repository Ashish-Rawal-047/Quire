"""Problem responses (RFC 7807) and the strict request-model base class."""

from __future__ import annotations

import unicodedata
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

PROBLEM_JSON = "application/problem+json"


def clean_text(value: str | None) -> str | None:
    """Collapse whitespace and drop invisible control/format characters (e.g. right-to-left
    overrides that could disguise a name shown to other people)."""
    if value is None:
        return None
    kept = "".join(ch for ch in value if unicodedata.category(ch) not in ("Cc", "Cf"))
    return " ".join(kept.split()) or None


class StrictModel(BaseModel):
    """Request bodies reject unknown fields: a client can't slip in `shop_id`, `role`, `price`…"""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Problem(Exception):
    def __init__(
        self, status: int, code: str, title: str, detail: str | None = None, **extra: Any
    ) -> None:
        super().__init__(title)
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail
        self.extra = extra


def problem_response(
    status: int, code: str, title: str, detail: str | None = None, **extra: Any
) -> JSONResponse:
    body: dict[str, Any] = {"type": f"https://quire.local/problems/{code}", "title": title}
    body["code"] = code
    if detail:
        body["detail"] = detail
    body.update(extra)
    headers = {}
    if "retry_after" in extra:
        headers["Retry-After"] = str(extra["retry_after"])
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


def not_found() -> Problem:
    """The same response for "doesn't exist" and "not yours", so existence never leaks."""
    return Problem(404, "not_found", "Not found")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(Problem)
    async def _problem(_: Request, exc: Problem) -> JSONResponse:
        return problem_response(exc.status, exc.code, exc.title, exc.detail, **exc.extra)

    @app.exception_handler(RequestValidationError)
    async def _invalid(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Field locations and messages only. The submitted values are never echoed back, so codes,
        # emails or coordinates can't end up in responses, error reports or browser consoles.
        errors = [
            {
                "loc": [str(p) for p in e.get("loc", ())],
                "msg": e.get("msg", ""),
                "type": e.get("type"),
            }
            for e in exc.errors()
        ]
        return problem_response(422, "invalid_request", "Some fields are invalid", errors=errors)
