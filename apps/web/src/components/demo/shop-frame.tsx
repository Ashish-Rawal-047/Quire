"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { ShopShell, type ShopNavKey } from "@/components/shell/shop-shell";
import { shopByCode } from "@/lib/demo/shops";
import { actions } from "@/lib/demo/store";
import type { DemoShop, DemoState, Order, ShopState } from "@/lib/demo/types";
import { PageSkeleton, useDemoGuard } from "./prototype";

type ShopContextValue = { state: DemoState; shop: DemoShop; live: ShopState; orders: Order[]; ownerName: string };

const ShopContext = React.createContext<ShopContextValue | null>(null);

/** Renders its children only once the browser-held demo data is available. */
export function ShopGate({ children }: { children: React.ReactNode }) {
  return React.useContext(ShopContext) ? children : <PageSkeleton />;
}

export function useShop(): ShopContextValue {
  const ctx = React.useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside the shop workspace");
  return ctx;
}

const HREFS: Record<ShopNavKey, string> = {
  overview: "/shop",
  orders: "/shop/orders",
  queue: "/shop/queue",
  printers: "/shop/printers",
  pricing: "/shop/pricing",
  settings: "/shop/settings",
};

function activeFor(pathname: string): ShopNavKey {
  const match = (Object.entries(HREFS) as [ShopNavKey, string][])
    .filter(([, href]) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return match?.[0] ?? "overview";
}

export function ShopFrame({ children }: { children: React.ReactNode }) {
  const state = useDemoGuard("shop");
  const pathname = usePathname();
  const shop = shopByCode(state?.shopSession?.shopCode);

  const value = React.useMemo<ShopContextValue | null>(() => {
    if (!state || !shop) return null;
    return {
      state,
      shop,
      live: state.shops[shop.code],
      orders: state.orders.filter((o) => o.shopCode === shop.code),
      ownerName: state.shopSession!.ownerName,
    };
  }, [state, shop]);

  const counts = value
    ? {
        orders: value.orders.filter((o) => o.status === "paid").length,
        queue: value.orders.filter((o) => o.status === "accepted" || o.status === "printing").length,
      }
    : {};

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <div className="min-h-0 flex-1">
        <ShopShell
          active={activeFor(pathname)}
          hrefs={HREFS}
          counts={counts}
          shopName={shop?.name ?? ""}
          shopCode={shop?.code ?? ""}
          operator={value?.ownerName ?? ""}
          operatorRole="Owner"
          open={value?.live.open ?? false}
          onOpenChange={(open) => shop && actions.setShopOpen(shop.code, open)}
          openDescription={value ? (value.live.open ? "Customers can order now" : "New orders paused") : ""}
        >
          {/* Always render the page segment (it shows its own skeleton until the data loads). */}
          <ShopContext.Provider value={value}>
            {/* A short fade-and-rise when moving between shop pages. */}
            <div key={pathname} className="page-in h-full">
              {children}
            </div>
          </ShopContext.Provider>
        </ShopShell>
      </div>
    </div>
  );
}
