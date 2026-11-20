import { ChevronUp, FlaskConical } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/format";

export type PriceLine = { label: string; detail?: string; paise: number };

/** Itemised price: one line per file plus finishing, then the total. */
export function PriceSummary({
  lines,
  totalPaise,
  testMode,
  className,
}: {
  lines: PriceLine[];
  totalPaise: number;
  testMode?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="flex flex-col gap-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4">
            <dt className="min-w-0">
              <span className="text-body text-ink-2">{line.label}</span>
              {line.detail ? <span className="block text-small text-ink-muted">{line.detail}</span> : null}
            </dt>
            <dd className="text-body tabular text-ink">{formatPaise(line.paise)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-rule pt-4">
        <span className="text-body font-semibold text-ink">Total</span>
        <span className="text-title font-semibold tabular text-ink">{formatPaise(totalPaise)}</span>
      </div>
      {testMode ? (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-warning-ink">
          <FlaskConical className="size-3.5" aria-hidden />
          Test mode — no money will be charged.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sticky bottom bar on phones: total + the one primary action. Tapping the total reveals
 * the breakdown so the price is never a surprise.
 */
export function CheckoutBar({
  totalPaise,
  summary,
  actionLabel,
  onAction,
  disabled,
  loading,
  className,
}: {
  totalPaise: number;
  summary: string;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-rule bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-title-sm font-semibold tabular text-ink">
          {formatPaise(totalPaise)}
          <ChevronUp className="size-4 text-ink-muted" aria-hidden />
        </p>
        <p className="truncate text-caption text-ink-muted">{summary}</p>
      </div>
      <Button size="lg" onClick={onAction} disabled={disabled} loading={loading}>
        {actionLabel}
      </Button>
    </div>
  );
}
