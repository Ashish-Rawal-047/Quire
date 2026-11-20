"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CountUp } from "@/components/demo/count-up";
import { EarningsChart } from "@/components/demo/earnings-chart";
import { ReviewQuote, reviewStats, Stars } from "@/components/demo/review";
import { useOrigin } from "@/components/demo/shop-qr-card";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { IcHandover, IcOrders, IcPricing, IcPrinter, IcQueue, IcReady } from "@/components/demo/shop-icons";
import { OrderListItem } from "@/app/shop/orders/shop-orders";
import { QrCode } from "@/components/patterns/job-ticket";
import { cn } from "@/lib/cn";
import { shopQrValue } from "@/lib/demo/shop-qr";
import { printProgress, useNow } from "@/lib/demo/store";
import type { Order } from "@/lib/demo/types";
import { formatPaise, timeAgo } from "@/lib/format";

const delay = (i: number) => ({ animationDelay: `${i * 70}ms` }) as React.CSSProperties;

function SectionCard({
  title,
  description,
  action,
  children,
  className,
  style,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id: string;
}) {
  return (
    <section aria-labelledby={id} style={style} className={cn("enter overflow-hidden rounded-xl border border-rule bg-surface", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h2 id={id} className="font-display text-title-sm font-bold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Tone = "new" | "printing" | "ready" | "money";
const TONES: Record<Tone, { tile: string; icon: string; bar: string }> = {
  // Every tile icon uses the brand blue, so the row reads as one set.
  new: { tile: "bg-brand-tint text-brand-ink", icon: "text-brand-ink", bar: "bg-brand" },
  printing: { tile: "bg-brand-tint text-brand-ink", icon: "text-brand-ink", bar: "bg-brand" },
  ready: { tile: "bg-brand-tint text-brand-ink", icon: "text-brand-ink", bar: "bg-brand" },
  money: { tile: "bg-brand-tint text-brand-ink", icon: "text-brand-ink", bar: "bg-brand" },
};

function Stat({
  icon: Icon,
  label,
  value,
  format,
  hint,
  href,
  tone,
  index,
  children,
}: {
  icon: typeof IcOrders;
  label: string;
  value: number;
  format?: (n: number) => string;
  hint: React.ReactNode;
  href?: string;
  tone: Tone;
  index: number;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  const body = (
    <>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100", t.bar)} />
      <span className="flex items-start justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110", t.tile)}>
          <Icon className={cn("size-[22px]", t.icon)} />
        </span>
      </span>
      <span className="mt-1 block font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.035em] tabular text-ink">
        <CountUp value={value} format={format} />
      </span>
      <span className="mt-2 block text-small text-ink-muted">{hint}</span>
      {children}
    </>
  );
  const cls = "enter group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300";
  return href ? (
    <Link href={href} style={delay(index + 1)} className={cn(cls, "hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_18px_32px_-22px_rgb(15_27_45/0.45)]")}>
      {body}
    </Link>
  ) : (
    <div style={delay(index + 1)} className={cls}>
      {body}
    </div>
  );
}

/** Tiny 7-day earnings line for the "Earned today" tile. */
function Sparkline({ orders, now }: { orders: Order[]; now: number }) {
  if (!now) return null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const s = d.getTime();
    return orders
      .filter((o) => o.status === "completed" && o.completedAt && Date.parse(o.completedAt) >= s && Date.parse(o.completedAt) < s + 86_400_000)
      .reduce((n, o) => n + o.totalPaise, 0);
  });
  const max = Math.max(1, ...days);
  const pts = days.map((v, i) => [4 + i * (112 / 6), 30 - (v / max) * 24] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 120 34" className="mt-3 h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L116 34 L4 34 Z`} fill="url(#spark-fill)" className="enter" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="draw" style={{ ["--len" as string]: 200 }} />
      <circle cx={pts[6][0]} cy={pts[6][1]} r="3" fill="var(--brand)" className="live-dot" />
    </svg>
  );
}

function Avatars({ orders }: { orders: Order[] }) {
  if (!orders.length) return null;
  return (
    <span className="mt-3 flex items-center">
      {orders.slice(0, 4).map((o, i) => (
        <span
          key={o.id}
          title={o.customer.name}
          className="-ml-1.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-brand-tint text-caption font-semibold text-brand-ink first:ml-0"
          style={{ zIndex: 10 - i }}
        >
          {o.customer.name.slice(0, 1)}
        </span>
      ))}
      <span className="ml-2 text-caption text-ink-muted">waiting at the counter</span>
    </span>
  );
}

function PrinterTile({ name, model, state, job, progress }: { name: string; model: string; state: "idle" | "printing" | "off"; job?: string; progress: number }) {
  return (
    <li className="group flex flex-col gap-2 rounded-lg border border-rule bg-paper p-3 transition-colors hover:border-brand/25">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", state === "off" ? "bg-sunken text-ink-muted" : "bg-brand-tint text-brand-ink")}>
          <IcPrinter active={state === "printing"} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-ink">{name}</span>
          <span className="block truncate text-caption text-ink-muted">{model}</span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
            state === "printing" ? "bg-brand-tint text-brand-ink" : state === "idle" ? "bg-st-ready-tint text-st-ready-ink" : "bg-sunken text-ink-muted",
          )}
        >
          <span aria-hidden className={cn("size-1.5 rounded-full", state === "printing" ? "live-dot bg-brand" : state === "idle" ? "bg-st-ready" : "bg-ink-faint")} />
          {state === "printing" ? "Printing" : state === "idle" ? "Ready" : "Off"}
        </span>
      </div>
      {state === "printing" ? (
        <div className="flex flex-col gap-1">
          <div className="relative h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label={`${name} progress`} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,var(--brand))] transition-[width] duration-500" style={{ width: `${Math.max(4, progress * 100)}%` }}>
              <div className="shimmer h-full w-full rounded-full" />
            </div>
          </div>
          <span className="flex justify-between text-caption text-ink-muted">
            <span className="font-mono">{job}</span>
            <span className="tabular">{Math.round(progress * 100)}%</span>
          </span>
        </div>
      ) : null}
    </li>
  );
}

function ShopOverviewContent() {
  const { shop, live, orders, ownerName } = useShop();
  const now = useNow(1000);
  const router = useRouter();
  const origin = useOrigin();
  const startOfDay = now ? new Date(now).setHours(0, 0, 0, 0) : 0;
  const completed = orders.filter((o) => o.status === "completed");
  const today = completed.filter((o) => Date.parse(o.completedAt!) >= startOfDay);
  const week = completed.filter((o) => now - Date.parse(o.completedAt!) < 7 * 86_400_000);
  const sum = (list: typeof orders) => list.reduce((n, o) => n + o.totalPaise, 0);
  const fresh = orders.filter((o) => o.status === "paid").sort((a, b) => (a.payment.paidAt > b.payment.paidAt ? 1 : -1));
  const working = orders.filter((o) => o.status === "accepted" || o.status === "printing");
  const printing = working.filter((o) => o.status === "printing");
  const ready = orders.filter((o) => o.status === "ready");
  const hour = now ? new Date(now).getHours() : 12;
  const stats = reviewStats(orders);
  const reviews = orders.filter((o) => o.review).sort((a, b) => (a.review!.at < b.review!.at ? 1 : -1));
  const oldest = fresh[0];

  const glance = [
    fresh.length ? `${fresh.length} new ${fresh.length === 1 ? "order" : "orders"} waiting` : "No new orders",
    printing.length ? `${printing.length} on the printers` : null,
    ready.length ? `${ready.length} ready for pickup` : null,
  ].filter(Boolean);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
        {/* Hero */}
        <section
          aria-label={shop.name}
          className="enter relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#1e3a8a_100%)] p-6 text-white shadow-[0_28px_56px_-34px_rgb(29_78_216/0.95)] @3xl/shop:p-8"
        >
          <span aria-hidden className="dot-grid absolute inset-0" />
          <span aria-hidden className="float-slow absolute -right-16 -top-20 size-72 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-24 right-40 size-56 rounded-full bg-white/[0.06]" />
          <div className="relative flex flex-col gap-6 @4xl/shop:flex-row @4xl/shop:items-center @4xl/shop:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 text-small font-medium text-white/80">
                {hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, {ownerName.split(" ")[0]}
                {now ? (
                  <>
                    <span aria-hidden className="size-1 rounded-full bg-white/50" />
                    {new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </>
                ) : null}
              </p>
              <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">{shop.name}</h1>
              <p className="mt-4 text-body-lg font-medium text-white">{glance.join(" · ")}.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/shop/orders?tab=new"
                  className="group inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-body font-semibold text-brand-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-0.5"
                >
                  <IcOrders active className="size-5" />
                  Open orders
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link
                  href="/shop/orders?tab=ready"
                  className="group inline-flex h-10 items-center gap-2 rounded-md bg-white/10 px-4 text-body font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/20"
                >
                  <IcHandover inverse className="size-5" />
                  Hand over an order
                </Link>
              </div>
            </div>
            <div className="hidden shrink-0 self-start rounded-xl bg-white p-3 text-[#0f1b2d] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.55)] transition-transform duration-300 hover:-rotate-2 hover:scale-[1.03] @xl/shop:block @4xl/shop:self-center">
              <div className="w-32">
                {origin ? <QrCode value={shopQrValue(shop.code, origin)} label={`QR code for ${shop.name}`} className="rounded-md" /> : <div className="aspect-square rounded-md bg-[#f3f6fc]" />}
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">Scan to order</p>
              <p className="text-center font-mono text-small font-bold tracking-[0.2em]">{shop.code}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 @3xl/shop:grid-cols-4">
          <Stat
            index={0}
            tone="new"
            icon={IcOrders}
            label="New orders"
            value={fresh.length}
            hint={oldest && now ? `Oldest waiting ${timeAgo(new Date(oldest.payment.paidAt), new Date(now)).replace(" ago", "")}` : "All caught up"}
            href="/shop/orders?tab=new"
          />
          <Stat index={1} tone="printing" icon={IcQueue} label="In progress" value={working.length} hint={`${printing.length} printing · ${working.length - printing.length} to print`} href="/shop/orders?tab=progress">
            {working.length ? (
              <span className="mt-3 flex h-1.5 gap-1 overflow-hidden rounded-full" aria-hidden>
                <span className="width-grow rounded-full bg-brand" style={{ flex: printing.length || 0.0001 }} />
                <span className="rounded-full bg-brand-tint" style={{ flex: working.length - printing.length || 0.0001 }} />
              </span>
            ) : null}
          </Stat>
          <Stat index={2} tone="ready" icon={IcReady} label="Ready for pickup" value={ready.length} hint="Waiting for customers" href="/shop/orders?tab=ready">
            <Avatars orders={ready} />
          </Stat>
          <Stat index={3} tone="money" icon={IcPricing} label="Earned today" value={sum(today)} format={formatPaise} hint={`${formatPaise(sum(week))} this week`}>
            <Sparkline orders={orders} now={now} />
          </Stat>
        </div>

        <div className="grid gap-6 @4xl/shop:grid-cols-[1.45fr_1fr]">
          <div className="flex min-w-0 flex-col gap-6">
            <SectionCard
              id="new-title"
              title="Needs your attention"
              description="Oldest first. Open one to accept or decline it."
              style={delay(5)}
              action={
                <Link href="/shop/orders" className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-brand-tint px-3 py-1 text-small font-semibold text-brand-ink transition-colors hover:bg-brand hover:text-on-brand">
                  All orders
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              }
            >
              <div className="mt-4 divide-y divide-rule border-t border-rule">
                {fresh.length ? (
                  fresh.slice(0, 5).map((o) => (
                    <OrderListItem key={o.id} order={o} now={now} selected={false} onSelect={() => router.push(`/shop/orders?order=${o.id}`)} />
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-st-ready-tint text-st-ready-ink">
                      <IcReady className="size-6" />
                    </span>
                    <p className="font-display text-body-lg font-bold text-ink">All caught up</p>
                    <p className="text-small text-ink-muted">New orders appear here the moment a customer sends one.</p>
                  </div>
                )}
              </div>
            </SectionCard>

            <section aria-label="Earnings" style={delay(6)} className="enter rounded-xl border border-rule bg-surface p-5">
              <EarningsChart orders={orders} now={now} />
            </section>

            <SectionCard id="done-title" title="Recently completed" description="Latest handovers" style={delay(7)}>
              <ul className="flex flex-col px-3 pb-3 pt-3">
                {completed
                  .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
                  .slice(0, 5)
                  .map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/shop/orders?order=${o.id}&tab=done`}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover"
                      >
                        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-caption font-semibold text-ink-2 transition-colors group-hover:bg-brand-tint group-hover:text-brand-ink">
                          {o.customer.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-small font-medium text-ink">
                            {o.customer.name.split(" ")[0]}
                            {o.review ? <Stars value={o.review.stars} /> : null}
                          </span>
                          <span className="block truncate font-mono text-caption text-ink-muted">
                            {o.number} · {new Date(o.completedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </span>
                        <span className="text-small font-semibold tabular text-ink">{formatPaise(o.totalPaise)}</span>
                        <ArrowRight className="size-4 -translate-x-1 text-ink-faint opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  ))}
              </ul>
            </SectionCard>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <SectionCard
              id="printers-title"
              title="Printers"
              description={`${live.printers.filter((p) => p.available).length} of ${live.printers.length} available`}
              style={delay(6)}
              action={
                <Link href="/shop/printers" className="text-small font-semibold text-brand-ink hover:underline">
                  Manage
                </Link>
              }
            >
              <ul className="flex flex-col gap-2 p-5 pt-4">
                {live.printers.map((p) => {
                  const job = orders.find((o) => o.status === "printing" && o.printJob?.printerId === p.id);
                  return (
                    <PrinterTile
                      key={p.id}
                      name={p.name}
                      model={p.model}
                      state={!p.available ? "off" : job ? "printing" : "idle"}
                      job={job?.number}
                      progress={job ? printProgress(job, now) : 0}
                    />
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard id="reviews-title" title="Customer reviews" description="What people say after pickup" style={delay(8)}>
              {stats.count ? (
                <div className="flex flex-col gap-5 p-5 pt-4">
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.04em] text-ink">{stats.avg.toFixed(1)}</p>
                      <Stars value={Math.round(stats.avg)} className="mt-1.5" />
                      <p className="mt-1 text-caption text-ink-muted">{stats.count} reviews</p>
                    </div>
                    <ul className="flex min-w-0 flex-1 flex-col gap-1.5" aria-label="Ratings breakdown">
                      {stats.dist.map((d, i) => (
                        <li key={d.stars} className="flex items-center gap-2 text-caption text-ink-muted">
                          <span className="w-3 tabular">{d.stars}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                            <span
                              className="width-grow block h-full rounded-full bg-[#f5a524]"
                              style={{ width: `${(d.count / stats.count) * 100}%`, animationDelay: `${300 + i * 80}ms` }}
                            />
                          </span>
                          <span className="w-4 text-right tabular">{d.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-4 border-t border-rule pt-4">
                    {reviews.slice(0, 2).map((o) => (
                      <ReviewQuote key={o.id} review={o.review!} name={o.customer.name.split(" ")[0]} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-small text-ink-muted">Reviews appear here once customers rate their orders.</p>
              )}
            </SectionCard>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopOverview() {
  return (
    <ShopGate>
      <ShopOverviewContent />
    </ShopGate>
  );
}
