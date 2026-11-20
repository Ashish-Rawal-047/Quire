/**
 * Realistic sample content for the design gallery. Product screens will read the same
 * shapes from the API (M1+). Prices are integer paise.
 */
import type { OrderStatus, PrintMode } from "./status";

export type SampleShop = {
  code: string;
  name: string;
  area: string;
  city: string;
  pincode: string;
  distanceKm?: number;
  isOpen: boolean;
  closesAt?: string;
  opensAt?: string;
  bwFromPaise: number;
  colourFromPaise: number;
  services: string[];
  protectedPrinting: boolean;
  typicalReadyMins?: number;
  /** Street address (shown above the area when present). */
  address?: string;
  rating?: number;
};

export const SAMPLE_SHOPS: SampleShop[] = [
  {
    code: "QX7K2P",
    name: "Sharma Xerox & Stationery",
    area: "Lajpat Nagar II",
    city: "New Delhi",
    pincode: "110024",
    distanceKm: 0.4,
    isOpen: true,
    closesAt: "9:30 pm",
    bwFromPaise: 200,
    colourFromPaise: 1000,
    services: ["B&W", "Colour", "A3", "Spiral binding", "Lamination"],
    protectedPrinting: true,
    typicalReadyMins: 15,
  },
  {
    code: "HM4R8T",
    name: "Campus Copy Centre",
    area: "Hauz Khas",
    city: "New Delhi",
    pincode: "110016",
    distanceKm: 2.1,
    isOpen: true,
    closesAt: "8:00 pm",
    bwFromPaise: 150,
    colourFromPaise: 800,
    services: ["B&W", "Colour", "Stapling", "Soft binding"],
    protectedPrinting: true,
    typicalReadyMins: 25,
  },
  {
    code: "BN2W6D",
    name: "Print Bazaar",
    area: "Amar Colony",
    city: "New Delhi",
    pincode: "110024",
    distanceKm: 1.2,
    isOpen: false,
    opensAt: "10:00 am",
    bwFromPaise: 200,
    colourFromPaise: 1200,
    services: ["B&W", "Colour", "Legal size"],
    protectedPrinting: false,
  },
];

export type SampleQueueOrder = {
  number: string;
  customer: string;
  phoneMasked: string;
  items: number;
  pages: number;
  sheets: number;
  colour: boolean;
  protectedMode: boolean;
  totalPaise: number;
  minutesAgo: number;
  status: OrderStatus;
  /** Server-set. Every Phase 1 order is simulated. */
  printMode: PrintMode;
  note?: string;
};

export const SAMPLE_QUEUE: SampleQueueOrder[] = [
  {
    number: "PF-2611-0418",
    customer: "Ashish",
    phoneMasked: "98xxxxx321",
    items: 3,
    pages: 14,
    sheets: 10,
    colour: false,
    protectedMode: true,
    totalPaise: 3200,
    minutesAgo: 2,
    status: "paid",
    printMode: "simulated",
  },
  {
    number: "PF-2611-0417",
    customer: "Rohit",
    phoneMasked: "99xxxxx104",
    items: 1,
    pages: 42,
    sheets: 21,
    colour: false,
    protectedMode: true,
    totalPaise: 6800,
    minutesAgo: 6,
    status: "paid",
    printMode: "simulated",
    note: "Spiral binding, clear cover please",
  },
  {
    number: "PF-2611-0415",
    customer: "Fatima",
    phoneMasked: "87xxxxx552",
    items: 2,
    pages: 4,
    sheets: 4,
    colour: true,
    protectedMode: false,
    totalPaise: 4000,
    minutesAgo: 11,
    status: "accepted",
    printMode: "simulated",
  },
  {
    number: "PF-2611-0412",
    customer: "Vikram",
    phoneMasked: "70xxxxx918",
    items: 1,
    pages: 120,
    sheets: 60,
    colour: false,
    protectedMode: true,
    totalPaise: 18000,
    minutesAgo: 18,
    status: "printing",
    printMode: "simulated",
  },
  {
    number: "PF-2611-0409",
    customer: "Meera",
    phoneMasked: "96xxxxx207",
    items: 1,
    pages: 2,
    sheets: 2,
    colour: false,
    protectedMode: true,
    totalPaise: 400,
    minutesAgo: 34,
    status: "ready",
    printMode: "simulated",
  },
];

export const SAMPLE_FILES = [
  { name: "Resume_2026_final.pdf", kind: "pdf" as const, pages: 2, sizeKb: 184 },
  { name: "Semester 5 marksheet.pdf", kind: "pdf" as const, pages: 1, sizeKb: 912 },
  { name: "IMG_20261119_0912.jpg", kind: "image" as const, pages: 1, sizeKb: 2310 },
];
