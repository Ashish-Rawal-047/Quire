"""SQLAlchemy models. Import every model module here so Alembic autogenerate sees all tables.

Users and shops arrive in M1 (see docs/01). The domain tables below were brought forward from
M2–M5 to implement the review fixes of 2026-11-20 (encryption, deletion, print mode, pickup).
"""

from app.models.auth import AuthEvent, OtpChallenge, User, UserSession
from app.models.domain import (
    AccessEvent,
    Document,
    KeyEpoch,
    Order,
    PickupAttempt,
    PrintAgent,
    PrintJob,
)
from app.models.shops import Shop, ShopHours, ShopInvitation, ShopMember

__all__ = [
    "AccessEvent",
    "AuthEvent",
    "OtpChallenge",
    "User",
    "UserSession",
    "Document",
    "KeyEpoch",
    "Order",
    "PickupAttempt",
    "PrintAgent",
    "PrintJob",
    "Shop",
    "ShopHours",
    "ShopInvitation",
    "ShopMember",
]
