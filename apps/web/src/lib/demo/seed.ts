/** First-run sample data: incoming, in-progress and completed orders, plus two past orders for the
demo customer. Times are relative to the moment the demo is first opened (or reset). */
import { DEFAULT_SETTINGS, quote } from "./pricing";
import { initialShopState, SHOPS, shopByCode } from "./shops";
import type { DemoState, ItemSettings, Order, OrderItem, OrderStatus, PrivacyMode, ReceiptEvent, Review } from "./types";

export const SAMPLE_DOCS = {
  resume: { name: "Resume_Ashish_Rawal.pdf", type: "pdf", pages: 2, sizeKb: 5, url: "/samples/resume.pdf" },
  report: { name: "Final_Year_Project_Report.pdf", type: "pdf", pages: 12, sizeKb: 42, url: "/samples/project-report.pdf" },
  agreement: { name: "Rent_Agreement_Draft.pdf", type: "pdf", pages: 4, sizeKb: 9, url: "/samples/rent-agreement.pdf" },
  manual: { name: "Physics_Lab_Manual.pdf", type: "pdf", pages: 6, sizeKb: 18, url: "/samples/lab-manual.pdf" },
  marksheet: { name: "Semester_5_Marksheet.png", type: "image", pages: 1, sizeKb: 53, url: "/samples/marksheet.png" },
  poster: { name: "Diwali_Mela_Poster.png", type: "image", pages: 1, sizeKb: 323, url: "/samples/event-poster.png" },
} as const;

export type SampleDocKey = keyof typeof SAMPLE_DOCS;

export function sampleItem(key: SampleDocKey, settings: Partial<ItemSettings> = {}): OrderItem {
  const doc = SAMPLE_DOCS[key];
  return {
    id: `sample-${key}-${Math.random().toString(36).slice(2, 8)}`,
    name: doc.name,
    type: doc.type,
    pages: doc.pages,
    sizeKb: doc.sizeKb,
    source: { kind: "sample", url: doc.url },
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

export const DEMO_CUSTOMER = { name: "Ashish Rawal", phone: "98101 23456", email: "ashish.rawal@example.com" };

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 2)}xxxxx${digits.slice(7)}` : "xxxxxxxxxx";
}

const pickup = () => String(1000 + Math.floor(Math.random() * 9000));

type SeedOrder = {
  shop: string;
  customer: string;
  phone: string;
  mine?: boolean;
  items: OrderItem[];
  privacy?: PrivacyMode;
  note?: string;
  status: OrderStatus;
  /** Pays in cash at the counter. */
  cash?: boolean;
  review?: Omit<Review, "at">;
  /** Minutes before now that the order was paid. */
  ago: number;
  printer?: string;
  printingFor?: number;
  rejectReason?: string;
};

export function buildEvents(order: Order, shopName: string, operator: string): ReceiptEvent[] {
  const ev: ReceiptEvent[] = [
    { action: "uploaded", at: order.createdAt, actor: order.mine ? "You" : order.customer.name.split(" ")[0], detail: `${order.items.length} ${order.items.length === 1 ? "file" : "files"}` },
  ];
  const staff = `${operator.split(" ")[0]} (${shopName})`;
  if (order.acceptedAt) {
    ev.push({ action: "previewed", at: order.acceptedAt, actor: staff, detail: `Page 1 of ${order.items[0].name}` });
  }
  if (order.printingAt && order.printJob) {
    ev.push({ action: "printed", at: order.printingAt, actor: order.printJob.printerName, detail: `${order.items.length} ${order.items.length === 1 ? "file" : "files"}` });
  }
  if (order.completedAt) {
    ev.push({ action: "pickup_verified", at: order.completedAt, actor: staff, detail: "Pickup code checked at the counter" });
    ev.push({ action: "deleted", at: order.completedAt, actor: "Quire", detail: "Removed from the order after pickup" });
  }
  return ev;
}

function makeOrder(o: SeedOrder, n: number, now: number): Order {
  const shop = shopByCode(o.shop)!;
  const minute = 60_000;
  const paid = new Date(now - o.ago * minute);
  const at = (offsetMin: number) => new Date(paid.getTime() + offsetMin * minute).toISOString();
  const q = quote(o.items, shop.prices);
  const reached = (s: OrderStatus) => {
    const order: OrderStatus[] = ["paid", "accepted", "printing", "ready", "completed"];
    return o.status !== "cancelled" && order.indexOf(o.status) >= order.indexOf(s);
  };
  const printer = shop.printers.find((p) => p.id === (o.printer ?? shop.printers[0].id)) ?? shop.printers[0];
  const printStart = o.status === "printing" ? new Date(now - (o.printingFor ?? 1) * minute).toISOString() : at(4);
  const order: Order = {
    id: `seed-${n}`,
    number: `PF-${paid.getFullYear().toString().slice(2)}${String(paid.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(4, "0")}`,
    shopCode: shop.code,
    mine: Boolean(o.mine),
    customer: { name: o.customer, phone: o.phone },
    items: o.items,
    privacy: o.privacy ?? "download_permitted",
    note: o.note,
    lines: q.lines,
    totalPaise: q.totalPaise,
    payment: {
      method: o.cash ? "cash" : n % 3 === 0 ? "card" : "upi",
      ref: o.cash ? "Cash at pickup" : `SIM-${(n * 7919).toString(36).toUpperCase()}`,
      paidAt: paid.toISOString(),
      cashCollectedAt: o.cash && o.status === "completed" ? at(35) : undefined,
    },
    status: o.status,
    pickupCode: pickup(),
    createdAt: new Date(paid.getTime() - 3 * minute).toISOString(),
    acceptedAt: reached("accepted") ? at(1) : undefined,
    printingAt: reached("printing") ? printStart : undefined,
    readyAt: reached("ready") ? at(9) : undefined,
    completedAt: reached("completed") ? at(35) : undefined,
    cancelledAt: o.status === "cancelled" ? at(2) : undefined,
    rejectReason: o.rejectReason,
    printJob: reached("printing")
      ? { printerId: printer.id, printerName: printer.name, startedAt: printStart, durationMs: o.status === "printing" ? 4 * minute : 3 * minute }
      : undefined,
    filesRemoved: o.status === "completed" || o.status === "cancelled",
    review: o.review && o.status === "completed" ? { ...o.review, at: at(80) } : undefined,
    events: [],
  };
  order.events = buildEvents(order, shop.shortName, shop.ownerName);
  return order;
}

const DAY = 24 * 60;

const SEED: SeedOrder[] = [
  // Demo customer's history.
  { shop: "HM4R8T", customer: DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, mine: true, status: "completed", ago: 5 * DAY + 180,
    review: { stars: 5, tags: ["Quick", "Good print quality"], text: "Report came out crisp and neatly stapled." },
    items: [sampleItem("report", { copies: 2, staple: true })] },
  { shop: "QX7K2P", customer: DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, mine: true, status: "completed", ago: DAY + 95,
    items: [sampleItem("resume", { copies: 3 }), sampleItem("marksheet", { colour: "colour", sides: "single" })] },

  { shop: "KP8D3M", customer: DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, mine: true, status: "ready", ago: 45, printer: "mfp",
    items: [sampleItem("poster", { colour: "colour", sides: "single", copies: 2 })] },

  // Sharma Xerox: live queue.
  { shop: "QX7K2P", customer: "Rohit Verma", phone: "98990 41214", status: "paid", ago: 2,
    items: [sampleItem("report", { copies: 2, staple: true }), sampleItem("manual")] },
  { shop: "QX7K2P", customer: "Fatima Khan", phone: "99580 22417", status: "paid", cash: true, ago: 11, note: "Please print on thick paper if you have it.",
    items: [sampleItem("marksheet", { colour: "colour", sides: "single" })] },
  { shop: "QX7K2P", customer: "Vikram Singh", phone: "98114 07715", status: "accepted", ago: 16, privacy: "download_permitted",
    items: [sampleItem("agreement", { paper: "Legal", sides: "single", copies: 2 })] },
  { shop: "QX7K2P", customer: "Meera Iyer", phone: "97111 60312", status: "printing", ago: 21, printer: "laser", printingFor: 1,
    items: [sampleItem("resume", { copies: 5 })] },
  { shop: "QX7K2P", customer: "Arjun Nair", phone: "98186 33409", status: "ready", cash: true, ago: 34, printer: "inkjet",
    items: [sampleItem("poster", { colour: "colour", sides: "single", copies: 4 })] },

  // Sharma Xerox: earlier today and this week.
  { shop: "QX7K2P", customer: "Priya Menon", phone: "98712 55120", status: "completed", ago: 140,
    review: { stars: 5, tags: ["Quick", "Friendly staff"], text: "Ready before I reached the shop. Very helpful." }, items: [sampleItem("manual", { copies: 3, staple: true })] },
  { shop: "QX7K2P", customer: "Karan Malhotra", phone: "98100 98213", status: "completed", cash: true, ago: 260,
    review: { stars: 4, tags: ["Fair price"], text: "Good prints. The counter was busy at lunch." }, items: [sampleItem("report")] },
  { shop: "QX7K2P", customer: "Sneha Reddy", phone: "99999 41027", status: "completed", ago: DAY + 300,
    review: { stars: 5, tags: ["Good print quality"], text: "Poster colours were spot on." }, items: [sampleItem("poster", { colour: "colour", sides: "single", copies: 10 })] },
  { shop: "QX7K2P", customer: "Aman Gupta", phone: "98731 77401", status: "completed", ago: 2 * DAY + 60,
    review: { stars: 3, tags: ["Fair price"], text: "One page came out a little faded." }, items: [sampleItem("agreement", { copies: 2 })] },
  { shop: "QX7K2P", customer: "Divya Joshi", phone: "98105 21366", status: "completed", ago: 3 * DAY + 400, items: [sampleItem("report", { copies: 3, staple: true })] },
  { shop: "QX7K2P", customer: "Harsh Vardhan", phone: "99100 46021", status: "cancelled", ago: 4 * DAY + 30, rejectReason: "We can't print A3 in colour",
    items: [sampleItem("poster", { colour: "colour", paper: "A3", sides: "single" })] },

  // Other shops, so every workspace has something in it.
  { shop: "HM4R8T", customer: "Ishaan Bhatia", phone: "98680 11872", status: "paid", ago: 6, items: [sampleItem("report", { copies: 2, staple: true })] },
  { shop: "HM4R8T", customer: "Tanvi Shah", phone: "99530 44109", status: "completed", ago: 300,
    review: { stars: 4, tags: ["Easy pickup"] }, items: [sampleItem("manual")] },
  { shop: "GN5S9K", customer: "Rahul Das", phone: "98911 20871", status: "paid", ago: 4, items: [sampleItem("resume", { copies: 2 })] },
  { shop: "KP8D3M", customer: "Nikita Arora", phone: "98102 66530", status: "accepted", ago: 12, items: [sampleItem("poster", { colour: "colour", paper: "A3", sides: "single", copies: 2 })] },
  { shop: "OS6T4R", customer: "Advocate R. Mehta", phone: "98110 39021", status: "completed", ago: 200, items: [sampleItem("agreement", { paper: "Legal", copies: 3 })] },
];

export function createSeed(now = Date.now()): DemoState {
  const orders = SEED.map((o, i) => makeOrder(o, 401 + i, now));
  return {
    version: 1,
    seededAt: new Date(now).toISOString(),
    customer: null,
    shopSession: null,
    orders: orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    shops: Object.fromEntries(SHOPS.map((s) => [s.code, initialShopState(s)])),
    seq: 401 + SEED.length,
  };
}
