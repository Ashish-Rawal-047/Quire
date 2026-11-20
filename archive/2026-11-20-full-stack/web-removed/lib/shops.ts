/** Shapes returned by the shop API (services/api/app/api/v1/shops.py). */

export type ShopRole = "owner" | "staff";

export type Shop = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  status: "draft" | "listed" | "suspended";
  accepting_orders: boolean;
  is_demo: boolean;
  hours: { weekday: number; opens_at: string; closes_at: string }[];
  your_role: ShopRole;
};

export type Members = {
  members: { user_id: string; display_name: string | null; email: string; role: ShopRole; since: string }[];
  invitations: { id: string; email: string; role: "staff"; created_at: string; expires_at: string }[];
};

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Editable profile fields, in form order. */
export const PROFILE_FIELDS = [
  { key: "name", label: "Shop name", required: true, autoComplete: "organization" },
  { key: "contact_phone", label: "Phone", autoComplete: "tel", inputMode: "tel" },
  { key: "contact_email", label: "Email (optional)", autoComplete: "email", inputMode: "email" },
  { key: "address_line1", label: "Address", autoComplete: "address-line1" },
  { key: "address_line2", label: "Address line 2 (optional)", autoComplete: "address-line2" },
  { key: "locality", label: "Area / locality", autoComplete: "address-level3" },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State", autoComplete: "address-level1" },
  { key: "pincode", label: "PIN code", autoComplete: "postal-code", inputMode: "numeric" },
] as const;

export type ProfileKey = (typeof PROFILE_FIELDS)[number]["key"];

/** Setup steps built so far, plus the ones that arrive in later slices (shown, not faked). */
export function setupChecklist(shop: Shop) {
  return [
    {
      key: "profile",
      label: "Name, address, PIN code and phone",
      done: Boolean(shop.name && shop.address_line1 && shop.pincode && shop.contact_phone),
    },
    { key: "location", label: "Location on the map", done: shop.latitude !== null },
    { key: "hours", label: "Opening hours", done: shop.hours.length > 0 },
    { key: "pricing", label: "Prices", done: false, later: "Pricing arrives in the next step of M1" },
    { key: "printing", label: "Printer setup", done: false, later: "Printer setup arrives in the next step of M1" },
  ];
}
