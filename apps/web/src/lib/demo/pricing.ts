/** The prototype's price calculator. Prices are per printed side; double-sided saves paper. */
import type { ItemSettings, OrderItem, PriceLine, PriceList } from "./types";

export const PAPER_LABEL = { A4: "A4", A3: "A3", Legal: "Legal" } as const;

export function sheetsFor(pages: number, settings: Pick<ItemSettings, "sides" | "copies">): number {
  const perCopy = settings.sides === "double" ? Math.ceil(pages / 2) : pages;
  return perCopy * settings.copies;
}

export function describeSettings(pages: number, s: ItemSettings): string {
  return [
    `${pages} ${pages === 1 ? "page" : "pages"}`,
    s.colour === "bw" ? "B&W" : "Colour",
    s.sides === "double" && pages > 1 ? "double-sided" : "single-sided",
    s.paper,
    `${s.copies} ${s.copies === 1 ? "copy" : "copies"}`,
  ].join(" · ");
}

export function itemPrice(pages: number, s: ItemSettings, prices: PriceList): number {
  return pages * s.copies * prices.perSide[s.paper][s.colour];
}

export type Quote = { lines: PriceLine[]; totalPaise: number; sheets: number; pages: number };

export function quote(items: Pick<OrderItem, "name" | "pages" | "settings">[], prices: PriceList): Quote {
  const lines: PriceLine[] = [];
  let sheets = 0;
  let pages = 0;
  let stapledCopies = 0;
  items.forEach((item, i) => {
    const duplicate = items.findIndex((other) => other.name === item.name) !== i;
    lines.push({
      label: duplicate ? `${item.name} (${i + 1})` : item.name,
      detail: describeSettings(item.pages, item.settings),
      paise: itemPrice(item.pages, item.settings, prices),
    });
    sheets += sheetsFor(item.pages, item.settings);
    pages += item.pages * item.settings.copies;
    if (item.settings.staple && item.pages > 1) stapledCopies += item.settings.copies;
  });
  if (stapledCopies > 0) {
    lines.push({
      label: "Stapling",
      detail: `${stapledCopies} ${stapledCopies === 1 ? "copy" : "copies"} × ₹${prices.staplePerCopy / 100}`,
      paise: stapledCopies * prices.staplePerCopy,
    });
  }
  return { lines, totalPaise: lines.reduce((sum, l) => sum + l.paise, 0), sheets, pages };
}

export const DEFAULT_SETTINGS: ItemSettings = { colour: "bw", sides: "double", copies: 1, paper: "A4", staple: false };
