"""Sign-in with an emailed one-time code, and sign-out."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import Problem, StrictModel
from app.api.v1.me import MeOut, build_me
from app.auth import otp
from app.auth.deps import Principal, get_db, public, require_user
from app.auth.security import client_hash, csrf_cookie_name, csrf_token_for, session_cookie_name
from app.auth.sessions import create_session, resolve_session, revoke_all_sessions, revoke_session
from app.core import clock
from app.core.config import get_settings
from app.core.mail import send_mail

router = APIRouter(prefix="/auth", tags=["auth"])


class CodeRequest(StrictModel):
    email: str = Field(max_length=320)


class CodeRequested(BaseModel):
    challenge_id: uuid.UUID
    expires_in: int
    resend_after: int


class CodeVerify(StrictModel):
    challenge_id: uuid.UUID
    code: str = Field(min_length=1, max_length=12)


def _mail_body(code: str) -> str:
    minutes = int(otp.CODE_TTL.total_seconds() // 60)
    return (
        f"Your Quire sign-in code is {code}\n\n"
        f"It expires in {minutes} minutes and works once.\n\n"
        "If you didn't ask for this code, you can ignore this email. Nobody can sign in without it."
    )


def _set_session_cookies(response: Response, token: str) -> None:
    s = get_settings()
    max_age = s.session_absolute_days * 24 * 3600
    response.set_cookie(
        session_cookie_name(),
        token,
        max_age=max_age,
        path="/",
        secure=s.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    # Readable by the web app's JavaScript so it can echo it in X-CSRF-Token.
    response.set_cookie(
        csrf_cookie_name(),
        csrf_token_for(token),
        max_age=max_age,
        path="/",
        secure=s.cookie_secure,
        httponly=False,
        samesite="lax",
    )


def _clear_session_cookies(response: Response) -> None:
    s = get_settings()
    for name, httponly in ((session_cookie_name(), True), (csrf_cookie_name(), False)):
        response.delete_cookie(
            name, path="/", secure=s.cookie_secure, httponly=httponly, samesite="lax"
        )


@router.post(
    "/otp/request",
    status_code=202,
    response_model=CodeRequested,
    dependencies=[Depends(public)],
)
async def request_code(
    body: CodeRequest,
    request: Request,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> CodeRequested:
    """Always the same answer for any well-formed address, registered or not."""
    try:
        email = otp.normalise_email(body.email)
    except otp.InvalidEmail as exc:
        raise Problem(422, "invalid_email", "Enter a valid email address") from exc
    try:
        issued = await otp.request_code(
            db, email=email, client=client_hash(request), now=clock.utcnow()
        )
    except otp.RateLimited as exc:
        raise Problem(
            429,
            "rate_limited",
            "Too many codes requested",
            "Wait a moment before asking for another code.",
            retry_after=exc.retry_after,
        ) from exc
    await db.commit()
    # Sent after the response, so response time never depends on the mail server.
    background.add_task(send_mail, issued.email, "Your Quire sign-in code", _mail_body(issued.code))
    return CodeRequested(
        challenge_id=issued.challenge_id,
        expires_in=int(otp.CODE_TTL.total_seconds()),
        resend_after=int(otp.RESEND_COOLDOWN.total_seconds()),
    )


@router.post("/otp/verify", response_model=MeOut, dependencies=[Depends(public)])
async def verify_code(
    body: CodeVerify,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    now = clock.utcnow()
    try:
        user = await otp.verify_code(
            db,
            challenge_id=body.challenge_id,
            code=body.code,
            client=client_hash(request),
            now=now,
        )
    except otp.WrongCode as exc:
        await db.commit()
        raise Problem(
            400,
            "wrong_code",
            "That code isn't right",
            attempts_left=exc.attempts_left,
        ) from exc
    except otp.CodeExpired as exc:
        await db.commit()
        raise Problem(410, "code_expired", "This code has expired. Ask for a new one.") from exc
    except otp.VerifyLocked as exc:
        await db.commit()
        raise Problem(
            429,
            "verify_locked",
            "Too many wrong codes",
            "Sign-in for this address is paused for a while.",
            retry_after=exc.retry_after,
        ) from exc

    if user.disabled_at is not None:
        await db.commit()
        raise Problem(403, "account_disabled", "This account is disabled")

    # Never keep a session that existed before sign-in (session fixation): revoke it.
    previous = await resolve_session(db, request.cookies.get(session_cookie_name()), now=now)
    if previous is not None:
        await revoke_session(db, previous[0].id, now=now, reason="replaced")
    new = await create_session(db, user=user, now=now)
    await db.commit()
    _set_session_cookies(response, new.token)
    return await build_me(db, user)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await revoke_session(db, principal.session.id, now=clock.utcnow(), reason="logout")
    await db.commit()
    response.status_code = 204
    _clear_session_cookies(response)
    return response


@router.post("/logout-all", status_code=204)
async def logout_all(
    response: Response,
    principal: Principal = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await revoke_all_sessions(db, principal.user.id, now=clock.utcnow(), reason="logout_all")
    await db.commit()
    response.status_code = 204
    _clear_session_cookies(response)
    return response
