"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { actions } from "@/lib/demo/store";
import type { PaperSize, PriceList } from "@/lib/demo/types";
import { formatPaise } from "@/lib/format";

const SIZES: PaperSize[] = ["A4", "A3", "Legal"];

const toRupees = (paise: number) => String(paise / 100);
const toPaise = (rupees: string) => Math.round(Number(rupees) * 100);
const valid = (rupees: string) => /^\d{1,4}(\.\d{1,2})?$/.test(rupees.trim()) && toPaise(rupees) > 0 && toPaise(rupees) <= 100_000;

type Draft = { perSide: Record<PaperSize, { bw: string; colour: string }>; staple: string };

function toDraft(p: PriceList): Draft {
  return {
    perSide: Object.fromEntries(SIZES.map((s) => [s, { bw: toRupees(p.perSide[s].bw), colour: toRupees(p.perSide[s].colour) }])) as Draft["perSide"],
    staple: toRupees(p.staplePerCopy),
  };
}

function PricingPageContent() {
  const { shop, live } = useShop();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(live.prices));
  const fields = [...SIZES.flatMap((s) => [draft.perSide[s].bw, draft.perSide[s].colour]), draft.staple];
  const allValid = fields.every(valid);
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(live.prices));
  const example = allValid ? 10 * toPaise(draft.perSide.A4.bw) : null;

  const cell = (size: PaperSize, mode: "bw" | "colour") => {
    const value = draft.perSide[size][mode];
    return (
      <Input
        aria-label={`${size} ${mode === "bw" ? "black and white" : "colour"} price per side, in rupees`}
        inputMode="decimal"
        value={value}
        aria-invalid={!valid(value) || undefined}
        onChange={(e) => setDraft((d) => ({ ...d, perSide: { ...d.perSide, [size]: { ...d.perSide[size], [mode]: e.target.value } } }))}
        leading={<span className="text-small">₹</span>}
        className="w-28 tabular"
      />
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
        <div>
          <h1 className="font-display text-headline font-extrabold tracking-[-0.03em] text-ink">Pricing</h1>
          <p className="mt-1 text-small text-ink-muted">
            Prices per printed side. Customers&rsquo; estimates update as soon as you save. Orders already placed keep the
            price they were placed at.
          </p>
        </div>
        <form
          className="rounded-lg border border-rule bg-surface"
          onSubmit={(e) => {
            e.preventDefault();
            actions.setPrices(shop.code, {
              perSide: Object.fromEntries(
                SIZES.map((s) => [s, { bw: toPaise(draft.perSide[s].bw), colour: toPaise(draft.perSide[s].colour) }]),
              ) as PriceList["perSide"],
              staplePerCopy: toPaise(draft.staple),
            });
            toast.success("Prices saved");
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-small text-ink-muted">
                  <th className="px-5 py-3 font-medium">Paper</th>
                  <th className="px-3 py-3 font-medium">B&amp;W per side</th>
                  <th className="px-3 py-3 font-medium">Colour per side</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule border-t border-rule">
                {SIZES.map((size) => (
                  <tr key={size}>
                    <th scope="row" className="px-5 py-3 text-left font-medium text-ink">
                      {size}
                    </th>
                    <td className="px-3 py-3">{cell(size, "bw")}</td>
                    <td className="px-3 py-3">{cell(size, "colour")}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="px-5 py-3 text-left font-medium text-ink">
                    Stapling
                  </th>
                  <td className="px-3 py-3" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Stapling price per copy, in rupees"
                        inputMode="decimal"
                        value={draft.staple}
                        aria-invalid={!valid(draft.staple) || undefined}
                        onChange={(e) => setDraft((d) => ({ ...d, staple: e.target.value }))}
                        leading={<span className="text-small">₹</span>}
                        className="w-28 tabular"
                      />
                      <span className="text-small text-ink-muted">per copy</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-4">
            <p className="text-small text-ink-muted">
              {allValid ? `A 10-page B&W A4 document costs ${formatPaise(example!)} per copy.` : "Prices must be between ₹0.01 and ₹1,000."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(toDraft(shop.prices))}>
                Restore defaults
              </Button>
              <Button type="submit" disabled={!allValid || !changed}>
                Save prices
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <ShopGate>
      <PricingPageContent />
    </ShopGate>
  );
}
