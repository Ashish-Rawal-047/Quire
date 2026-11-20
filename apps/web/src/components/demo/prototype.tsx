"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Skeleton } from "@/components/ui/feedback";
import { useDemo } from "@/lib/demo/store";
import type { DemoState } from "@/lib/demo/types";

/**
 * Renders children only once the demo state is loaded and the required demo entry exists;
 * otherwise sends the visitor to the matching entry page.
 */
export function useDemoGuard(role: "customer" | "shop"): DemoState | null {
  const state = useDemo();
  const router = useRouter();
  const missing = state !== null && (role === "customer" ? !state.customer : !state.shopSession);
  React.useEffect(() => {
    if (missing) router.replace(role === "customer" ? "/sign-in/customer" : "/sign-in/shop");
  }, [missing, role, router]);
  return state && !missing ? state : null;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
