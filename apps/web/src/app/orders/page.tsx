"use client";

import { ArrowRight, PackageCheck, ReceiptText } from "lucide-react";
import Link from "next/link";
import { CustomerFrame, isActive, OrderCard } from "@/components/demo/customer-frame";
import { ReviewPrompt } from "@/components/demo/review";
import { JobTicket } from "@/components/patterns/job-ticket";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sheetsFor } from "@/lib/demo/pricing";
import { shopByCode } from "@/lib/demo/shops";
import { cashDue, useNow } from "@/lib/demo/store";
import { formatPaise } from "@/lib/format";

export default function OrdersPage() {
  const now = useNow(30_000);
  return (
    <CustomerFrame active="orders">
      {(state) => {
        const mine = state.orders.filter((o) => o.mine);
        const active = mine.filter(isActive);
        const ready = mine.filter((o) => o.status === "ready");
        const past = mine.filter((o) => !isActive(o));
        const spent = past.filter((o) => o.status === "completed").reduce((n, o) => n + o.totalPaise, 0);
        const toReview = past.filter((o) => o.status === "completed" && !o.review);
        const latestToReview = [...toReview].sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1))[0];
        return (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-6 @xl/shell:px-6">
            <div>
              <h1 className="text-headline font-semibold text-ink">Your orders</h1>
              <p className="mt-1 text-small text-ink-muted">
                {mine.length} {mine.length === 1 ? "order" : "orders"} · {formatPaise(spent)} spent
              </p>
            </div>
            {ready.length ? (
              <section aria-labelledby="ready-title" className="flex flex-col gap-4 rounded-lg border border-st-ready/30 bg-st-ready-tint/60 p-4 @xl/shell:p-5">
                <div>
                  <h2 id="ready-title" className="flex items-center gap-2 text-title-sm font-semibold text-st-ready-ink">
                    <PackageCheck className="size-5" aria-hidden />
                    Ready to collect
                  </h2>
                  <p className="mt-0.5 text-small text-ink-2">Show the QR code or pickup code at the counter.</p>
                </div>
                <div className="grid gap-4 @3xl/shell:grid-cols-2">
                  {ready.map((o) => {
                    const shop = shopByCode(o.shopCode)!;
                    return (
                      <div key={o.id} className="flex flex-col gap-2">
                        <JobTicket
                          orderNumber={o.number}
                          pickupCode={o.pickupCode}
                          pickupToken={`quire:pickup:${o.id}`}
                          shopName={shop.name}
                          shopArea={`${shop.area}, ${shop.city}`}
                          status={o.status}
                          summary={`${o.items.length} ${o.items.length === 1 ? "file" : "files"} · ${o.items.reduce((n, i) => n + sheetsFor(i.pages, i.settings), 0)} sheets`}
                          totalPaise={o.totalPaise}
                          protectedMode={false}
                          printMode="physical"
                          payNote={cashDue(o) ? `Pay ${formatPaise(o.totalPaise)} in cash at pickup` : undefined}
                          className="max-w-none"
                        />
                        <Link href={`/orders/track?id=${o.id}`} className="inline-flex items-center gap-1 self-end text-small font-medium text-brand-ink hover:underline">
                          Order details
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {latestToReview ? (
              <section aria-label="Rate your last order" className="enter overflow-hidden rounded-lg border border-brand/20 bg-surface">
                <ReviewPrompt order={latestToReview} />
              </section>
            ) : null}
            {mine.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No orders yet" action={<Button asChild><Link href="/shops">Find a shop</Link></Button>}>
                Your print orders will appear here.
              </EmptyState>
            ) : (
              <Tabs defaultValue={active.length ? "active" : "past"}>
                <TabsList className="gap-5">
                  <TabsTrigger value="active" count={active.length}>
                    In progress
                  </TabsTrigger>
                  <TabsTrigger value="past" count={past.length}>
                    Past{toReview.length ? <span className="ml-1.5 rounded-full bg-[#fff4dc] px-1.5 text-caption font-medium text-[#8a5a00]">{toReview.length} to rate</span> : null}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4 flex flex-col gap-3">
                  {active.length ? (
                    active.map((o) => <OrderCard key={o.id} order={o} now={now} />)
                  ) : (
                    <p className="py-6 text-center text-small text-ink-muted">Nothing in progress.</p>
                  )}
                </TabsContent>
                <TabsContent value="past" className="mt-4 flex flex-col gap-3">
                  {past.map((o) =>
                    o.status === "completed" ? (
                      <div key={o.id} className="overflow-hidden rounded-lg border border-rule bg-surface">
                        <OrderCard order={o} now={now} className="rounded-none border-0" />
                        <div className="border-t border-rule">
                          <ReviewPrompt order={o} />
                        </div>
                      </div>
                    ) : (
                      <OrderCard key={o.id} order={o} now={now} />
                    ),
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        );
      }}
    </CustomerFrame>
  );
}
