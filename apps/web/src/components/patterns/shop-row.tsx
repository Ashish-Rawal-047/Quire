import { ChevronRight, Clock, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/format";
import type { SampleShop } from "@/lib/sample-data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * One shop in a discovery list. Name first, then where it is (street, area, distance), then
 * whether it's open and how fast it is, then what it costs. Rows, not cards: lists of shops are
 * scanned, so each fact sits in the same place on every row. Responds to its own width
 * (container query), not the window.
 */
export function ShopRow({
  shop,
  onSelect,
  selected,
}: {
  shop: SampleShop;
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <div className="@container/row">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "group flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors @md/row:gap-4 @md/row:px-5",
          "hover:bg-hover focus-visible:-outline-offset-2",
          selected && "bg-brand-tint hover:bg-brand-tint",
        )}
      >
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-small font-semibold tracking-wide text-brand-ink"
        >
          {initials(shop.name)}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-body-lg font-semibold leading-snug text-ink">{shop.name}</span>
              <span className="mt-0.5 flex items-start gap-1 text-small text-ink-2">
                <MapPin className="mt-[3px] size-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0">
                  {shop.address ? <span className="text-ink-muted">{shop.address}, </span> : null}
                  {shop.area}, {shop.city} {shop.pincode}
                </span>
              </span>
            </span>
            {typeof shop.distanceKm === "number" ? (
              <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-caption font-medium tabular text-ink-2">
                {shop.distanceKm} km
              </span>
            ) : null}
          </span>

          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", shop.isOpen ? "bg-st-ready" : "bg-ink-faint")} />
              <span className={shop.isOpen ? "font-medium text-st-ready-ink" : "text-ink-2"}>{shop.isOpen ? "Open" : "Closed"}</span>
              {shop.isOpen && shop.closesAt ? <span>until {shop.closesAt}</span> : null}
              {!shop.isOpen && shop.opensAt ? <span>opens {shop.opensAt}</span> : null}
            </span>
            {typeof shop.rating === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-current text-warning-ink" aria-hidden />
                <span className="font-medium text-ink-2">{shop.rating}</span>
              </span>
            ) : null}
            {shop.typicalReadyMins ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />~{shop.typicalReadyMins} min
              </span>
            ) : null}
          </span>

          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="outline" size="sm">
              B&amp;W <span className="tabular text-ink">{formatPaise(shop.bwFromPaise)}</span>
            </Badge>
            <Badge tone="outline" size="sm">
              Colour <span className="tabular text-ink">{formatPaise(shop.colourFromPaise)}</span>
            </Badge>
            <span className="ml-auto hidden items-center gap-1.5 @md/row:inline-flex">
              <span className="font-mono text-caption text-ink-muted">{shop.code}</span>
              <ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
