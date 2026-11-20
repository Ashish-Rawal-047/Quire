"use client";

import { Banknote, MapPin, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import * as React from "react";
import { SimulatedTag, StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/format";
import type { OrderStatus, PrintMode } from "@/lib/status";

/** Renders a QR code as inline SVG (crisp at any size, themeable, no network). */
export function QrCode({ value, className, label }: { value: string; className?: string; label: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f1b2d", light: "#ffffff" } })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("aspect-square bg-white p-2 [&_svg]:h-full [&_svg]:w-full", className)}
      // The SVG string is generated locally by the qrcode library from our own value.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

/**
 * The order confirmation, styled as a print-job ticket — Quire's signature object.
 * The QR encodes an opaque pickup token, never personal data or a public URL.
 *
 * `printMode` is required. For a simulated order the ticket says so at the top, and the code is
 * shown as a demo code that is explicitly not valid for collecting anything (no prints exist).
 */
export function JobTicket({
  orderNumber,
  pickupCode,
  pickupToken,
  shopName,
  shopArea,
  status,
  summary,
  totalPaise,
  protectedMode,
  printMode,
  payNote,
  className,
}: {
  orderNumber: string;
  pickupCode: string;
  pickupToken: string;
  shopName: string;
  shopArea: string;
  status: OrderStatus;
  summary: string;
  totalPaise: number;
  protectedMode: boolean;
  printMode: PrintMode;
  /** e.g. "Pay ₹24 in cash at pickup", shown under the total. */
  payNote?: string;
  className?: string;
}) {
  const simulated = printMode === "simulated";
  return (
    <article
      aria-label={`Order ${orderNumber}`}
      className={cn("relative mx-auto w-full max-w-sm rounded-lg border border-rule bg-surface", className)}
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">Print job</p>
          <p className="mt-1 font-mono text-title-sm font-semibold tracking-tight text-ink">{orderNumber}</p>
        </div>
        <StatusBadge status={status} mode={printMode} audience="customer" />
      </div>

      {simulated ? (
        <div className="mx-5 mb-4 rounded-md border border-dashed border-warning-ink/40 bg-warning-tint px-3 py-2.5">
          <SimulatedTag />
          <p className="mt-1.5 text-small text-warning-ink">
            This shop uses Quire&rsquo;s simulated printer. Nothing is printed, so there is nothing to collect.
          </p>
        </div>
      ) : null}

      <div className="px-5 pb-5">
        <p className="text-body font-medium text-ink">{shopName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-small text-ink-muted">
          <MapPin className="size-3.5" aria-hidden />
          {shopArea}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-small">
          <span className="text-ink-2">{summary}</span>
          <span className="font-medium tabular text-ink">{formatPaise(totalPaise)}</span>
        </div>
        {payNote ? (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-warning-tint px-2.5 py-1.5 text-small font-medium text-warning-ink">
            <Banknote className="size-4 shrink-0" aria-hidden />
            {payNote}
          </p>
        ) : null}
        {protectedMode ? (
          <p className="mt-2 flex items-center gap-1.5 text-small text-brand-ink">
            <ShieldCheck className="size-4" aria-hidden />
            Protected printing
          </p>
        ) : null}
      </div>

      {/* Tear line with punched notches */}
      <div className="relative" aria-hidden>
        <span className="absolute -left-px top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rule bg-paper [clip-path:inset(0_0_0_50%)]" />
        <span className="absolute -right-px top-1/2 size-4 -translate-y-1/2 translate-x-1/2 rounded-full border border-rule bg-paper [clip-path:inset(0_50%_0_0)]" />
        <div className="perforation mx-4" />
      </div>

      <div className="flex items-center gap-5 px-5 py-5">
        <div className="relative w-28 shrink-0">
          <QrCode
            value={pickupToken}
            label={simulated ? "Demo QR code, not valid for collection" : "Pickup QR code"}
            className={cn("w-28 rounded-sm border border-rule", simulated && "opacity-35")}
          />
          {simulated ? (
            <span
              aria-hidden
              className="absolute inset-x-1 top-1/2 -translate-y-1/2 -rotate-12 rounded-sm border border-warning-ink/50 bg-warning-tint py-0.5 text-center font-mono text-caption font-semibold uppercase tracking-[0.2em] text-warning-ink"
            >
              Demo
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">
            {simulated ? "Demo code" : "Pickup code"}
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-[34px] font-semibold leading-none tracking-[0.12em] tabular",
              simulated ? "text-ink-muted" : "text-ink",
            )}
          >
            {pickupCode}
          </p>
          <p className="mt-2 text-small text-ink-muted">
            {simulated
              ? "For trying the pickup check only. Not valid for collecting anything — no prints exist."
              : "Show this at the counter when you collect."}
          </p>
        </div>
      </div>
    </article>
  );
}
