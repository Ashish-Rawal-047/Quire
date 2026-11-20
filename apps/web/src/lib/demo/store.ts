"use client";

/**
 * The prototype's whole "backend": one JSON document in localStorage, shared by every tab of this
 * browser. Open the customer app in one tab and the shop workspace in another and they update each
 * other live (the `storage` event). Uploaded files are kept separately in IndexedDB (files.ts).
 */
import * as React from "react";
import { deleteFile } from "./files";
import { quote } from "./pricing";
import { buildEvents, createSeed } from "./seed";
import { shopByCode } from "./shops";
import type { DemoState, Order, OrderItem, PaymentMethod, PriceList, Printer, PrivacyMode, ReceiptEvent, Review } from "./types";

const KEY = "quire-demo-v5";
const LOCAL_EVENT = "quire-demo-change";

let cache: DemoState | null = null;

function load(): DemoState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed?.version === 1) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    /* fall through to a fresh seed */
  }
  cache = createSeed();
  persist(cache);
  return cache;
}

function persist(state: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the demo keeps working in memory for this tab */
  }
}

function commit(next: DemoState) {
  cache = next;
  persist(next);
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

export function update(mutator: (draft: DemoState) => void) {
  const draft = structuredClone(load());
  mutator(draft);
  commit(draft);
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

/** The demo state, or null during the server render / before hydration. */
export function useDemo(): DemoState | null {
  return React.useSyncExternalStore(subscribe, load, () => null);
}

/** Re-renders every `ms` while mounted (for live progress bars and "x min ago"). */
export function useNow(ms = 1000): number {
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, ms);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [ms]);
  return now;
}

const nowIso = () => new Date().toISOString();
const findOrder = (s: DemoState, id: string) => s.orders.find((o) => o.id === id);

function staffLabel(s: DemoState, order: Order): string {
  const shop = shopByCode(order.shopCode)!;
  const name = s.shopSession?.shopCode === order.shopCode ? s.shopSession.ownerName : shop.ownerName;
  return `${name.split(" ")[0]} (${shop.shortName})`;
}

/** Actually removes an order's uploaded files from this browser (IndexedDB) and its thumbnails. */
function removeFiles(order: Order) {
  order.filesRemoved = true;
  for (const item of order.items) {
    item.thumb = undefined;
    if (item.source.kind === "upload") void deleteFile(item.source.id).catch(() => undefined);
  }
}

function log(order: Order, event: Omit<ReceiptEvent, "at">) {
  order.events.push({ ...event, at: nowIso() });
}

/* ── Sessions ─────────────────────────────────────────────────────────────────────────────── */

export const actions = {
  enterAsCustomer(name: string, phone: string) {
    update((s) => {
      s.customer = { name: name.trim() || "Guest", phone: phone.trim() };
    });
  },
  leaveCustomer() {
    update((s) => {
      s.customer = null;
    });
  },
  enterAsShop(shopCode: string, ownerName: string) {
    update((s) => {
      s.shopSession = { shopCode, ownerName: ownerName.trim() || shopByCode(shopCode)!.ownerName };
    });
  },
  leaveShop() {
    update((s) => {
      s.shopSession = null;
    });
  },
  resetDemo() {
    const keepCustomer = load().customer;
    const keepShop = load().shopSession;
    const fresh = createSeed();
    fresh.customer = keepCustomer;
    fresh.shopSession = keepShop;
    commit(fresh);
  },

  /* ── Customer ─────────────────────────────────────────────────────────────────────────── */

  placeOrder(input: {
    shopCode: string;
    items: OrderItem[];
    privacy: PrivacyMode;
    note?: string;
    method: PaymentMethod;
  }): Order {
    let created: Order | null = null;
    update((s) => {
      const shop = shopByCode(input.shopCode)!;
      const prices = s.shops[shop.code].prices;
      const q = quote(input.items, prices);
      const now = new Date();
      const n = s.seq++;
      const customer = s.customer ?? { name: "Guest", phone: "" };
      const order: Order = {
        id: crypto.randomUUID(),
        number: `PF-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(4, "0")}`,
        shopCode: shop.code,
        mine: true,
        customer,
        items: input.items,
        privacy: input.privacy,
        note: input.note?.trim() || undefined,
        lines: q.lines,
        totalPaise: q.totalPaise,
        payment: {
          method: input.method,
          ref: input.method === "cash" ? "Cash at pickup" : `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          paidAt: now.toISOString(),
        },
        status: "paid",
        pickupCode: String(1000 + Math.floor(Math.random() * 9000)),
        createdAt: now.toISOString(),
        events: [],
      };
      order.events = buildEvents(order, shop.shortName, shop.ownerName);
      s.orders.unshift(order);
      created = order;
    });
    return created!;
  },

  /** Rate a collected order (or change an earlier rating). */
  reviewOrder(id: string, review: Omit<Review, "at">) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "completed" || !o.mine) return;
      const stars = Math.min(5, Math.max(1, Math.round(review.stars)));
      o.review = { stars, tags: review.tags.slice(0, 5), text: review.text?.trim().slice(0, 280) || undefined, at: nowIso() };
    });
  },

  cancelOrder(id: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "paid") return;
      o.status = "cancelled";
      o.cancelledAt = nowIso();
      o.rejectReason = "Cancelled by you";
      removeFiles(o);
      log(o, { action: "deleted", actor: "Quire", detail: "Removed after cancellation" });
    });
  },

  /* ── Shop ─────────────────────────────────────────────────────────────────────────────── */

  recordPreview(id: string, itemName: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o) return;
      const last = o.events[o.events.length - 1];
      // One entry per file per minute is enough for the receipt.
      if (last?.action === "previewed" && last.detail?.includes(itemName) && Date.now() - Date.parse(last.at) < 60_000) return;
      log(o, { action: "previewed", actor: staffLabel(s, o), detail: `Preview of ${itemName}` });
    });
  },
  recordDownload(id: string, itemName: string, allowed: boolean) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o) return;
      log(o, {
        action: allowed ? "downloaded" : "download_denied",
        actor: staffLabel(s, o),
        detail: allowed ? itemName : "Protected order",
      });
    });
  },
  acceptOrder(id: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "paid") return;
      o.status = "accepted";
      o.acceptedAt = nowIso();
    });
  },
  rejectOrder(id: string, reason: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "paid") return;
      o.status = "cancelled";
      o.cancelledAt = nowIso();
      o.rejectReason = reason;
      removeFiles(o);
      log(o, { action: "deleted", actor: "Quire", detail: "Removed after the shop declined" });
    });
  },
  startPrinting(id: string, printerId: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "accepted") return;
      const printer = s.shops[o.shopCode].printers.find((p) => p.id === printerId);
      if (!printer || !printer.available) return;
      const sheets = o.items.reduce((sum, it) => sum + it.pages * it.settings.copies, 0);
      o.status = "printing";
      o.printingAt = nowIso();
      // Simulated: roughly 1.5 s per printed side, between 6 and 40 seconds.
      o.printJob = {
        printerId,
        printerName: printer.name,
        startedAt: o.printingAt,
        durationMs: Math.min(40_000, Math.max(6_000, sheets * 1500)),
      };
      log(o, { action: "printed", actor: printer.name, detail: `${o.items.length} ${o.items.length === 1 ? "file" : "files"}` });
    });
  },
  markReady(id: string) {
    update((s) => {
      const o = findOrder(s, id);
      if (!o || o.status !== "printing") return;
      o.status = "ready";
      o.readyAt = nowIso();
    });
  },
  /**
   * Hands the order over. `proof` is the 4-digit code typed at the counter, or the order id read
   * from the customer's pickup QR. Returns false if it doesn't match this order.
   */
  completeOrder(id: string, proof: { code: string } | { qrOrderId: string }): boolean {
    const o = findOrder(load(), id);
    if (!o || o.status !== "ready") return false;
    const ok = "code" in proof ? o.pickupCode === proof.code.trim() : o.id === proof.qrOrderId;
    if (!ok) return false;
    update((s) => {
      const order = findOrder(s, id)!;
      const at = nowIso();
      order.status = "completed";
      order.completedAt = at;
      if (order.payment.method === "cash") order.payment.cashCollectedAt = at;
      removeFiles(order);
      log(order, {
        action: "pickup_verified",
        actor: staffLabel(s, order),
        detail: "code" in proof ? "Pickup code checked at the counter" : "Pickup QR scanned at the counter",
      });
      log(order, { action: "deleted", actor: "Quire", detail: "Removed from the order after pickup" });
    });
    return true;
  },
  setShopOpen(code: string, open: boolean) {
    update((s) => {
      s.shops[code].open = open;
    });
  },
  setPrinterAvailable(code: string, printerId: string, available: boolean) {
    update((s) => {
      const p = s.shops[code].printers.find((x) => x.id === printerId);
      if (p) p.available = available;
    });
  },
  addPrinter(code: string, printer: Omit<Printer, "id" | "available">): Printer {
    const added: Printer = { ...printer, id: `added-${crypto.randomUUID().slice(0, 8)}`, available: true };
    update((s) => {
      s.shops[code].printers.push(added);
    });
    return added;
  },
  /** Only printers added in Settings can be removed; they must not be printing. */
  removePrinter(code: string, printerId: string) {
    update((s) => {
      const busy = s.orders.some((o) => o.status === "printing" && o.shopCode === code && o.printJob?.printerId === printerId);
      if (busy || !printerId.startsWith("added-")) return;
      s.shops[code].printers = s.shops[code].printers.filter((p) => p.id !== printerId);
    });
  },
  setPrices(code: string, prices: PriceList) {
    update((s) => {
      s.shops[code].prices = prices;
    });
  },
};

/** Reads an order id from a pickup QR (`quire:pickup:<id>`). */
export function orderIdFromPickupQr(text: string): string | null {
  const m = /^quire:pickup:([\w-]+)$/.exec(text.trim());
  return m ? m[1] : null;
}

/** A cash order the shop hasn't been paid for yet. */
export function cashDue(order: Order): boolean {
  return order.payment.method === "cash" && !order.payment.cashCollectedAt && order.status !== "cancelled";
}

/** "UPI", "card" or "cash" for sentences such as "Paid by UPI". */
export function methodLabel(method: PaymentMethod): string {
  return method === "upi" ? "UPI" : method;
}

export function printProgress(order: Order, now: number): number {
  if (!order.printJob) return 0;
  if (order.status !== "printing") return 1;
  return Math.min(1, Math.max(0, (now - Date.parse(order.printJob.startedAt)) / order.printJob.durationMs));
}
