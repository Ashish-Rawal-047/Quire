"use client";

import { ArrowLeft, Banknote, Check, Inbox, MessageSquareText, Palette, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { FileList, ScanPickupDialog, StatusActions } from "@/components/demo/order-actions";
import { ReviewQuote } from "@/components/demo/review";
import { IcAccept, IcHandover, IcOrders, IcPrinter, IcReady } from "@/components/demo/shop-icons";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { AccessReceipt } from "@/components/patterns/access-receipt";
import { PriceSummary } from "@/components/patterns/price-summary";
import { StatusBadge } from "@/components/ui/badge";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { sheetsFor } from "@/lib/demo/pricing";
import { actions, cashDue, methodLabel, useNow } from "@/lib/demo/store";
import type { Order } from "@/lib/demo/types";
import { formatPaise, maskPhone, timeAgo } from "@/lib/format";
import { receiptEntries, stamp } from "@/app/orders/track/order-tracking";

type Tab = "new" | "progress" | "ready" | "done";

const TABS: { key: Tab; label: string; statuses: Order["status"][] }[] = [
  { key: "new", label: "New", statuses: ["paid"] },
  { key: "progress", label: "Active", statuses: ["accepted", "printing"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
  { key: "done", label: "Done", statuses: ["completed", "cancelled"] },
];

const STEPS: { status: Order["status"]; label: string }[] = [
  { status: "paid", label: "New" },
  { status: "accepted", label: "Accepted" },
  { status: "printing", label: "Printing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Collected" },
];

const NEXT_STEP: Record<Order["status"], { title: string; text: string }> = {
  paid: { title: "Review and accept", text: "Check the files and settings below, then accept the order or decline it with a reason." },
  accepted: { title: "Send it to a printer", text: "Pick a printer that can do these settings." },
  printing: { title: "Printing", text: "Mark the order ready once every copy is out." },
  ready: { title: "Hand it over", text: "Scan the pickup QR on the customer's order ticket, or ask for their 4-digit code." },
  completed: { title: "Order complete", text: "Collected and paid. The customer's files have been removed." },
  cancelled: { title: "Order cancelled", text: "The payment was refunded and the files were removed." },
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function OrderListItem({ order, selected, onSelect, now }: { order: Order; selected: boolean; onSelect: () => void; now: number }) {
  const pages = order.items.reduce((n, i) => n + i.pages, 0);
  const colour = order.items.some((i) => i.settings.colour === "colour");
  const minutes = now ? Math.round((now - Date.parse(order.payment.paidAt)) / 60_000) : 0;
  const late = order.status === "paid" && minutes >= 10;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "group relative grid w-full grid-cols-[auto_1fr_auto] gap-x-3 px-4 py-3.5 text-left transition-colors duration-200 focus-visible:-outline-offset-2",
        selected ? "bg-brand-tint" : "hover:bg-hover",
      )}
    >
      {selected ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" /> : null}
      <span aria-hidden className={cn("flex size-9 items-center justify-center rounded-full text-caption font-semibold transition-all duration-200 group-hover:scale-105", selected ? "bg-brand text-on-brand" : "bg-sunken text-ink-2 group-hover:bg-brand-tint group-hover:text-brand-ink")}>
        {initials(order.customer.name)}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-body font-semibold text-ink">{order.customer.name.split(" ")[0]}</span>
          <span className="font-mono text-caption text-ink-muted">{order.number}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-small text-ink-muted">
          {order.items.length} {order.items.length === 1 ? "file" : "files"} · {pages} {pages === 1 ? "page" : "pages"}
          {colour ? <Palette className="size-3.5 text-st-printing-ink" aria-label="Includes colour" /> : null}
          {order.note ? <MessageSquareText className="size-3.5" aria-label="Has a note" /> : null}
          {cashDue(order) ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-warning-tint px-1.5 text-caption font-medium text-warning-ink">
              <Banknote className="size-3.5" aria-hidden />
              Cash
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block">
          <StatusBadge status={order.status} mode="physical" size="sm" />
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="font-display text-body-lg font-bold tracking-[-0.01em] tabular text-ink">{formatPaise(order.totalPaise)}</span>
        <span className={cn("text-caption tabular", late ? "font-medium text-warning-ink" : "text-ink-muted")}>
          {now ? timeAgo(new Date(order.payment.paidAt), new Date(now)) : ""}
        </span>
      </span>
    </button>
  );
}

/** A small sheet of paper, as it flies between steps. */
function FlyingSheet() {
  return (
    <span className="flex h-[22px] w-[17px] flex-col gap-[3px] rounded-[3px] border border-brand/40 bg-white px-[3px] pt-[4px] shadow-[0_6px_14px_-4px_rgb(29_78_216/0.55)]">
      <span className="h-[2px] w-full rounded-full bg-brand/70" />
      <span className="h-[2px] w-3/4 rounded-full bg-brand/40" />
      <span className="h-[2px] w-full rounded-full bg-brand/40" />
    </span>
  );
}

function Progress({ order }: { order: Order }) {
  const current = STEPS.findIndex((s) => s.status === order.status);
  // When the order moves forward, a sheet travels along the connector into the new step.
  const [shown, setShown] = React.useState(current);
  const [hop, setHop] = React.useState<{ to: number; n: number } | null>(null);
  if (shown !== current) {
    setShown(current);
    setHop(current > shown ? { to: current, n: (hop?.n ?? 0) + 1 } : null);
  }
  return (
    <ol className="flex items-center gap-1" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i < current || order.status === "completed";
        const active = i === current && order.status !== "completed";
        const arriving = hop?.to === i;
        const travelling = hop?.to === i + 1;
        return (
          <li key={step.status} className={cn("flex items-center gap-1", i < STEPS.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
            <span className="flex flex-col items-center gap-1.5">
              <span
                key={arriving ? `pop-${hop?.n}` : "still"}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-caption font-semibold",
                  done && "bg-brand text-on-brand",
                  active && "bg-brand-tint text-brand-ink ring-2 ring-brand",
                  !done && !active && "bg-sunken text-ink-faint",
                  arriving && "step-pop",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-caption", active ? "font-semibold text-ink" : done ? "text-ink-2" : "text-ink-muted")}>{step.label}</span>
            </span>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className="relative mb-5 h-0.5 flex-1 rounded-full bg-rule">
                {done ? <span key={travelling ? `fill-${hop?.n}` : "fill"} className={cn("absolute inset-0 rounded-full bg-brand", travelling && "step-fill")} /> : null}
                {travelling ? (
                  <span key={`sheet-${hop?.n}`} className="paper-travel">
                    <FlyingSheet />
                  </span>
                ) : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const STEP_ICON: Partial<Record<Order["status"], { icon: typeof IcOrders; tile: string }>> = {
  paid: { icon: IcAccept, tile: "bg-brand-tint text-brand-ink" },
  accepted: { icon: IcPrinter, tile: "bg-brand-tint text-brand-ink" },
  printing: { icon: IcPrinter, tile: "bg-brand-tint text-brand-ink" },
  ready: { icon: IcHandover, tile: "bg-brand-tint text-brand-ink" },
  completed: { icon: IcReady, tile: "bg-brand-tint text-brand-ink" },
};

function StepIcon({ status }: { status: Order["status"] }) {
  const s = STEP_ICON[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span aria-hidden className={cn("step-pop group flex size-11 shrink-0 items-center justify-center rounded-xl", s.tile)} style={{ animationDelay: "120ms" }}>
      <Icon active={status === "printing"} className="size-6" />
    </span>
  );
}

function Detail({ order, onBack, verifiedByQr }: { order: Order; onBack: () => void; verifiedByQr: boolean }) {
  const { shop, live } = useShop();
  const now = useNow(30_000);
  const next = NEXT_STEP[order.status];
  const sheets = order.items.reduce((n, i) => n + sheetsFor(i.pages, i.settings), 0);
  const cancelledByCustomer = order.rejectReason === "Cancelled by you";
  return (
    <section aria-label={`Order ${order.number}`} className="@container/detail min-w-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-rule bg-paper/95 px-4 py-4 backdrop-blur-sm @2xl/detail:px-6">
        <button type="button" onClick={onBack} className="mb-3 inline-flex w-fit items-center gap-1.5 text-small text-ink-muted hover:text-ink @3xl/shop:hidden">
          <ArrowLeft className="size-4" aria-hidden />
          All orders
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-small font-semibold text-brand-ink">
              {initials(order.customer.name)}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 font-display text-title font-bold tracking-[-0.02em] text-ink">
                {order.customer.name.split(" ")[0]}
                <span className="font-mono text-small font-normal text-ink-muted">{order.number}</span>
              </p>
              <p className="text-small text-ink-muted">
                {maskPhone(order.customer.phone)} · placed {now ? timeAgo(new Date(order.payment.paidAt), new Date(now)) : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-headline font-extrabold leading-none tracking-[-0.03em] tabular text-ink">{formatPaise(order.totalPaise)}</p>
            <p className="text-caption text-ink-muted">
              {order.payment.method === "cash"
                ? cashDue(order)
                  ? "Cash due at pickup"
                  : "Paid in cash"
                : `Paid by ${methodLabel(order.payment.method)}`}{" "}
              · {sheets} sheets
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5 @2xl/detail:px-6">
        {order.status !== "cancelled" ? <Progress order={order} /> : null}

        <div
          key={order.status}
          className={cn(
            "enter flex flex-col gap-4 rounded-xl border p-5",
            order.status === "cancelled"
              ? "border-rule bg-sunken"
              : order.status === "completed"
                ? "border-st-ready/30 bg-st-ready-tint/50"
                : "border-brand/25 bg-brand-tint/50",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3.5">
              <StepIcon status={order.status} />
              <div className="min-w-0">
              <h2 className="font-display text-title font-bold tracking-[-0.02em] text-ink">{next.title}</h2>
              <p className="mt-0.5 text-small text-ink-2">
                {order.status === "cancelled"
                  ? `${cancelledByCustomer ? "Cancelled by the customer" : `You declined it${order.rejectReason ? `: ${order.rejectReason}` : ""}`}. ${next.text}`
                  : order.status === "completed" && order.completedAt
                    ? `Collected ${stamp(order.completedAt, now)}. ${next.text}`
                    : next.text}
              </p>
              </div>
            </div>
            {order.status === "paid" ? <StatusActions order={order} live={live} /> : null}
          </div>
          {order.status !== "paid" ? <StatusActions order={order} live={live} verifiedByQr={verifiedByQr} /> : null}
          {order.review ? (
            <div className="rounded-lg border border-[#f5a524]/30 bg-surface p-4">
              <p className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">Customer&rsquo;s review</p>
              <ReviewQuote review={order.review} name={order.customer.name.split(" ")[0]} />
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 @3xl/detail:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {order.note ? (
              <Callout tone="info" icon={MessageSquareText} title="Note from the customer">
                {order.note}
              </Callout>
            ) : null}
            <div>
              <h3 className="mb-2 text-small font-medium text-ink-muted">
                {order.items.length} {order.items.length === 1 ? "file" : "files"} · printed as the customer chose
              </h3>
              <FileList order={order} shop={shop} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="rounded-lg border border-rule bg-surface p-4">
              <h3 className="mb-3 text-small font-medium text-ink-muted">Price</h3>
              <PriceSummary lines={order.lines} totalPaise={order.totalPaise} />
            </div>
            <div className="rounded-lg border border-rule bg-surface px-4 pt-3">
              <h3 className="text-small font-medium text-ink-muted">Customer&rsquo;s access receipt</h3>
              <AccessReceipt entries={receiptEntries(order, now)} printMode="physical" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Orders() {
  const { orders } = useShop();
  const params = useSearchParams();
  const now = useNow(30_000);
  const requestedTab = params.get("tab") as Tab | null;
  const [tab, setTab] = React.useState<Tab>(TABS.some((t) => t.key === requestedTab) ? requestedTab! : "new");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("order"));
  const [showDetailOnPhone, setShowDetailOnPhone] = React.useState(Boolean(params.get("order")));
  const [verifiedId, setVerifiedId] = React.useState<string | null>(null);

  /** A pickup QR scanned from the Ready list. Returns an error message, or null when handled. */
  const onScanned = (id: string): string | null => {
    const order = orders.find((o) => o.id === id);
    if (!order) return "That QR isn't for an order at this shop.";
    if (order.status === "completed") return `${order.number} has already been collected.`;
    if (order.status !== "ready") return `${order.number} isn't ready for pickup yet.`;
    setSelectedId(order.id);
    setShowDetailOnPhone(true);
    if (cashDue(order)) {
      setVerifiedId(order.id);
      toast.info(`QR matches ${order.number}. Collect ${formatPaise(order.totalPaise)} in cash to finish.`);
    } else if (actions.completeOrder(order.id, { qrOrderId: order.id })) {
      toast.success(`${order.number} handed over to ${order.customer.name.split(" ")[0]}`);
    }
    return null;
  };

  const statuses = TABS.find((t) => t.key === tab)!.statuses;
  const q = query.trim().toLowerCase();
  const inTab = orders
    .filter((o) => statuses.includes(o.status))
    .filter((o) => !q || o.number.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q))
    .sort((a, b) => (tab === "new" ? (a.payment.paidAt > b.payment.paidAt ? 1 : -1) : a.payment.paidAt < b.payment.paidAt ? 1 : -1));
  const selected = orders.find((o) => o.id === selectedId) ?? inTab[0];
  // Pin the order on screen, so it stays put (and shows its progress) after you act on it.
  if (!selectedId && selected) setSelectedId(selected.id);
  const count = (t: (typeof TABS)[number]) => orders.filter((o) => t.statuses.includes(o.status)).length;

  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label="Order queue"
        className={cn(
          "min-h-0 w-full flex-col border-rule bg-surface @3xl/shop:flex @3xl/shop:w-[22rem] @3xl/shop:shrink-0 @3xl/shop:border-r",
          showDetailOnPhone ? "hidden" : "flex",
        )}
      >
        <div className="flex flex-col gap-3 border-b border-rule px-4 pb-3 pt-4">
          <div className="flex items-baseline justify-between">
            <h1 className="font-display text-headline font-extrabold tracking-[-0.03em] text-ink">Orders</h1>
            <span className="text-small text-ink-muted">{count(TABS[0])} waiting</span>
          </div>
          <Input aria-label="Search orders" placeholder="Order no. or customer" value={query} onChange={(e) => setQuery(e.target.value)} leading={<Search />} />
          <div role="group" aria-label="Filter orders" className="grid grid-cols-4 gap-1 rounded-md bg-sunken p-1">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setTab(t.key);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-[7px] px-1 py-1.5 text-small transition-colors",
                    active ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(15_27_45/0.1)]" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t.label}
                  <span className={cn("text-caption tabular", active ? "text-brand-ink" : "text-ink-faint")}>{count(t)}</span>
                </button>
              );
            })}
          </div>
          {tab === "ready" ? (
            <ScanPickupDialog
              onOrder={onScanned}
              trigger={
                <Button variant="secondary" block className="group justify-start">
                  <IcHandover className="text-brand-ink" />
                  Scan a customer&rsquo;s pickup QR
                </Button>
              }
            />
          ) : null}
        </div>
        <div className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
          {inTab.length ? (
            inTab.map((o) => (
              <OrderListItem
                key={o.id}
                order={o}
                now={now}
                selected={selected?.id === o.id}
                onSelect={() => {
                  setSelectedId(o.id);
                  setShowDetailOnPhone(true);
                }}
              />
            ))
          ) : (
            <EmptyState icon={Inbox} title={tab === "new" ? "No new orders" : "Nothing here"}>
              {tab === "new" ? "New orders appear here as soon as a customer pays." : "Orders move here as you work on them."}
            </EmptyState>
          )}
        </div>
      </section>
      <div className={cn("min-w-0 flex-1 @3xl/shop:flex", showDetailOnPhone ? "flex" : "hidden")}>
        {selected ? (
          <Detail key={selected.id} order={selected} verifiedByQr={verifiedId === selected.id} onBack={() => setShowDetailOnPhone(false)} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={Inbox} title="Select an order">
              Its files, settings and next step appear here.
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}

export function ShopOrders() {
  return (
    <ShopGate>
      <React.Suspense fallback={null}>
        <Orders />
      </React.Suspense>
    </ShopGate>
  );
}
