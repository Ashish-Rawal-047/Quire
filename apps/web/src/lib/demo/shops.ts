/** Sample print shops in South Delhi. Realistic, but invented for the prototype. */
import type { SampleShop } from "@/lib/sample-data";
import type { DemoShop, PriceList, ShopState } from "./types";

const prices = (bw: number, colour: number, staple = 200): PriceList => ({
  perSide: {
    A4: { bw, colour },
    A3: { bw: bw * 2, colour: colour * 2 },
    Legal: { bw: bw + 100, colour: colour + 200 },
  },
  staplePerCopy: staple,
});

export const SHOPS: DemoShop[] = [
  {
    code: "QX7K2P",
    name: "Sharma Xerox & Stationery",
    shortName: "Sharma Xerox",
    tagline: "Printing, binding and stationery since 1998",
    address: "Shop 14, Central Market",
    area: "Lajpat Nagar II",
    city: "New Delhi",
    pincode: "110024",
    phone: "+91 98110 12345",
    distanceKm: 0.4,
    opensAt: "9:00 am",
    closesAt: "9:30 pm",
    days: "Mon–Sat",
    rating: 4.6,
    reviews: 312,
    services: ["B&W", "Colour", "A3", "Spiral binding", "Lamination"],
    protectedPrinting: true,
    sampleReadyMins: 15,
    ownerName: "Ravi Sharma",
    ownerEmail: "ravi@sharmaxerox.in",
    defaultOpen: true,
    prices: prices(200, 1000),
    printers: [
      { id: "laser", name: "Counter laser", model: "HP LaserJet Pro M404dn", colour: false, duplex: true, sizes: ["A4", "Legal"], available: true },
      { id: "inkjet", name: "Colour inkjet", model: "Epson EcoTank L3250", colour: true, duplex: false, sizes: ["A4"], available: true },
      { id: "copier", name: "A3 copier", model: "Canon imageRUNNER 2206", colour: false, duplex: true, sizes: ["A4", "A3"], available: false },
    ],
  },
  {
    code: "HM4R8T",
    name: "Campus Copy Centre",
    shortName: "Campus Copy",
    tagline: "Notes, theses and project reports for IIT and DU students",
    address: "12 Aurobindo Place Market",
    area: "Hauz Khas",
    city: "New Delhi",
    pincode: "110016",
    phone: "+91 99711 40420",
    distanceKm: 2.1,
    opensAt: "8:30 am",
    closesAt: "8:00 pm",
    days: "Mon–Sat",
    rating: 4.4,
    reviews: 528,
    services: ["B&W", "Colour", "Stapling", "Soft binding"],
    protectedPrinting: true,
    sampleReadyMins: 25,
    ownerName: "Sunil Gupta",
    ownerEmail: "sunil@campuscopy.in",
    defaultOpen: true,
    prices: prices(150, 800),
    printers: [
      { id: "laser", name: "Laser 1", model: "Brother HL-L5100DN", colour: false, duplex: true, sizes: ["A4", "Legal"], available: true },
      { id: "colour", name: "Colour laser", model: "HP Color LaserJet M255dw", colour: true, duplex: true, sizes: ["A4"], available: true },
    ],
  },
  {
    code: "BN2W6D",
    name: "Print Bazaar",
    shortName: "Print Bazaar",
    tagline: "Posters, flex and quick colour prints",
    address: "B-7 Main Road",
    area: "Amar Colony",
    city: "New Delhi",
    pincode: "110024",
    phone: "+91 98100 77231",
    distanceKm: 1.2,
    opensAt: "10:00 am",
    closesAt: "9:00 pm",
    days: "Daily",
    rating: 4.2,
    reviews: 141,
    services: ["B&W", "Colour", "Legal size", "Posters"],
    protectedPrinting: false,
    sampleReadyMins: 30,
    ownerName: "Imran Qureshi",
    ownerEmail: "imran@printbazaar.in",
    defaultOpen: false,
    prices: prices(200, 1200, 300),
    printers: [
      { id: "laser", name: "Office laser", model: "Canon LBP2900B", colour: false, duplex: false, sizes: ["A4", "Legal"], available: true },
      { id: "photo", name: "Photo printer", model: "Epson L8050", colour: true, duplex: false, sizes: ["A4"], available: true },
    ],
  },
  {
    code: "GN5S9K",
    name: "Shree Ganesh Photostat",
    shortName: "Shree Ganesh",
    tagline: "Quick xerox near the metro",
    address: "Stall 3, Metro Gate 2",
    area: "Moolchand",
    city: "New Delhi",
    pincode: "110024",
    phone: "+91 97170 55018",
    distanceKm: 1.6,
    opensAt: "8:00 am",
    closesAt: "10:00 pm",
    days: "Daily",
    rating: 4.1,
    reviews: 96,
    services: ["B&W", "Stapling", "ID card copies"],
    protectedPrinting: true,
    sampleReadyMins: 10,
    ownerName: "Ganesh Yadav",
    ownerEmail: "ganesh@shreeganeshxerox.in",
    defaultOpen: true,
    prices: prices(150, 900, 150),
    printers: [
      { id: "laser", name: "Laser", model: "Kyocera ECOSYS P2040dn", colour: false, duplex: true, sizes: ["A4", "Legal"], available: true },
    ],
  },
  {
    code: "KP8D3M",
    name: "Kapoor Digital Print Hub",
    shortName: "Kapoor Digital",
    tagline: "Colour, A3 and presentation printing",
    address: "M-38 M Block Market",
    area: "Greater Kailash I",
    city: "New Delhi",
    pincode: "110048",
    phone: "+91 98731 20984",
    distanceKm: 3.4,
    opensAt: "10:00 am",
    closesAt: "8:30 pm",
    days: "Mon–Sat",
    rating: 4.7,
    reviews: 204,
    services: ["B&W", "Colour", "A3", "Lamination", "Spiral binding"],
    protectedPrinting: true,
    sampleReadyMins: 20,
    ownerName: "Neha Kapoor",
    ownerEmail: "neha@kapoorprinthub.in",
    defaultOpen: true,
    prices: prices(250, 1200),
    printers: [
      { id: "mfp", name: "Colour MFP", model: "Canon imageRUNNER C3226", colour: true, duplex: true, sizes: ["A4", "A3"], available: true },
      { id: "laser", name: "Mono laser", model: "HP LaserJet M408dn", colour: false, duplex: true, sizes: ["A4", "Legal"], available: true },
    ],
  },
  {
    code: "OS6T4R",
    name: "Om Sai Xerox Centre",
    shortName: "Om Sai Xerox",
    tagline: "Court documents and legal-size copies",
    address: "Near Saket District Court",
    area: "Saket",
    city: "New Delhi",
    pincode: "110017",
    phone: "+91 99100 63347",
    distanceKm: 4.8,
    opensAt: "9:30 am",
    closesAt: "7:00 pm",
    days: "Mon–Sat",
    rating: 4.3,
    reviews: 77,
    services: ["B&W", "Legal size", "Stapling", "Soft binding"],
    protectedPrinting: true,
    sampleReadyMins: 20,
    ownerName: "Suresh Pandey",
    ownerEmail: "suresh@omsaixerox.in",
    defaultOpen: true,
    prices: prices(200, 1000),
    printers: [
      { id: "legal", name: "Legal laser", model: "Ricoh SP 3710DN", colour: false, duplex: true, sizes: ["A4", "Legal"], available: true },
    ],
  },
];

export const DEFAULT_SHOP_CODE = SHOPS[0].code;

export function shopByCode(code: string | null | undefined): DemoShop | undefined {
  return SHOPS.find((s) => s.code === code);
}

export function initialShopState(shop: DemoShop): ShopState {
  return { open: shop.defaultOpen, prices: structuredClone(shop.prices), printers: structuredClone(shop.printers) };
}

/** Adapter to the design system's ShopRow, using the live (owner-editable) state. */
export function toShopRow(shop: DemoShop, state: ShopState | undefined): SampleShop {
  const s = state ?? initialShopState(shop);
  return {
    code: shop.code,
    name: shop.name,
    area: shop.area,
    city: shop.city,
    pincode: shop.pincode,
    distanceKm: shop.distanceKm,
    isOpen: s.open,
    closesAt: shop.closesAt,
    opensAt: shop.opensAt,
    bwFromPaise: s.prices.perSide.A4.bw,
    colourFromPaise: s.prices.perSide.A4.colour,
    services: shop.services,
    protectedPrinting: shop.protectedPrinting,
    typicalReadyMins: shop.sampleReadyMins,
    address: shop.address,
    rating: shop.rating,
  };
}

export function shopByOwnerEmail(email: string): DemoShop | undefined {
  const e = email.trim().toLowerCase();
  return SHOPS.find((s) => s.ownerEmail === e);
}
