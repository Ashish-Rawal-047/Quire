import type { Metadata } from "next";
import { OrderTracking } from "./order-tracking";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage() {
  return <OrderTracking />;
}
