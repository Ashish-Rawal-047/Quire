"use client";

import { ArrowRight } from "lucide-react";
import { IconCustomer, IconShop } from "@/components/demo/illustrated-icons";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/demo/store";
import { shopByCode } from "@/lib/demo/shops";

function EntryCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  resume,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  resume?: string | null;
  tone: "brand" | "ink";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 sm:p-7",
        tone === "brand"
          ? "border-brand bg-[linear-gradient(150deg,#2563eb_0%,#1d4ed8_55%,#1e40af_100%)] text-on-brand shadow-[0_18px_40px_-18px_rgb(29_78_216/0.7)] hover:shadow-[0_24px_48px_-16px_rgb(29_78_216/0.75)]"
          : "border-rule-strong bg-surface text-ink shadow-[0_10px_30px_-20px_rgb(15_27_45/0.35)] hover:border-brand/40 hover:shadow-[0_20px_40px_-20px_rgb(29_78_216/0.4)]",
      )}
    >
      {/* soft decorative circle behind the illustration */}
      <span
        aria-hidden
        className={cn(
          "absolute -right-10 -top-10 size-40 rounded-full transition-transform duration-500 group-hover:scale-110",
          tone === "brand" ? "bg-white/10" : "bg-brand-tint",
        )}
      />
      <span className="relative flex size-16 items-center justify-center transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
        {icon}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className={cn("text-caption font-medium uppercase tracking-[0.08em]", tone === "brand" ? "text-on-brand/75" : "text-ink-muted")}>
          {eyebrow}
        </span>
        <span className="text-title font-semibold">{title}</span>
        <span className={cn("text-body", tone === "brand" ? "text-on-brand/85" : "text-ink-2")}>{description}</span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className={cn("truncate text-small", tone === "brand" ? "text-on-brand/80" : "text-ink-muted")}>
          {resume ?? "Sign in to continue"}
        </span>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full text-small font-semibold transition-all duration-300 group-hover:w-[6.5rem]",
            tone === "brand" ? "bg-white text-brand-ink" : "bg-brand text-on-brand",
          )}
        >
          <span className="hidden whitespace-nowrap group-hover:inline">Let&rsquo;s go</span>
          <ArrowRight className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

export function LandingEntry() {
  const state = useDemo();
  const shop = shopByCode(state?.shopSession?.shopCode);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <EntryCard
        href={state?.customer ? "/home" : "/sign-in/customer"}
        icon={<IconCustomer inverse className="size-16" />}
        eyebrow="For customers"
        title="Continue as Customer"
        description="Find a nearby shop, upload a document, choose print settings, pay and track your order."
        resume={state?.customer ? `Continue as ${state.customer.name}` : null}
        tone="brand"
      />
      <EntryCard
        href={state?.shopSession ? "/shop" : "/sign-in/shop"}
        icon={<IconShop className="size-16" />}
        eyebrow="For print shops"
        title="Continue as Shop Owner"
        description="Review incoming orders, preview files, print them and hand them over with a pickup code."
        resume={shop ? `Continue at ${shop.name}` : null}
        tone="ink"
      />
    </div>
  );
}
