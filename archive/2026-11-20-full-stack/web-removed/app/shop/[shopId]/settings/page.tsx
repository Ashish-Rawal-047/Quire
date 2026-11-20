import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Shop settings" };

export default function ShopSettingsPage() {
  return <SettingsView />;
}
