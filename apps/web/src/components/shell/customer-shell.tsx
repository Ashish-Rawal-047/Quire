"use client";

import { House, ReceiptText, Store, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { withBase } from "@/lib/base-path";

export type CustomerNavKey = "home" | "shops" | "orders" | "profile";

const NAV: { key: CustomerNavKey; label: string; href: string; icon: typeof House }[] = [
  { key: "home", label: "Home", href: "/home", icon: House },
  { key: "shops", label: "Find shops", href: "/shops", icon: Store },
  { key: "orders", label: "My orders", href: "/orders", icon: ReceiptText },
  { key: "profile", label: "Profile", href: "/profile", icon: User },
];

function NavLink({
  item,
  active,
  preview,
  variant,
  badge,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  preview?: boolean;
  variant: "top" | "bottom";
  badge?: number;
}) {
  const Icon = item.icon;
  const props = {
    "aria-current": active ? ("page" as const) : undefined,
    onClick: preview ? (e: React.MouseEvent) => e.preventDefault() : undefined,
  };
  const content =
    variant === "top" ? (
      <>{item.label}</>
    ) : (
      <>
        <span className="relative">
          <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
          {badge ? (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-on-brand tabular">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-[11px] font-medium leading-none">{item.label}</span>
      </>
    );

  const className =
    variant === "top"
      ? cn(
          "rounded-md px-3 py-2 text-body font-medium transition-colors",
          active ? "bg-sunken text-ink" : "text-ink-muted hover:bg-hover hover:text-ink",
        )
      : cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors",
          active ? "text-brand-ink" : "text-ink-muted hover:text-ink",
        );

  return preview ? (
    <a href={item.href} className={className} {...props}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={className} {...props}>
      {content}
    </Link>
  );
}

/**
 * Consumer layout: slim top bar on every size, bottom tab bar on phones only.
 * Sticky (not fixed) positioning so the shell also renders correctly inside previews.
 */
export function CustomerShell({
  active,
  children,
  preview,
  activeOrders,
  hideNav,
  initials = "AK",
}: {
  active?: CustomerNavKey;
  children: React.ReactNode;
  /** Render inside the design gallery: links don't navigate. */
  preview?: boolean;
  activeOrders?: number;
  /** Focused flows (the order wizard) hide primary navigation. */
  hideNav?: boolean;
  initials?: string;
}) {
  return (
    <div className="@container/shell flex min-h-full flex-col bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 @xl/shell:h-16 @xl/shell:px-6">
          <a href={withBase("/home/")} onClick={preview ? (e) => e.preventDefault() : undefined} aria-label="Quire home">
            <Logo />
          </a>
          {!hideNav ? (
            <nav aria-label="Main" className="hidden items-center gap-1 @3xl/shell:flex">
              {NAV.slice(0, 3).map((item) => (
                <NavLink key={item.key} item={item} active={active === item.key} preview={preview} variant="top" />
              ))}
            </nav>
          ) : null}
          <a
            href="/profile"
            onClick={preview ? (e) => e.preventDefault() : undefined}
            aria-label="Profile"
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-rule-strong bg-surface text-small font-semibold text-ink-2 transition-colors hover:bg-hover",
              hideNav && "hidden",
            )}
          >
            {initials}
          </a>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {!hideNav ? (
        <nav
          aria-label="Main"
          className="sticky bottom-0 z-30 flex border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md @3xl/shell:hidden"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              active={active === item.key}
              preview={preview}
              variant="bottom"
              badge={item.key === "orders" ? activeOrders : undefined}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
