import {
  CircleCheck,
  CircleExclamationPoint,
  Info,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Loading placeholder that mirrors the shape of real content. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-rule", className)} {...props} />;
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-md border border-rule bg-surface text-ink-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-title-sm font-semibold text-ink">{title}</h3>
      {children ? <p className="mt-1 max-w-sm text-body text-ink-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Determinate when `value` is given (0–100), otherwise indeterminate. */
export function ProgressBar({
  value,
  label,
  className,
  tone = "brand",
}: {
  value?: number;
  label: string;
  className?: string;
  tone?: "brand" | "danger";
}) {
  const determinate = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          tone === "danger" ? "bg-danger" : "bg-brand",
          determinate ? null : "w-2/5 animate-indeterminate",
        )}
        style={determinate ? { width: `${Math.max(0, Math.min(100, value))}%` } : undefined}
      />
    </div>
  );
}

const CALLOUT = {
  info: { icon: Info, classes: "bg-info-tint text-info-ink" },
  success: { icon: CircleCheck, classes: "bg-success-tint text-success-ink" },
  warning: { icon: TriangleExclamationPoint, classes: "bg-warning-tint text-warning-ink" },
  danger: { icon: CircleExclamationPoint, classes: "bg-danger-tint text-danger-ink" },
  neutral: { icon: Info, classes: "bg-sunken text-ink-2" },
} as const;

/** Inline, non-blocking message inside a page or panel. */
export function Callout({
  tone = "info",
  title,
  children,
  action,
  icon,
  className,
}: {
  tone?: keyof typeof CALLOUT;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const Icon = icon ?? CALLOUT[tone].icon;
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-md px-3.5 py-3", CALLOUT[tone].classes, className)}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-small">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : null, "text-ink-2")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-rule-strong bg-surface px-1 font-mono text-caption text-ink-muted">
      {children}
    </kbd>
  );
}
