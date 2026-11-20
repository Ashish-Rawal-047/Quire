import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SHOPS, shopByCode } from "@/lib/demo/shops";
import { ShopDetail } from "./shop-detail";

// Static export: only the six demo shops exist; any other code is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SHOPS.map((s) => ({ code: s.code }));
}

async function Shop({ params }: { params: PageProps<"/shops/[code]">["params"] }) {
  const { code } = await params;
  if (!shopByCode(code)) notFound();
  return <ShopDetail code={code} />;
}

export default function ShopPage({ params }: PageProps<"/shops/[code]">) {
  return (
    <Suspense fallback={<div className="min-h-full bg-paper" />}>
      <Shop params={params} />
    </Suspense>
  );
}
