import type { Metadata } from "next";
import { OrderWizard } from "./order-wizard";

export const metadata: Metadata = { title: "New print order" };

export default function OrderPage() {
  return <OrderWizard />;
}
