import {
  Ban,
  CheckCheck,
  ClipboardCheck,
  FilePen,
  FlaskConical,
  Hourglass,
  Inbox,
  PackageCheck,
  PackageX,
  Printer,
  type LucideIcon,
} from "lucide-react";

/**
 * Whether an order is printed for real or by the simulated print agent. Set by the server from
 * the shop's print agent and fixed for the life of the order; the UI only ever reads it.
 */
export type PrintMode = "simulated" | "physical";

/** The fixed wording every simulated order carries once printing starts. Never shorten it. */
export const SIMULATED_NOTICE = "SIMULATED — no paper printed";

/**
 * The single source of truth for order statuses. Every badge, timeline and filter reads
 * from here so a status always has the same colour, icon and meaning across the product.
 * Customers and shops see different words for the same state where it helps them.
 */
export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "accepted"
  | "printing"
  | "ready"
  | "completed"
  | "uncollected"
  | "cancelled";

export type StatusTone = "neutral" | "new" | "accepted" | "printing" | "ready" | "done" | "cancelled";

type StatusMeta = {
  shopLabel: string;
  customerLabel: string;
  customerHint: string;
  icon: LucideIcon;
  tone: StatusTone;
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  draft: {
    shopLabel: "Draft",
    customerLabel: "Draft",
    customerHint: "Finish setting up your order.",
    icon: FilePen,
    tone: "neutral",
  },
  awaiting_payment: {
    shopLabel: "Awaiting payment",
    customerLabel: "Awaiting payment",
    customerHint: "Complete payment to send this order to the shop.",
    icon: Hourglass,
    tone: "neutral",
  },
  paid: {
    shopLabel: "New",
    customerLabel: "Sent to shop",
    customerHint: "Sent. Waiting for the shop to accept.",
    icon: Inbox,
    tone: "new",
  },
  accepted: {
    shopLabel: "Accepted",
    customerLabel: "Accepted",
    customerHint: "The shop has accepted your order.",
    icon: ClipboardCheck,
    tone: "accepted",
  },
  printing: {
    shopLabel: "Printing",
    customerLabel: "Printing",
    customerHint: "The shop is printing your order.",
    icon: Printer,
    tone: "printing",
  },
  ready: {
    shopLabel: "Ready",
    customerLabel: "Ready for pickup",
    customerHint: "Show your pickup code at the counter.",
    icon: PackageCheck,
    tone: "ready",
  },
  completed: {
    shopLabel: "Completed",
    customerLabel: "Collected",
    customerHint: "Collected. Your files will be deleted within an hour.",
    icon: CheckCheck,
    tone: "done",
  },
  uncollected: {
    shopLabel: "Uncollected",
    customerLabel: "Not collected",
    customerHint: "Your prints are still at the shop.",
    icon: PackageX,
    tone: "done",
  },
  cancelled: {
    shopLabel: "Cancelled",
    customerLabel: "Cancelled",
    customerHint: "Cancelled. Any payment will be refunded to your original payment method.",
    icon: Ban,
    tone: "cancelled",
  },
};

/**
 * Simulated orders replace the wording (and the parcel icons) of every status from printing
 * onwards, so nothing suggests that paper exists or can be collected. Mirrors
 * services/api/app/services/presentation.py; both sides are tested against the same rules.
 */
const SIMULATED_OVERRIDES: Partial<Record<OrderStatus, Omit<StatusMeta, "tone">>> = {
  printing: {
    shopLabel: "Printing · simulated",
    customerLabel: "Simulated printing",
    customerHint: `${SIMULATED_NOTICE}. The shop is running a demo print job.`,
    icon: FlaskConical,
  },
  ready: {
    shopLabel: "Ready · simulated",
    customerLabel: "Simulation finished",
    customerHint: `${SIMULATED_NOTICE}. There is nothing to collect.`,
    icon: FlaskConical,
  },
  completed: {
    shopLabel: "Completed · simulated",
    customerLabel: "Demo completed",
    customerHint: `${SIMULATED_NOTICE}. No prints were handed over. Your files will be deleted within an hour.`,
    icon: FlaskConical,
  },
  uncollected: {
    shopLabel: "Ended · simulated",
    customerLabel: "Demo ended",
    customerHint: `${SIMULATED_NOTICE}. There was nothing to collect.`,
    icon: FlaskConical,
  },
};

/** Status wording for an order in a given print mode. Always use this, never ORDER_STATUS alone. */
export function statusCopy(status: OrderStatus, mode: PrintMode): StatusMeta {
  const base = ORDER_STATUS[status];
  const override = mode === "simulated" ? SIMULATED_OVERRIDES[status] : undefined;
  return override ? { ...base, ...override } : base;
}

/** Literal class strings (Tailwind needs them statically) for each tone. */
export const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string; ink: string }> = {
  neutral: { badge: "bg-sunken text-ink-2", dot: "bg-ink-faint", ink: "text-ink-2" },
  new: { badge: "bg-st-new-tint text-st-new-ink", dot: "bg-st-new", ink: "text-st-new-ink" },
  accepted: {
    badge: "bg-st-accepted-tint text-st-accepted-ink",
    dot: "bg-st-accepted",
    ink: "text-st-accepted-ink",
  },
  printing: {
    badge: "bg-st-printing-tint text-st-printing-ink",
    dot: "bg-st-printing",
    ink: "text-st-printing-ink",
  },
  ready: { badge: "bg-st-ready-tint text-st-ready-ink", dot: "bg-st-ready", ink: "text-st-ready-ink" },
  done: { badge: "bg-st-done-tint text-st-done-ink", dot: "bg-st-done", ink: "text-st-done-ink" },
  cancelled: {
    badge: "bg-st-cancelled-tint text-st-cancelled-ink",
    dot: "bg-st-cancelled",
    ink: "text-st-cancelled-ink",
  },
};

/** Stages shown in the customer timeline, in order. */
export const CUSTOMER_TIMELINE: OrderStatus[] = ["paid", "accepted", "printing", "ready", "completed"];

/** Columns of the shop's working queue. */
export const SHOP_STAGES: OrderStatus[] = ["paid", "accepted", "printing", "ready"];
