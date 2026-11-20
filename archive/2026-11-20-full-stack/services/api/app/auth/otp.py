"""One-time sign-in codes.

Enumeration resistance: requesting a code behaves identically for every well-formed address —
same response, same work, same email — because the account is only created after the first
successful verification. Rate limits are keyed by address and client, never by account, so they
reveal nothing either.
"""

from __future__ import annotations

import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import otp_mac
from app.models.auth import AuthEvent, OtpChallenge, User

CODE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds=60)
EMAIL_REQUESTS_PER_HOUR = 5
CLIENT_REQUESTS_PER_HOUR = 20
EMAIL_FAILURES_PER_HOUR = 10
VERIFY_LOCK = timedelta(minutes=30)
HOUR = timedelta(hours=1)


class InvalidEmail(ValueError):
    pass


@dataclass(frozen=True)
class RateLimited(Exception):
    retry_after: int


class CodeExpired(Exception):
    """Unknown, expired, superseded, used-up or already-used challenge. One answer for all."""


@dataclass(frozen=True)
class WrongCode(Exception):
    attempts_left: int


@dataclass(frozen=True)
class VerifyLocked(Exception):
    retry_after: int


@dataclass(frozen=True)
class IssuedCode:
    challenge_id: uuid.UUID
    code: str
    email: str


def normalise_email(raw: str) -> str:
    try:
        result = validate_email(raw or "", check_deliverability=False)
    except EmailNotValidError as exc:
        raise InvalidEmail("Enter a valid email address") from exc
    email = result.normalized.lower()
    if len(email) > 254:
        raise InvalidEmail("Enter a valid email address")
    return email


def _seconds_until(moment: datetime, now: datetime) -> int:
    return max(1, int((moment - now).total_seconds() + 0.999))


async def request_code(
    session: AsyncSession, *, email: str, client: str, now: datetime
) -> IssuedCode:
    """Create a challenge (superseding earlier ones) or raise RateLimited. Caller sends the mail."""
    recent = (
        await session.scalars(
            select(OtpChallenge.created_at)
            .where(OtpChallenge.email == email, OtpChallenge.created_at > now - HOUR)
            .order_by(OtpChallenge.created_at.desc())
        )
    ).all()
    if recent and now - recent[0] < RESEND_COOLDOWN:
        raise RateLimited(_seconds_until(recent[0] + RESEND_COOLDOWN, now))
    if len(recent) >= EMAIL_REQUESTS_PER_HOUR:
        raise RateLimited(_seconds_until(recent[-1] + HOUR, now))
    client_recent = await session.scalar(
        select(func.min(OtpChallenge.created_at)).where(
            OtpChallenge.client_hash == client, OtpChallenge.created_at > now - HOUR
        )
    )
    client_count = await session.scalar(
        select(func.count())
        .select_from(OtpChallenge)
        .where(OtpChallenge.client_hash == client, OtpChallenge.created_at > now - HOUR)
    )
    if client_count >= CLIENT_REQUESTS_PER_HOUR:
        raise RateLimited(_seconds_until(client_recent + HOUR, now))

    await session.execute(
        update(OtpChallenge)
        .where(
            OtpChallenge.email == email,
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.superseded_at.is_(None),
        )
        .values(superseded_at=now)
    )
    challenge_id = uuid.uuid4()
    code = f"{secrets.randbelow(1_000_000):06d}"
    session.add(
        OtpChallenge(
            id=challenge_id,
            email=email,
            code_mac=otp_mac(challenge_id.bytes, code),
            attempts=0,
            client_hash=client,
            created_at=now,
            expires_at=now + CODE_TTL,
        )
    )
    await session.flush()
    return IssuedCode(challenge_id=challenge_id, code=code, email=email)


async def _verify_lock(session: AsyncSession, email: str, now: datetime) -> datetime | None:
    failures = (
        await session.scalars(
            select(AuthEvent.at)
            .where(
                AuthEvent.email == email, AuthEvent.kind == "otp_wrong", AuthEvent.at > now - HOUR
            )
            .order_by(AuthEvent.at.desc())
        )
    ).all()
    if len(failures) >= EMAIL_FAILURES_PER_HOUR and now < failures[0] + VERIFY_LOCK:
        return failures[0] + VERIFY_LOCK
    return None


async def verify_code(
    session: AsyncSession, *, challenge_id: uuid.UUID, code: str, client: str, now: datetime
) -> User:
    """Consume a challenge and return the (possibly new) user. Records failures; the caller
    commits in every outcome."""
    challenge = (
        await session.execute(
            select(OtpChallenge)
            .where(OtpChallenge.id == challenge_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if challenge is None:
        raise CodeExpired()
    locked_until = await _verify_lock(session, challenge.email, now)
    if locked_until is not None:
        raise VerifyLocked(_seconds_until(locked_until, now))
    if (
        challenge.consumed_at is not None
        or challenge.superseded_at is not None
        or now >= challenge.expires_at
        or challenge.attempts >= MAX_ATTEMPTS
    ):
        raise CodeExpired()

    expected = challenge.code_mac
    presented = otp_mac(challenge.id.bytes, code if code.isdigit() and len(code) == 6 else "")
    if not hmac.compare_digest(expected, presented):
        challenge.attempts += 1
        session.add(AuthEvent(email=challenge.email, client_hash=client, kind="otp_wrong", at=now))
        await session.flush()
        raise WrongCode(attempts_left=MAX_ATTEMPTS - challenge.attempts)

    challenge.consumed_at = now
    user = (
        await session.execute(select(User).where(User.email == challenge.email).with_for_update())
    ).scalar_one_or_none()
    if user is None:
        user = User(email=challenge.email, created_at=now)
        session.add(user)
    user.last_sign_in_at = now
    await session.flush()
    return user
