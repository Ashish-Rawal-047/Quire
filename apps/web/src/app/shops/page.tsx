"use client";

import { ArrowRight, Hash, Search, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { CustomerFrame } from "@/components/demo/customer-frame";
import { IconFindByName, IconScanQr, IconShopCode } from "@/components/demo/illustrated-icons";
import { QrScanner } from "@/components/demo/qr-scanner";
import { ShopRow } from "@/components/patterns/shop-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { shopFromQrText } from "@/lib/demo/shop-qr";
import { SHOPS, shopByCode, toShopRow } from "@/lib/demo/shops";

const FILTERS = [
  { key: "open", label: "Open now" },
  { key: "a3", label: "A3" },
  { key: "colour", label: "Colour" },
  { key: "binding", label: "Binding" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];
type Mode = "name" | "code" | "qr";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "name", label: "By name", hint: "Search and filter" },
  { value: "code", label: "Shop code", hint: "6 letters at the counter" },
  { value: "qr", label: "Scan QR", hint: "Camera or photo" },
];

/** Three illustrated tiles: how the customer wants to find a shop. Arrow keys move between them. */
function FinderModes({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="radiogroup" aria-label="How to find a shop" className="grid grid-cols-3 gap-2.5">
      {MODES.map((m, i) => {
        const active = m.value === value;
        const Icon = m.value === "name" ? IconFindByName : m.value === "code" ? IconShopCode : IconScanQr;
        return (
          <button
            key={m.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(m.value)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (!dir) return;
              e.preventDefault();
              const next = (i + dir + MODES.length) % MODES.length;
              onChange(MODES[next].value);
              refs.current[next]?.focus();
            }}
            className={cn(
              "group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border px-2 pb-3 pt-4 text-center transition-all duration-200",
              active
                ? "border-brand bg-brand-tint shadow-[0_10px_24px_-16px_rgb(29_78_216/0.8)]"
                : "border-rule bg-surface hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_-18px_rgb(15_27_45/0.5)]",
            )}
          >
            <Icon className={cn("size-11 transition-transform duration-300", active ? "scale-110" : "group-hover:scale-105")} {...(m.value === "qr" ? { animated: active } : {})} />
            <span className="flex flex-col">
              <span className={cn("text-small font-semibold", active ? "text-brand-ink" : "text-ink")}>{m.label}</span>
              <span className="hidden text-caption text-ink-muted @md/shell:block">{m.hint}</span>
            </span>
            {active ? <span aria-hidden className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function CodeFinder({ onFound }: { onFound: (code: string) => void }) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const shop = shopByCode(code.trim().toUpperCase());
        if (shop) onFound(shop.code);
        else setError(`No shop has the code ${code.toUpperCase()}. Check the poster at the counter.`);
      }}
    >
      <div>
        <h2 className="text-title-sm font-semibold text-ink">Enter the shop code</h2>
        <p className="mt-0.5 text-small text-ink-muted">Every Quire shop shows a 6-character code at its counter.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Shop code" error={error ?? undefined} className="w-full max-w-60">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase());
              setError(null);
            }}
            placeholder="QX7K2P"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-title-sm tracking-[0.35em]"
            leading={<Hash />}
          />
        </Field>
        <Button type="submit" disabled={code.length !== 6}>
          Find shop
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </form>
  );
}

export default function ShopsPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("name");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Set<FilterKey>>(new Set());
  const [sort, setSort] = React.useState<"distance" | "price">("distance");
  const [qrError, setQrError] = React.useState<string | null>(null);

  const open = (code: string) => {
    const shop = shopByCode(code)!;
    toast.success(`Found ${shop.name}`);
    router.push(`/shops/${code}`);
  };

  const toggle = (key: FilterKey) =>
    setFilters((f) => {
      const next = new Set(f);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <CustomerFrame active="shops">
      {(state) => {
        const q = query.trim().toLowerCase();
        const results = SHOPS.filter((s) => {
          if (mode !== "name") return true;
          const live = state.shops[s.code];
          if (q && ![s.name, s.area, s.pincode, s.code, s.address].some((v) => v.toLowerCase().includes(q))) return false;
          if (filters.has("open") && !live.open) return false;
          if (filters.has("a3") && !live.printers.some((p) => p.sizes.includes("A3"))) return false;
          if (filters.has("colour") && !live.printers.some((p) => p.colour)) return false;
          if (filters.has("binding") && !s.services.some((x) => /binding/i.test(x))) return false;
          return true;
        }).sort((a, b) =>
          sort === "distance"
            ? a.distanceKm - b.distanceKm
            : state.shops[a.code].prices.perSide.A4.bw - state.shops[b.code].prices.perSide.A4.bw,
        );
        return (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-6 @xl/shell:px-6">
            <div>
              <h1 className="text-headline font-semibold text-ink">Find a print shop</h1>
              <p className="mt-1 text-small text-ink-muted">Around Lajpat Nagar, New Delhi</p>
            </div>

            <FinderModes
              value={mode}
              onChange={(m) => {
                setMode(m);
                setQrError(null);
              }}
            />

            {mode === "name" ? (
              <>
                <Input
                  aria-label="Search shops"
                  placeholder="Shop name, area or PIN code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  leading={<Search />}
                />
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={filters.has(f.key)}
                      onClick={() => toggle(f.key)}
                      className={cn(
                        "h-8 rounded-full border px-3 text-small font-medium transition-colors",
                        filters.has(f.key) ? "border-brand bg-brand-tint text-brand-ink" : "border-rule-strong bg-surface text-ink-2 hover:bg-hover",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                  <label className="ml-auto flex items-center gap-2 text-small text-ink-muted">
                    Sort
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as "distance" | "price")}
                      className="h-8 rounded-md border border-rule-strong bg-surface px-2 text-small text-ink"
                    >
                      <option value="distance">Nearest</option>
                      <option value="price">Lowest B&amp;W price</option>
                    </select>
                  </label>
                </div>
              </>
            ) : mode === "code" ? (
              <CodeFinder onFound={open} />
            ) : (
              <div className="rounded-lg border border-rule bg-surface p-5">
                <QrScanner
                  error={qrError}
                  onResult={(text) => {
                    const shop = shopFromQrText(text);
                    if (shop) open(shop.code);
                    else setQrError("That QR code isn't a Quire shop code.");
                  }}
                />
              </div>
            )}

            <p className="-mb-2 text-small font-medium text-ink-muted" aria-live="polite">
              {mode === "name" ? `${results.length} ${results.length === 1 ? "shop" : "shops"}` : "Or choose from nearby shops"}
            </p>
            {results.length ? (
              <div className="-mx-4 divide-y divide-rule border-y border-rule bg-surface @xl/shell:mx-0 @xl/shell:overflow-hidden @xl/shell:rounded-lg @xl/shell:border">
                {results.map((s) => (
                  <ShopRow key={s.code} shop={toShopRow(s, state.shops[s.code])} onSelect={() => router.push(`/shops/${s.code}`)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Store} title="No shops match">
                Try removing a filter or searching for an area such as Hauz Khas.
              </EmptyState>
            )}
          </div>
        );
      }}
    </CustomerFrame>
  );
}
