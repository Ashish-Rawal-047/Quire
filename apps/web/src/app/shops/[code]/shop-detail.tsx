"use client";

import { ArrowLeft, Clock, MapPin, Navigation, Phone, Printer, Star } from "lucide-react";
import Link from "next/link";
import { CustomerFrame } from "@/components/demo/customer-frame";
import { ReviewQuote, reviewStats, Stars } from "@/components/demo/review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { formatPaise } from "@/lib/format";
import { shopByCode } from "@/lib/demo/shops";
import type { PaperSize } from "@/lib/demo/types";

const SIZES: PaperSize[] = ["A4", "A3", "Legal"];

export function ShopDetail({ code }: { code: string }) {
  const shop = shopByCode(code)!;
  return (
    <CustomerFrame active="shops">
      {(state) => {
        const live = state.shops[shop.code];
        const atShop = state.orders.filter((o) => o.shopCode === shop.code);
        const reviewed = atShop.filter((o) => o.review).sort((a, b) => (a.review!.at < b.review!.at ? 1 : -1));
        const stats = reviewStats(atShop);
        const supports = (size: PaperSize, colour: boolean) =>
          live.printers.some((p) => p.sizes.includes(size) && (!colour || p.colour));
        return (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-4 @xl/shell:px-6">
            {/* Top bar: back on the left, the order action on the right (sticks while scrolling). */}
            <div className="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-rule bg-paper/90 px-4 py-2.5 backdrop-blur-md @xl/shell:top-16 @xl/shell:-mx-6 @xl/shell:px-6">
              <Link href="/shops" className="inline-flex shrink-0 items-center gap-1.5 text-small text-ink-muted hover:text-ink">
                <ArrowLeft className="size-4" aria-hidden />
                All shops
              </Link>
              {live.open ? (
                <Button asChild size="md">
                  <Link href={`/order?shop=${shop.code}`}>
                    <Printer aria-hidden />
                    Print at {shop.shortName}
                  </Link>
                </Button>
              ) : (
                <Button size="md" disabled>
                  Not taking orders
                </Button>
              )}
            </div>

            {/* Identity */}
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand text-title font-semibold text-on-brand shadow-[0_8px_20px_-8px_rgb(29_78_216/0.6)]"
              >
                {shop.name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("")}
              </span>
              <div className="min-w-0">
                <h1 className="text-headline font-semibold leading-tight text-ink">{shop.name}</h1>
                <p className="mt-1 text-body text-ink-2">{shop.tagline}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge tone={live.open ? "success" : "neutral"} size="sm">
                    {live.open ? `Open · until ${shop.closesAt}` : `Not taking orders · opens ${shop.opensAt}`}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-small text-ink-muted">
                    <Star className="size-3.5 fill-current text-warning-ink" aria-hidden />
                    <span className="font-medium text-ink-2">{shop.rating}</span> · {shop.reviews} reviews
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            <section aria-label="Location and hours" className="overflow-hidden rounded-lg border border-rule bg-surface">
              <div className="grid @xl/shell:grid-cols-[13rem_1fr]">
                <div aria-hidden className="shop-map relative h-36 border-b border-rule @xl/shell:h-auto @xl/shell:border-b-0 @xl/shell:border-r">
                  <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_6px_14px_-4px_rgb(29_78_216/0.7)]">
                      <Printer className="size-4" />
                    </span>
                    <span className="-mt-1 size-2.5 rotate-45 bg-brand" />
                  </span>
                  <span className="absolute bottom-2 left-2 rounded-sm bg-surface/90 px-1.5 py-0.5 text-caption font-medium text-ink-2">
                    {shop.area}
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-body font-medium text-ink">{shop.address}</p>
                      <p className="text-small text-ink-2">
                        {shop.area}, {shop.city} {shop.pincode}
                      </p>
                      <p className="mt-0.5 text-small text-ink-muted">{shop.distanceKm} km from Lajpat Nagar II</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                    <p className="text-small text-ink-2">
                      {shop.days}, {shop.opensAt} – {shop.closesAt}
                      <span className="block text-ink-muted">Usually ready in about {shop.sampleReadyMins} minutes</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="secondary">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.address}, ${shop.area}, ${shop.city} ${shop.pincode}`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation aria-hidden />
                        Directions
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <a href={`tel:${shop.phone.replace(/\s/g, "")}`}>
                        <Phone aria-hidden />
                        {shop.phone}
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {!live.open ? (
              <Callout tone="warning" title="This shop isn't taking orders right now">
                The owner has paused new orders. Try another shop nearby, or come back later.
              </Callout>
            ) : null}

            <section aria-labelledby="prices-title" className="rounded-lg border border-rule bg-surface">
              <div className="flex items-baseline justify-between px-5 pt-4">
                <h2 id="prices-title" className="text-title-sm font-semibold text-ink">
                  Prices
                </h2>
                <span className="text-small text-ink-muted">per printed side</span>
              </div>
              <table className="mt-2 w-full text-body">
                <thead>
                  <tr className="text-left text-small text-ink-muted">
                    <th className="px-5 py-2 font-medium">Paper</th>
                    <th className="px-5 py-2 text-right font-medium">B&amp;W</th>
                    <th className="px-5 py-2 text-right font-medium">Colour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule border-t border-rule">
                  {SIZES.map((size) => (
                    <tr key={size}>
                      <td className="px-5 py-2.5 text-ink">{size}</td>
                      <td className="px-5 py-2.5 text-right tabular text-ink">
                        {supports(size, false) ? formatPaise(live.prices.perSide[size].bw) : <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular text-ink">
                        {supports(size, true) ? formatPaise(live.prices.perSide[size].colour) : <span className="text-ink-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-5 py-2.5 text-ink">Stapling</td>
                    <td colSpan={2} className="px-5 py-2.5 text-right tabular text-ink">
                      {formatPaise(live.prices.staplePerCopy)} per copy
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="border-t border-rule px-5 py-3 text-small text-ink-muted">
                Double-sided printing costs the same per side and uses half the paper. &ldquo;—&rdquo; means no printer here
                can do it.
              </p>
            </section>

            <section aria-labelledby="services-title" className="flex flex-col gap-3">
              <h2 id="services-title" className="text-title-sm font-semibold text-ink">
                Services and printers
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {shop.services.map((s) => (
                  <Badge key={s} tone="outline" size="sm">
                    {s}
                  </Badge>
                ))}
              </div>
              <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
                {live.printers.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Printer className="size-4 shrink-0 text-ink-muted" aria-hidden />
                    <span className="min-w-0 flex-1 text-small text-ink-2">
                      <span className="font-medium text-ink">{p.name}</span> · {p.colour ? "Colour" : "B&W"} ·{" "}
                      {p.duplex ? "double-sided" : "single-sided"} · {p.sizes.join(", ")}
                    </span>
                    <span className={p.available ? "text-small text-st-ready-ink" : "text-small text-ink-muted"}>
                      {p.available ? "Available" : "Unavailable"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {reviewed.length ? (
              <section aria-labelledby="reviews-title" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h2 id="reviews-title" className="text-title-sm font-semibold text-ink">
                    What customers say
                  </h2>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-small text-ink-muted">
                    <Stars value={Math.round(stats.avg)} />
                    {stats.avg.toFixed(1)} from {stats.count} on Quire
                  </span>
                </div>
                <ul className="grid gap-3 @xl/shell:grid-cols-2">
                  {reviewed.slice(0, 4).map((o) => (
                    <li key={o.id} className="rounded-lg border border-rule bg-surface p-4">
                      <ReviewQuote review={o.review!} name={o.mine ? "You" : o.customer.name.split(" ")[0]} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        );
      }}
    </CustomerFrame>
  );
}
