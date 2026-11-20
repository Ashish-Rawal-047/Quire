"""Outgoing email. Message bodies (which may hold sign-in codes) are never logged."""

from __future__ import annotations

import asyncio
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import get_settings

log = logging.getLogger("quire.mail")


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    body: str


# Used only when QUIRE_MAIL_BACKEND=memory (tests).
OUTBOX: list[Mail] = []


def _send_smtp(mail: Mail) -> None:
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.mail_from
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg.set_content(mail.body)
    with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=10) as smtp:
        smtp.send_message(msg)


async def send_mail(to: str, subject: str, body: str) -> None:
    mail = Mail(to=to, subject=subject, body=body)
    if get_settings().mail_backend == "memory":
        OUTBOX.append(mail)
        return
    try:
        await asyncio.to_thread(_send_smtp, mail)
    except Exception as exc:  # noqa: BLE001 — the caller must not learn whether delivery worked
        log.warning("mail delivery failed: %s", type(exc).__name__)
