"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { Order } from "@/lib/demo/types";
import { formatPaise } from "@/lib/format";

type Day = { key: string; label: string; date: string; paise: number; orders: number; today: boolean };

function lastSevenDays(orders: Order[], now: number): Day[] {
  const days: Day[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = d.getTime();
    const end = start + 86_400_000;
    const done = orders.filter((o) => o.status === "completed" && o.completedAt && Date.parse(o.completedAt) >= start && Date.parse(o.completedAt) < end);
    days.push({
      key: d.toISOString(),
      label: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }),
      paise: done.reduce((n, o) => n + o.totalPaise, 0),
      orders: done.length,
      today: i === 0,
    });
  }
  return days;
}

/**
 * Earnings from completed orders, last 7 days. One series, so one hue and no legend (the title
 * names it); a tooltip on each bar; today's value labelled; a table for screen readers.
 */
export function EarningsChart({ orders, now }: { orders: Order[]; now: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const days = now ? lastSevenDays(orders, now) : [];
  const max = Math.max(1, ...days.map((d) => d.paise));
  const total = days.reduce((n, d) => n + d.paise, 0);
  const H = 120;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span>
          <span className="block font-display text-title-sm font-bold tracking-[-0.01em] text-ink">Earnings</span>
          <span className="block text-small text-ink-muted">Last 7 days, from collected orders</span>
        </span>
        <span className="font-display text-title font-extrabold tracking-[-0.02em] tabular text-ink">{formatPaise(total)}</span>
      </figcaption>
      <div className="relative" aria-hidden onMouseLeave={() => setHover(null)}>
        <div className="flex items-end gap-[2px] border-b border-rule" style={{ height: H + 22 }}>
          {days.map((d, i) => {
            const h = d.paise ? Math.max(4, Math.round((d.paise / max) * H)) : 0;
            return (
              <div
                key={d.key}
                className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end px-1.5"
                onMouseEnter={() => setHover(i)}
              >
                {d.today && d.paise ? (
                  <span className="mb-1 text-caption font-medium tabular text-ink-2">{formatPaise(d.paise)}</span>
                ) : null}
                <span
                  className={cn(
                    "bar-grow w-full max-w-9 rounded-t-[6px] transition-[opacity,filter] duration-200",
                    d.today ? "bg-[linear-gradient(180deg,#3b82f6,var(--brand))]" : "bg-brand/45",
                    hover === i && "brightness-110",
                    hover !== null && hover !== i && "opacity-45",
                  )}
                  style={{ height: h, animationDelay: `${i * 60}ms` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {days.map((d) => (
            <span key={d.key} className={cn("flex-1 text-center text-caption", d.today ? "font-medium text-ink-2" : "text-ink-muted")}>
              {d.label}
            </span>
          ))}
        </div>
        {hover !== null && days[hover] ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-caption shadow-overlay"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
          >
            <p className="font-medium text-ink">{days[hover].date}</p>
            <p className="tabular text-ink-2">
              {formatPaise(days[hover].paise)} · {days[hover].orders} {days[hover].orders === 1 ? "order" : "orders"}
            </p>
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>Earnings from completed orders, last 7 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Earnings</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}>
              <td>{d.date}</td>
              <td>{formatPaise(d.paise)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
