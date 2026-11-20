import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopFrame } from "@/components/demo/shop-frame";

export const metadata: Metadata = { title: { default: "Shop workspace", template: "%s · Shop workspace · Quire" } };

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  // ShopFrame reads the current path for the sidebar, so it sits inside a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-dvh bg-paper" />}>
      <ShopFrame>{children}</ShopFrame>
    </Suspense>
  );
}
