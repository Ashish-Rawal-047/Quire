"use client";

import { ArrowLeft, CheckCircle2, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { CustomerFrame } from "@/components/demo/customer-frame";
import { DocThumb } from "@/components/demo/doc-preview";
import { AccessReceipt, type AccessEntry } from "@/components/patterns/access-receipt";
import { ReviewPrompt } from "@/components/demo/review";
import { JobTicket } from "@/components/patterns/job-ticket";
import { OrderTimeline, type TimelineEvent } from "@/components/patterns/order-timeline";
import { PriceSummary } from "@/components/patterns/price-summary";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Callout, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { describeSettings, sheetsFor } from "@/lib/demo/pricing";
import { shopByCode } from "@/lib/demo/shops";
import { actions, cashDue, methodLabel, printProgress, useNow } from "@/lib/demo/store";
import type { Order } from "@/lib/demo/types";
import { cn } from "@/lib/cn";
import { formatClock, formatPaise } from "@/lib/format";
import type { OrderStatus } from "@/lib/status";

const STAGES: OrderStatus[] = ["paid", "accepted", "printing", "ready", "completed"];

export function stamp(iso: string, now: number): string {
  const d = new Date(iso);
  const sameDay = now && new Date(now).toDateString() === d.toDateString();
  return sameDay ? formatClock(d) : `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${formatClock(d)}`;
}

export function receiptEntries(order: Order, now: number): AccessEntry[] {
  return order.events.map((e) => ({ action: e.action, actor: e.actor, detail: e.detail, at: stamp(e.at, now) }));
}

function timelineEvents(order: Order, now: number): Partial<Record<OrderStatus, TimelineEvent>> {
  const at = { paid: order.payment.paidAt, accepted: order.acceptedAt, printing: order.printingAt, ready: order.readyAt, completed: order.completedAt };
  const out: Partial<Record<OrderStatus, TimelineEvent>> = {};
  for (const s of STAGES) {
    const t = at[s as keyof typeof at];
    if (t) out[s] = { status: s, at: stamp(t, now) };
  }
  if (order.status === "printing") out.printing = { ...out.printing!, note: `Printing on ${order.printJob?.printerName}` };
  if (order.status === "ready") out.ready = { ...out.ready!, note: "Show your pickup code at the counter." };
  return out;
}

function Tracking() {
  // The order id is in the query string (/orders/track?id=…): order ids are created in the
  // browser, so they cannot be pre-built as /orders/<id> pages in a static export.
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const placed = params.get("placed") === "1";
  const now = useNow(1000);

  return (
    <CustomerFrame active="orders">
      {(state) => {
        const order = state.orders.find((o) => o.id === id && o.mine);
        if (!order) {
          return (
            <EmptyState icon={ReceiptText} title="Order not found" action={<Button asChild variant="secondary"><Link href="/orders">Your orders</Link></Button>}>
              It may have been placed in another browser. Demo data is kept per browser.
            </EmptyState>
          );
        }
        const shop = shopByCode(order.shopCode)!;
        const progress = printProgress(order, now);
        const sheets = order.items.reduce((n, i) => n + sheetsFor(i.pages, i.settings), 0);
        const showTicket = ["paid", "accepted", "printing", "ready"].includes(order.status);

        return (
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-4 @xl/shell:px-6">
            <Link href="/orders" className="inline-flex w-fit items-center gap-1.5 text-small text-ink-muted hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden />
              Your orders
            </Link>

            {placed && order.status === "paid" ? (
              <Callout
                tone="success"
                icon={CheckCircle2}
                title={order.payment.method === "cash" ? `Order placed · sent to ${shop.name}` : `Payment confirmed · sent to ${shop.name}`}
              >
                {order.payment.method === "cash"
                  ? `Pay ${formatPaise(order.totalPaise)} in cash when you collect. We'll update this page as soon as the shop accepts your order.`
                  : "We'll update this page as soon as the shop accepts your order."}
              </Callout>
            ) : null}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} mode="physical" audience="customer" />
                <span className="font-mono text-small text-ink-muted">{order.number}</span>
              </div>
              <h1 className="mt-2 text-title font-semibold text-ink">{shop.name}</h1>
              <p className="text-small text-ink-muted">
                {shop.address}, {shop.area} · {shop.phone}
              </p>
            </div>

            {order.status === "cancelled" ? (
              <Callout tone="neutral" title={order.rejectReason === "Cancelled by you" ? "You cancelled this order" : "The shop declined this order"}>
                {order.rejectReason && order.rejectReason !== "Cancelled by you" ? `Reason: ${order.rejectReason}. ` : null}
                {order.payment.method === "cash"
                  ? "You were paying in cash, so nothing was charged."
                  : `A refund of ${formatPaise(order.totalPaise)} was issued to your ${order.payment.method === "upi" ? "UPI app" : "card"}.`}
              </Callout>
            ) : null}

            <div className="grid gap-8 @3xl/shell:grid-cols-[1fr_22rem]">
              <div className="flex min-w-0 flex-col gap-6">
                {order.status === "ready" ? (
                  <div className="flex flex-col gap-2 @3xl/shell:hidden">
                    <JobTicket
                      orderNumber={order.number}
                      pickupCode={order.pickupCode}
                      pickupToken={`quire:pickup:${order.id}`}
                      shopName={shop.name}
                      shopArea={`${shop.area}, ${shop.city}`}
                      status={order.status}
                      summary={`${order.items.length} ${order.items.length === 1 ? "file" : "files"} · ${sheets} sheets`}
                      totalPaise={order.totalPaise}
                      protectedMode={false}
                      printMode="physical"
                      payNote={cashDue(order) ? `Pay ${formatPaise(order.totalPaise)} in cash at pickup` : undefined}
                    />
                  </div>
                ) : null}
                {order.status === "completed" ? <ReviewPrompt order={order} variant="card" /> : null}
                {order.status !== "cancelled" ? (
                  <section aria-label="Progress" className="rounded-lg border border-rule bg-surface p-5">
                    <OrderTimeline current={order.status} mode="physical" events={timelineEvents(order, now)} />
                    {order.status === "printing" ? (
                      <div className="mt-5 flex flex-col gap-2 border-t border-rule pt-4">
                        <div className="flex items-center justify-between gap-3 text-small">
                          <span className="text-ink-2">Printing {sheets} sheets</span>
                        </div>
                        <ProgressBar value={progress * 100} label="Print progress" />
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {order.status === "paid" ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="danger-ghost" className="self-start">
                        Cancel order
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      title="Cancel this order?"
                      description="The shop hasn't accepted it yet. Your payment will be refunded."
                      footer={
                        <>
                          <DialogClose asChild>
                            <Button variant="secondary">Keep order</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button variant="danger" onClick={() => actions.cancelOrder(order.id)}>
                              Cancel order
                            </Button>
                          </DialogClose>
                        </>
                      }
                    />
                  </Dialog>
                ) : null}

                <section aria-labelledby="files-title" className="flex flex-col gap-3">
                  <h2 id="files-title" className="text-title-sm font-semibold text-ink">
                    Files and settings
                  </h2>
                  <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
                    {order.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-14 w-11 shrink-0 overflow-hidden rounded-sm border border-rule">
                          {order.filesRemoved ? <div className="h-full w-full bg-sunken" /> : <DocThumb item={it} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-body font-medium text-ink">{it.name}</p>
                          <p className="text-small text-ink-muted">{describeSettings(it.pages, it.settings)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {order.note ? <p className="text-small text-ink-muted">Your note: &ldquo;{order.note}&rdquo;</p> : null}
                </section>

                <section aria-labelledby="receipt-title" className="rounded-lg border border-rule bg-surface px-4 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="receipt-title" className="text-title-sm font-semibold text-ink">
                      Access receipt
                    </h2>
                    <span className="text-small text-ink-muted">Everything that happened to your files</span>
                  </div>
                  <AccessReceipt entries={receiptEntries(order, now)} printMode="physical" />
                </section>
              </div>

              <div className="flex flex-col gap-6">
                {showTicket ? (
                  <div className={cn("flex flex-col gap-2", order.status === "ready" && "hidden @3xl/shell:flex")}>
                    <JobTicket
                      orderNumber={order.number}
                      pickupCode={order.pickupCode}
                      pickupToken={`quire:pickup:${order.id}`}
                      shopName={shop.name}
                      shopArea={`${shop.area}, ${shop.city}`}
                      status={order.status}
                      summary={`${order.items.length} ${order.items.length === 1 ? "file" : "files"} · ${sheets} sheets`}
                      totalPaise={order.totalPaise}
                      protectedMode={false}
                      printMode="physical"
                      payNote={cashDue(order) ? `Pay ${formatPaise(order.totalPaise)} in cash at pickup` : undefined}
                    />
                  </div>
                ) : null}
                <section aria-labelledby="price-title" className="rounded-lg border border-rule bg-surface p-5">
                  <h2 id="price-title" className="mb-3 text-title-sm font-semibold text-ink">
                    Payment
                  </h2>
                  <PriceSummary lines={order.lines} totalPaise={order.totalPaise} />
                  <p className="mt-3 text-small text-ink-muted">
                    {order.payment.method === "cash"
                      ? order.payment.cashCollectedAt
                        ? "Paid in cash at pickup"
                        : "Cash at pickup · not paid yet"
                      : `Paid by ${methodLabel(order.payment.method)} · ref ${order.payment.ref}`}
                  </p>
                </section>
              </div>
            </div>
          </div>
        );
      }}
    </CustomerFrame>
  );
}

export function OrderTracking() {
  return (
    <React.Suspense fallback={<div className="min-h-full bg-paper" />}>
      <Tracking />
    </React.Suspense>
  );
}
