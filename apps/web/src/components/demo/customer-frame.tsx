"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";
import { CustomerShell, type CustomerNavKey } from "@/components/shell/customer-shell";
import { StatusBadge } from "@/components/ui/badge";
import { formatPaise, timeAgo } from "@/lib/format";
import { shopByCode } from "@/lib/demo/shops";
import type { DemoState, Order } from "@/lib/demo/types";
import { PageSkeleton, useDemoGuard } from "./prototype";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export const isActive = (o: Order) => !["completed", "cancelled"].includes(o.status);

/** Customer pages: sign-in guard and the customer shell. */
export function CustomerFrame({
  active,
  hideNav,
  children,
}: {
  active?: CustomerNavKey;
  hideNav?: boolean;
  children: (state: DemoState) => React.ReactNode;
}) {
  const state = useDemoGuard("customer");
  const activeCount = state?.orders.filter((o) => o.mine && isActive(o)).length;
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col">
        <CustomerShell active={active} hideNav={hideNav} initials={state ? initials(state.customer!.name) : ""} activeOrders={activeCount || undefined}>
          {state ? children(state) : <PageSkeleton />}
        </CustomerShell>
      </div>
    </div>
  );
}

export function OrderCard({ order, now, className }: { order: Order; now: number; className?: string }) {
  const shop = shopByCode(order.shopCode)!;
  return (
    <Link
      href={`/orders/track?id=${order.id}`}
      className={cn("flex items-center gap-3 rounded-lg border border-rule bg-surface p-4 transition-colors hover:bg-hover", className)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} mode="physical" audience="customer" size="sm" />
          <span className="font-mono text-caption text-ink-muted">{order.number}</span>
        </div>
        <p className="mt-2 truncate text-body font-medium text-ink">{shop.name}</p>
        <p className="mt-0.5 truncate text-small text-ink-muted">
          {order.items.length} {order.items.length === 1 ? "file" : "files"} · {formatPaise(order.totalPaise)}
          {now ? ` · ${timeAgo(new Date(order.createdAt), new Date(now))}` : null}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
    </Link>
  );
}
