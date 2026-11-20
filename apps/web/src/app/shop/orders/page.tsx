import type { Metadata } from "next";
import { ShopOrders } from "./shop-orders";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return <ShopOrders />;
}
