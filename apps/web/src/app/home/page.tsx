"use client";

import { ArrowRight } from "lucide-react";
import { IconShop } from "@/components/demo/illustrated-icons";
import Link from "next/link";
import { CustomerFrame, isActive, OrderCard } from "@/components/demo/customer-frame";
import { ShopRow } from "@/components/patterns/shop-row";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SHOPS, toShopRow } from "@/lib/demo/shops";
import { useNow } from "@/lib/demo/store";

function greeting(now: number) {
  if (!now) return "Hello";
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function CustomerHome() {
  const now = useNow(30_000);
  const router = useRouter();
  return (
    <CustomerFrame active="home">
      {(state) => {
        const mine = state.orders.filter((o) => o.mine);
        const active = mine.filter(isActive);
        const recent = mine.filter((o) => !isActive(o)).slice(0, 3);
        const nearby = [...SHOPS].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
        return (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-6 @xl/shell:px-6">
            <div>
              <p className="text-small text-ink-muted">
                {greeting(now)}, {state.customer!.name.split(" ")[0]}
              </p>
              <h1 className="mt-1 text-headline font-semibold text-ink">What are we printing today?</h1>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#2563eb_0%,#1d4ed8_55%,#1e40af_100%)] p-5 text-on-brand shadow-[0_18px_40px_-20px_rgb(29_78_216/0.8)] @xl/shell:p-7">
              <span aria-hidden className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
              <span aria-hidden className="absolute -bottom-16 right-24 size-32 rounded-full bg-white/5" />
              <IconShop inverse className="absolute right-4 top-4 size-16 rotate-6 @xl/shell:right-8 @xl/shell:top-6 @xl/shell:size-24" />
              <div className="relative max-w-md pr-16 @xl/shell:pr-0">
                <p className="text-title font-bold tracking-[-0.02em]">Start a new print order</p>
                <p className="mt-1.5 text-small text-on-brand/85">
                  Choose a shop, upload a PDF or photo, pick your settings and see the price before you pay.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="relative mt-5 border-transparent bg-white text-brand shadow-[0_6px_16px_-8px_rgb(15_27_45/0.5)] hover:bg-white/90">
                <Link href="/shops">
                  Choose a shop
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>

            {active.length ? (
              <section aria-labelledby="active-title" className="flex flex-col gap-3">
                <h2 id="active-title" className="text-title-sm font-semibold text-ink">
                  In progress
                </h2>
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} />
                ))}
              </section>
            ) : null}

            <section aria-labelledby="near-title">
              <div className="flex items-baseline justify-between">
                <h2 id="near-title" className="text-title-sm font-semibold text-ink">
                  Shops near Lajpat Nagar
                </h2>
                <Link href="/shops" className="text-small font-medium text-brand-ink hover:underline">
                  See all {SHOPS.length}
                </Link>
              </div>
              <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
                {nearby.map((s) => (
                  <ShopRow key={s.code} shop={toShopRow(s, state.shops[s.code])} onSelect={() => router.push(`/shops/${s.code}`)} />
                ))}
              </div>
            </section>

            {recent.length ? (
              <section aria-labelledby="recent-title" className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 id="recent-title" className="text-title-sm font-semibold text-ink">
                    Recent orders
                  </h2>
                  <Link href="/orders" className="text-small font-medium text-brand-ink hover:underline">
                    Order history
                  </Link>
                </div>
                {recent.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} />
                ))}
              </section>
            ) : null}

          </div>
        );
      }}
    </CustomerFrame>
  );
}
