"""Customer-facing wording that depends on the print mode: status text, the pickup ticket and
notifications. Emails and API responses take their text from here, and the web app mirrors the
same table in apps/web/src/lib/status.ts. Tests check both sides against the same rules.

Rule: a simulated order never says or implies that paper exists or can be collected, and its
pickup code is never presented as something that can be used to collect anything.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models import Order

SIMULATED_NOTICE = "SIMULATED — no paper printed"


@dataclass(frozen=True)
class StatusText:
    label: str
    hint: str


_PHYSICAL: dict[str, StatusText] = {
    "draft": StatusText("Draft", "Finish setting up your order."),
    "awaiting_payment": StatusText(
        "Awaiting payment", "Complete payment to send this order to the shop."
    ),
    "paid": StatusText("Sent to shop", "Paid. Waiting for the shop to accept."),
    "accepted": StatusText("Accepted", "The shop has accepted your order."),
    "printing": StatusText("Printing", "The shop is printing your order."),
    "ready": StatusText("Ready for pickup", "Show your pickup code at the counter."),
    "completed": StatusText("Collected", "Collected. Your files will be deleted within an hour."),
    "uncollected": StatusText("Not collected", "Your prints are still at the shop."),
    "cancelled": StatusText(
        "Cancelled", "Cancelled. Any payment will be refunded to your original payment method."
    ),
}

_SIMULATED: dict[str, StatusText] = {
    "printing": StatusText(
        "Simulated printing", f"{SIMULATED_NOTICE}. The shop is running a demo print job."
    ),
    "ready": StatusText("Simulation finished", f"{SIMULATED_NOTICE}. There is nothing to collect."),
    "completed": StatusText(
        "Demo completed",
        f"{SIMULATED_NOTICE}. No prints were handed over. "
        "Your files will be deleted within an hour.",
    ),
    "uncollected": StatusText("Demo ended", f"{SIMULATED_NOTICE}. There was nothing to collect."),
}


def status_text(status: str, print_mode: str) -> StatusText:
    if print_mode == "simulated" and status in _SIMULATED:
        return _SIMULATED[status]
    return _PHYSICAL[status]


@dataclass(frozen=True)
class TicketView:
    title: str
    banner: str | None
    code_label: str
    code_note: str
    # False for simulated orders: the code only exercises the pickup check, it collects nothing.
    code_valid_for_collection: bool


def ticket(order: Order) -> TicketView:
    if order.print_mode == "simulated":
        return TicketView(
            title=status_text(order.status, "simulated").label,
            banner=SIMULATED_NOTICE,
            code_label="Demo code",
            code_note="For trying the pickup check only. Not valid for collecting anything — "
            "no prints exist.",
            code_valid_for_collection=False,
        )
    return TicketView(
        title=status_text(order.status, "physical").label,
        banner=None,
        code_label="Pickup code",
        code_note="Show this at the counter when you collect.",
        code_valid_for_collection=True,
    )


@dataclass(frozen=True)
class Notification:
    subject: str
    body: str


def notification(order: Order, event: str) -> Notification:
    """Text for status emails and push messages. `event` is the status just entered."""
    shop = "the shop"
    if order.print_mode == "simulated":
        bodies = {
            "printing": "The shop started a simulated print job. No paper will be printed.",
            "ready": "The simulated print job finished. No paper was printed and there is "
            "nothing to collect. The demo code in the app is not valid for collecting anything.",
            "completed": "The demo pickup check was completed. No prints were handed over. "
            "Your files will be deleted within an hour.",
        }
        text = status_text(event, "simulated")
        return Notification(
            subject=f"{text.label} · {order.number} ({SIMULATED_NOTICE})",
            body=bodies.get(event, text.hint),
        )
    bodies = {
        "printing": f"{shop.capitalize()} is printing your order.",
        "ready": "Your prints are ready. Open Quire to see your pickup code, and show it at the "
        "counter.",
        "completed": "Your prints were collected. Your files will be deleted within an hour.",
    }
    text = status_text(event, "physical")
    return Notification(subject=f"{text.label} · {order.number}", body=bodies.get(event, text.hint))
