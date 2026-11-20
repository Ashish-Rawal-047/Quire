import { cva, type VariantProps } from "class-variance-authority";
import { FlaskConical } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";
import { statusCopy, TONE_CLASSES, type OrderStatus, type PrintMode } from "@/lib/status";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-sunken text-ink-2",
        brand: "bg-brand-tint text-brand-ink",
        outline: "border border-rule-strong text-ink-2",
        success: "bg-success-tint text-success-ink",
        warning: "bg-warning-tint text-warning-ink",
        danger: "bg-danger-tint text-danger-ink",
        info: "bg-info-tint text-info-ink",
      },
      size: {
        sm: "h-5 px-1.5 text-caption [&_svg]:size-3",
        md: "h-6 px-2 text-small [&_svg]:size-3.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/**
 * Order status, identical everywhere: colour + icon + words (never colour alone).
 * `audience` picks the vocabulary — shops say "New", customers see "Sent to shop".
 * `mode` is required: a simulated order never shows "Printing" or "Ready for pickup" as if
 * paper existed.
 */
export function StatusBadge({
  status,
  mode,
  audience = "shop",
  size = "md",
  className,
}: {
  status: OrderStatus;
  mode: PrintMode;
  audience?: "shop" | "customer";
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = statusCopy(status, mode);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium",
        size === "sm" ? "h-5 px-1.5 text-caption" : "h-6 px-2 text-small",
        TONE_CLASSES[meta.tone].badge,
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden strokeWidth={2.25} />
      {audience === "shop" ? meta.shopLabel : meta.customerLabel}
    </span>
  );
}

/** A small coloured dot + label for dense lists (queue rows, printer lists). */
export function StatusDot({ tone, children }: { tone: keyof typeof TONE_CLASSES; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-small text-ink-2">
      <span aria-hidden className={cn("size-2 rounded-full", TONE_CLASSES[tone].dot)} />
      {children}
    </span>
  );
}

/**
 * The mandatory label for anything the print agent simulates. Wording is fixed on purpose —
 * do not shorten it: users must never mistake a simulated job for real paper output.
 */
export function SimulatedTag({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border border-dashed border-warning-ink/50 bg-warning-tint px-1.5 font-mono text-caption font-medium uppercase tracking-wide text-warning-ink",
        compact ? "h-5" : "h-6",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {compact ? "Simulated" : "Simulated — no paper printed"}
    </span>
  );
}
