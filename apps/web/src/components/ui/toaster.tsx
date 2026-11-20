"use client";

import { CircleCheck, CircleExclamationPoint, Info, TriangleExclamationPoint } from "lucide-react";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

/** App-wide toast host, styled with design tokens. Top-centre keeps clear of the mobile tab bar. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      gap={8}
      visibleToasts={3}
      icons={{
        success: <CircleCheck className="size-[18px] text-success-ink" aria-hidden />,
        error: <CircleExclamationPoint className="size-[18px] text-danger-ink" aria-hidden />,
        warning: <TriangleExclamationPoint className="size-[18px] text-warning-ink" aria-hidden />,
        info: <Info className="size-[18px] text-info-ink" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(92vw,24rem)] items-start gap-3 rounded-md border border-rule bg-surface p-3.5 text-ink shadow-overlay",
          title: "text-body font-medium",
          description: "text-small text-ink-muted",
          icon: "mt-0.5",
          actionButton:
            "ml-auto shrink-0 rounded-sm px-2 py-1 text-small font-medium text-brand-ink hover:bg-hover",
        },
      }}
    />
  );
}
