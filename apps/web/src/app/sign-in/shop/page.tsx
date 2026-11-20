"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_SHOP_CODE, SHOPS, shopByCode, shopByOwnerEmail } from "@/lib/demo/shops";
import { actions, useDemo } from "@/lib/demo/store";
import { CredentialsForm, SignInLayout } from "../sign-in-layout";

function ShopSignInForm() {
  const router = useRouter();
  const state = useDemo();
  const initial = shopByCode(useSearchParams().get("shop")) ?? shopByCode(DEFAULT_SHOP_CODE)!;
  const [email, setEmail] = React.useState(initial.ownerEmail);
  const [password, setPassword] = React.useState("quire1234");
  const [error, setError] = React.useState<string | null>(null);
  const selected = shopByOwnerEmail(email);
  const waiting = (code: string) => state?.orders.filter((o) => o.shopCode === code && o.status === "paid").length ?? 0;

  return (
    <SignInLayout
      aside={
        <section aria-labelledby="accounts-title" className="flex flex-col gap-2">
          <h2 id="accounts-title" className="px-1 text-small font-medium text-ink-muted">
            Shop accounts
          </h2>
          <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
            {SHOPS.map((s) => (
              <li key={s.code}>
                <button
                  type="button"
                  aria-pressed={selected?.code === s.code}
                  onClick={() => {
                    setEmail(s.ownerEmail);
                    setError(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover",
                    selected?.code === s.code && "bg-brand-tint hover:bg-brand-tint",
                  )}
                >
                  <Store className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium text-ink">{s.name}</span>
                    <span className="block truncate text-caption text-ink-muted">{s.ownerEmail}</span>
                  </span>
                  {waiting(s.code) ? (
                    <span className="rounded-sm bg-brand px-1.5 text-caption font-semibold text-on-brand tabular">{waiting(s.code)} new</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      }
    >
      <CredentialsForm
        title="Sign in to your shop"
        description={selected ? `${selected.name} · ${selected.area}` : "Manage orders, printers and prices."}
        email={email}
        onEmailChange={(v) => {
          setEmail(v);
          setError(null);
        }}
        password={password}
        onPasswordChange={setPassword}
        error={error}
        submitLabel="Sign in"
        onSubmit={() => {
          const shop = shopByOwnerEmail(email);
          if (!shop) {
            setError("We couldn't find a shop account with that email.");
            return;
          }
          actions.enterAsShop(shop.code, shop.ownerName);
          router.push("/shop");
        }}
        footer={
          <p className="text-center text-small text-ink-muted">
            Ordering prints?{" "}
            <Link href="/sign-in/customer" className="font-medium text-brand-ink hover:underline">
              Customer sign-in
            </Link>
          </p>
        }
      />
    </SignInLayout>
  );
}

export default function ShopSignIn() {
  return (
    <React.Suspense fallback={<div className="min-h-full bg-paper" />}>
      <ShopSignInForm />
    </React.Suspense>
  );
}
