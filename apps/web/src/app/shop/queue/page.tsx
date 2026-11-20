"use client";

import { ArrowRight, Printer } from "lucide-react";
import { IcPrinter } from "@/components/demo/shop-icons";
import Link from "next/link";
import { printersFor } from "@/components/demo/order-actions";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { describeSettings } from "@/lib/demo/pricing";
import { printProgress, useNow } from "@/lib/demo/store";

function QueuePageContent() {
  const { live, orders } = useShop();
  const now = useNow(500);
  const waiting = orders.filter((o) => o.status === "accepted").sort((a, b) => (a.acceptedAt! > b.acceptedAt! ? 1 : -1));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-headline font-extrabold tracking-[-0.03em] text-ink">Printing queue</h1>
            <p className="mt-1 text-small text-ink-muted">What each printer is doing, and accepted orders waiting to print.</p>
          </div>
        </div>

        <div className="grid gap-4 @3xl/shop:grid-cols-2">
          {live.printers.map((p) => {
            const job = orders.find((o) => o.status === "printing" && o.printJob?.printerId === p.id);
            const progress = job ? printProgress(job, now) : 0;
            return (
              <Panel key={p.id} className="group flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-ink">
                      <IcPrinter active={Boolean(job)} className="size-6" />
                    </span>
                    <div>
                      <p className="text-body font-medium text-ink">{p.name}</p>
                      <p className="text-small text-ink-muted">{p.model}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-small font-medium",
                      !p.available ? "text-ink-muted" : job ? "text-st-printing-ink" : "text-st-ready-ink",
                    )}
                  >
                    {!p.available ? "Unavailable" : job ? (progress >= 1 ? "Finished" : "Printing") : "Idle"}
                  </span>
                </div>
                {job ? (
                  <Link href={`/shop/orders?order=${job.id}&tab=progress`} className="flex flex-col gap-2 rounded-md border border-rule bg-paper p-3 hover:bg-hover">
                    <span className="flex items-center justify-between gap-2 text-small">
                      <span className="font-mono text-ink">{job.number}</span>
                      <span className="tabular text-ink-muted">{Math.round(progress * 100)}%</span>
                    </span>
                    <ProgressBar value={progress * 100} label={`${job.number} progress`} />
                  </Link>
                ) : (
                  <p className="text-small text-ink-muted">
                    {p.available ? "Nothing printing." : "Marked unavailable on the Printers page."}
                  </p>
                )}
              </Panel>
            );
          })}
        </div>

        <section aria-labelledby="waiting-title" className="flex flex-col gap-3">
          <h2 id="waiting-title" className="text-title-sm font-semibold text-ink">
            Accepted, waiting to print ({waiting.length})
          </h2>
          {waiting.length ? (
            <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
              {waiting.map((o) => {
                const usable = printersFor(o, live).filter((p) => p.available);
                return (
                  <li key={o.id}>
                    <Link href={`/shop/orders?order=${o.id}&tab=progress`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-hover">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-small font-medium text-ink">{o.number}</span>
                          <StatusBadge status="accepted" mode="physical" size="sm" />
                        </div>
                        <p className="mt-1 truncate text-small text-ink-muted">
                          {o.items.map((i) => describeSettings(i.pages, i.settings)).join(" · ")}
                        </p>
                        <p className="text-caption text-ink-muted">
                          {usable.length ? `Can print on ${usable.map((p) => p.name).join(", ")}` : "No available printer can do this order"}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Printer} title="Nothing waiting">
              Accepted orders appear here until you send them to a printer.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <ShopGate>
      <QueuePageContent />
    </ShopGate>
  );
}
