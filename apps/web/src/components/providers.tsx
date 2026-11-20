"use client";

import { LucideProvider } from "lucide-react";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tabs";

/** App-wide client providers: icon defaults (1.75px stroke everywhere) and tooltip timing. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LucideProvider strokeWidth={1.75}>
      <TooltipProvider delayDuration={300} skipDelayDuration={200}>
        {children}
      </TooltipProvider>
    </LucideProvider>
  );
}
