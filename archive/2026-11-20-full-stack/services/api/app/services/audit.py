"""Access receipt entries. Details are short, fixed phrases — never filenames or content."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AccessEvent

ActorKind = Literal["customer", "shop", "system"]


def record(
    session: AsyncSession,
    *,
    order_id: uuid.UUID,
    action: str,
    actor_kind: ActorKind,
    at: datetime,
    actor_id: str | None = None,
    document_id: uuid.UUID | None = None,
    print_mode: str | None = None,
    detail: str | None = None,
) -> AccessEvent:
    event = AccessEvent(
        order_id=order_id,
        document_id=document_id,
        action=action,
        actor_kind=actor_kind,
        actor_id=actor_id,
        print_mode=print_mode,
        detail=detail[:200] if detail else None,
        at=at,
    )
    session.add(event)
    return event
