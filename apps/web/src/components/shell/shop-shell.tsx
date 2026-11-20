"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { IcHandover, IcOrders, IcOverview, IcPricing, IcPrinter, IcQueue, IcSettings } from "@/components/demo/shop-icons";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/feedback";
import { QuireMark } from "@/components/ui/logo";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

export type ShopNavKey = "overview" | "orders" | "queue" | "printers" | "pricing" | "settings";

const NAV: { key: ShopNavKey; label: string; href: string; icon: typeof IcOrders; group: "work" | "manage" }[] = [
  { key: "overview", label: "Overview", href: "/shop", icon: IcOverview, group: "work" },
  { key: "orders", label: "Orders", href: "/shop/orders", icon: IcOrders, group: "work" },
  { key: "queue", label: "Printing queue", href: "/shop/queue", icon: IcQueue, group: "work" },
  { key: "printers", label: "Printers", href: "/shop/printers", icon: IcPrinter, group: "manage" },
  { key: "pricing", label: "Pricing", href: "/shop/pricing", icon: IcPricing, group: "manage" },
  { key: "settings", label: "Settings", href: "/shop/settings", icon: IcSettings, group: "manage" },
];

/**
 * Operator workspace. Desktop: fixed-width sidebar + full-height content. Tablet: icon rail.
 * Phone: top bar with a menu. Opening status is always one click away — it's the most
 * consequential switch a shop has.
 */
export function ShopShell({
  active,
  children,
  preview,
  counts = {},
  shopName = "Sharma Xerox & Stationery",
  shopCode = "QX7K2P",
  operator = "Ravi Sharma",
  operatorRole = "Owner",
  hrefs,
  open: openProp,
  onOpenChange,
  openDescription,
}: {
  active: ShopNavKey;
  children: React.ReactNode;
  preview?: boolean;
  counts?: Partial<Record<ShopNavKey, number>>;
  shopName?: string;
  shopCode?: string;
  operator?: string;
  operatorRole?: string;
  /** Real pages pass the links that exist; items without one are shown disabled ("not built yet"). */
  hrefs?: Partial<Record<ShopNavKey, string>>;
  /** Controlled Open/Closed state (real pages). Uncontrolled in the gallery. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Overrides the line under the switch, e.g. for a shop that isn't listed yet. */
  openDescription?: string;
}) {
  const [openState, setOpenState] = React.useState(true);
  const open = openProp ?? openState;
  const setOpen = (value: boolean) => (onOpenChange ? onOpenChange(value) : setOpenState(value));
  const switchId = React.useId();
  const menuSwitchId = React.useId();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const railSwitchId = React.useId();

  const link = (item: (typeof NAV)[number]) => {
    const isActive = item.key === active;
    const Icon = item.icon;
    const className = cn(
      "group relative flex h-10 items-center gap-3 rounded-lg px-2.5 text-body transition-all duration-200 @5xl/shop:px-3",
      isActive
        ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--rule),0_6px_16px_-12px_rgb(15_27_45/0.35)]"
        : "text-ink-2 hover:bg-hover hover:text-ink @5xl/shop:hover:translate-x-0.5",
    );
    const inner = (
      <>
        {isActive ? <span aria-hidden className="nav-mark absolute -left-2.5 top-2 bottom-2 w-1 rounded-r-full bg-brand @5xl/shop:-left-3" /> : null}
        <Icon active={isActive} className={cn("size-5", isActive ? "text-brand-ink" : "text-ink-muted group-hover:text-brand-ink")} />
        <span className="hidden flex-1 truncate @5xl/shop:inline">{item.label}</span>
        {counts[item.key] ? (
          <span className="hidden min-w-5 rounded-full bg-brand px-1.5 text-center text-caption font-bold text-on-brand tabular shadow-[0_4px_10px_-4px_rgb(29_78_216/0.8)] @5xl/shop:inline">
            {counts[item.key]}
          </span>
        ) : null}
      </>
    );
    const common = { className, "aria-current": isActive ? ("page" as const) : undefined, title: item.label };
    const href = hrefs ? hrefs[item.key] : item.href;
    if (!preview && !href) {
      return (
        <li key={item.key}>
          <span
            aria-disabled="true"
            title={`${item.label} · not built yet`}
            className={cn(className, "cursor-not-allowed text-ink-faint opacity-60 hover:bg-transparent hover:text-ink-faint")}
          >
            {inner}
          </span>
        </li>
      );
    }
    return (
      <li key={item.key}>
        {preview ? (
          <a href={item.href} onClick={(e) => e.preventDefault()} {...common}>
            {inner}
          </a>
        ) : (
          <Link href={href ?? item.href} {...common}>
            {inner}
          </Link>
        )}
      </li>
    );
  };

  return (
    <div className="@container/shop flex h-full min-h-0 bg-paper">
      {/* Sidebar — rail on tablet, full on desktop */}
      <aside className="hidden w-16 shrink-0 flex-col border-r border-rule bg-sunken/50 @3xl/shop:flex @5xl/shop:w-60">
        <div className="flex h-16 items-center gap-2.5 px-3.5 @5xl/shop:px-4">
          <QuireMark className="size-7 shrink-0" />
          <div className="hidden min-w-0 @5xl/shop:block">
            <p className="truncate font-display text-small font-bold leading-tight tracking-[-0.01em] text-ink">{shopName}</p>
            <p className="font-mono text-caption tracking-[0.08em] text-ink-muted">{shopCode}</p>
          </div>
        </div>

        <div
          className={cn(
            "mx-3 hidden items-center justify-between rounded-lg border px-3 py-2.5 transition-colors duration-300 @5xl/shop:flex",
            open ? "border-brand/30 bg-brand-tint" : "border-rule bg-surface",
          )}
        >
          <label htmlFor={switchId} className="cursor-pointer">
            <span className="flex items-center gap-1.5 text-small font-semibold text-ink">
              <span aria-hidden className={cn("size-2 rounded-full", open ? "live-dot bg-st-ready" : "bg-ink-faint")} />
              {open ? "Open for orders" : "Closed"}
            </span>
            <span className="block text-caption text-ink-muted">
              {openDescription ?? (open ? "Customers can order now" : "New orders paused")}
            </span>
          </label>
          <Switch id={switchId} checked={open} onCheckedChange={setOpen} />
        </div>

        {/* Tablet rail: the same control, compact. Opening status stays one click away. */}
        <div
          className="mx-2 flex flex-col items-center gap-1.5 rounded-md border border-rule bg-surface px-1 py-2 @5xl/shop:hidden"
          title={open ? "Open for orders — switch off to pause new orders" : "Closed — switch on to accept orders"}
        >
          <Switch id={railSwitchId} checked={open} onCheckedChange={setOpen} aria-label="Open for orders" />
          <label htmlFor={railSwitchId} className="flex cursor-pointer items-center gap-1 text-caption font-medium text-ink-2">
            <span aria-hidden className={cn("size-1.5 rounded-full", open ? "bg-st-ready" : "bg-ink-faint")} />
            {open ? "Open" : "Closed"}
          </label>
        </div>

        <nav aria-label="Shop" className="mt-4 flex-1 overflow-y-auto px-2.5 @5xl/shop:px-3">
          <ul className="flex flex-col gap-0.5">{NAV.filter((n) => n.group === "work").map(link)}</ul>
          <p className="mb-1 mt-5 hidden px-3 text-caption font-semibold uppercase tracking-[0.1em] text-ink-faint @5xl/shop:block">Manage</p>
          <div className="my-3 h-px bg-rule @5xl/shop:hidden" />
          <ul className="flex flex-col gap-0.5">{NAV.filter((n) => n.group === "manage").map(link)}</ul>
        </nav>

        <div className="border-t border-rule p-3">
          {hrefs?.orders && !preview ? (
            <Link
              href={`${hrefs.orders}?tab=ready`}
              className="group hidden w-full items-center gap-2 rounded-lg border border-brand/20 bg-brand-tint px-3 py-2.5 text-small font-semibold text-brand-ink transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_20px_-14px_rgb(29_78_216/0.8)] @5xl/shop:flex"
            >
              <IcHandover active className="size-[18px] text-brand-ink" />
              Hand over an order
            </Link>
          ) : (
            <button
              type="button"
              className="group hidden w-full items-center gap-2 rounded-md border border-rule bg-surface px-3 py-2 text-small text-ink-2 transition-colors hover:bg-hover @5xl/shop:flex"
            >
              <IcHandover className="size-[18px] text-brand-ink" />
              Scan pickup code
              <span className="ml-auto">
                <Kbd>P</Kbd>
              </span>
            </button>
          )}
          <div className="mt-3 flex items-center gap-2.5 px-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-caption font-semibold text-brand-ink">
              {operator
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <div className="hidden min-w-0 @5xl/shop:block">
              <p className="truncate text-small font-medium text-ink">{operator}</p>
              <p className="text-caption text-ink-muted">{operatorRole}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="flex h-14 items-center justify-between border-b border-rule bg-surface px-4 @3xl/shop:hidden">
          <div className="flex items-center gap-2.5">
            <QuireMark className="size-7" />
            <div>
              <p className="text-small font-semibold leading-tight text-ink">{shopName}</p>
              <p className="text-caption text-ink-muted">{open ? "Open for orders" : "Closed"}</p>
            </div>
          </div>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-hover"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </DialogTrigger>
            <DialogContent title={shopName || "Menu"} description={operator ? `${operator} · ${operatorRole}` : undefined}>
              <div className="flex flex-col gap-4 px-5 pb-6 sm:px-6">
                <div className="flex items-center justify-between rounded-md border border-rule bg-paper px-3 py-2.5">
                  <label htmlFor={menuSwitchId} className="cursor-pointer">
                    <span className="block text-small font-medium text-ink">{open ? "Open for orders" : "Closed"}</span>
                    <span className="block text-caption text-ink-muted">
                      {openDescription ?? (open ? "Customers can order now" : "New orders paused")}
                    </span>
                  </label>
                  <Switch id={menuSwitchId} checked={open} onCheckedChange={setOpen} />
                </div>
                <nav aria-label="Shop menu">
                  <ul className="flex flex-col gap-0.5">
                    {NAV.map((item) => {
                      const href = hrefs ? hrefs[item.key] : item.href;
                      const Icon = item.icon;
                      const isActive = item.key === active;
                      return (
                        <li key={item.key}>
                          {href && !preview ? (
                            <Link
                              href={href}
                              onClick={() => setMenuOpen(false)}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "group flex h-11 items-center gap-3 rounded-md px-3 text-body transition-colors",
                                isActive ? "bg-brand-tint font-medium text-brand-ink" : "text-ink-2 hover:bg-hover",
                              )}
                            >
                              <Icon active={isActive} className="size-5" />
                              <span className="flex-1">{item.label}</span>
                              {counts[item.key] ? (
                                <span className="rounded-sm bg-brand px-1.5 text-caption font-semibold text-on-brand tabular">
                                  {counts[item.key]}
                                </span>
                              ) : null}
                            </Link>
                          ) : (
                            <span className="flex h-11 items-center gap-3 px-3 text-body text-ink-faint">
                              <Icon className="size-5" />
                              {item.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </DialogContent>
          </Dialog>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
