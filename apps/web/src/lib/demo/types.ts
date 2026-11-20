/**
 * Data shapes for the Quire prototype. Everything lives in this browser (localStorage for state,
 * IndexedDB for uploaded files). Money is integer paise. Nothing here is sent anywhere.
 */
import type { AccessAction } from "@/components/patterns/access-receipt";
import type { PriceLine } from "@/components/patterns/price-summary";
import type { PrivacyMode } from "@/components/patterns/privacy-choice";

export type PaperSize = "A4" | "A3" | "Legal";
export type ColourMode = "bw" | "colour";
export type Sides = "single" | "double";
export type { PrivacyMode, PriceLine };

export type PriceList = {
  /** Price per printed side, in paise. */
  perSide: Record<PaperSize, Record<ColourMode, number>>;
  staplePerCopy: number;
};

export type DemoShop = {
  code: string;
  name: string;
  /** Used where space is short, e.g. "Print at Sharma Xerox". */
  shortName: string;
  tagline: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  phone: string;
  distanceKm: number;
  opensAt: string;
  closesAt: string;
  days: string;
  rating: number;
  reviews: number;
  services: string[];
  protectedPrinting: boolean;
  /** Sample figure for the prototype, not measured. */
  sampleReadyMins: number;
  ownerName: string;
  ownerEmail: string;
  defaultOpen: boolean;
  prices: PriceList;
  printers: Printer[];
};

export type Printer = {
  id: string;
  name: string;
  model: string;
  colour: boolean;
  duplex: boolean;
  sizes: PaperSize[];
  available: boolean;
};

export type ItemSettings = {
  colour: ColourMode;
  sides: Sides;
  copies: number;
  paper: PaperSize;
  staple: boolean;
};

export type DocSource = { kind: "sample"; url: string } | { kind: "upload"; id: string };

export type OrderItem = {
  id: string;
  name: string;
  type: "pdf" | "image";
  pages: number;
  sizeKb: number;
  source: DocSource;
  /** Small first-page image (data URL) for uploads; samples render from their URL. */
  thumb?: string;
  settings: ItemSettings;
};

/** A customer's rating of a collected order. */
export type Review = { stars: number; tags: string[]; text?: string; at: string };

export type PaymentMethod = "upi" | "card" | "cash";

export type OrderStatus = "paid" | "accepted" | "printing" | "ready" | "completed" | "cancelled";

export type ReceiptEvent = { action: AccessAction; at: string; actor: string; detail?: string };

export type Order = {
  id: string;
  number: string;
  shopCode: string;
  /** True for orders placed by the demo customer on this device. */
  mine: boolean;
  customer: { name: string; phone: string };
  items: OrderItem[];
  privacy: PrivacyMode;
  note?: string;
  lines: PriceLine[];
  totalPaise: number;
  /**
   * `paidAt` is when the order was placed. For cash orders nothing is paid online: the shop
   * collects the money at the counter, and `cashCollectedAt` records when.
   */
  payment: { method: PaymentMethod; ref: string; paidAt: string; cashCollectedAt?: string };
  status: OrderStatus;
  pickupCode: string;
  createdAt: string;
  acceptedAt?: string;
  printingAt?: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rejectReason?: string;
  printJob?: { printerId: string; printerName: string; startedAt: string; durationMs: number };
  filesRemoved?: boolean;
  review?: Review;
  events: ReceiptEvent[];
};

export type ShopState = { open: boolean; prices: PriceList; printers: Printer[] };

export type DemoState = {
  version: 1;
  seededAt: string;
  customer: { name: string; phone: string } | null;
  shopSession: { shopCode: string; ownerName: string } | null;
  orders: Order[];
  shops: Record<string, ShopState>;
  seq: number;
};
