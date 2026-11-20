"use client";

import {
  Ban,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Layers,
  Lock,
  MapPin,
  Printer,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  Store,
  Upload,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";
import { ORDER_STATUS, statusCopy, TONE_CLASSES, type OrderStatus } from "@/lib/status";
import { GallerySection, Specimen, Token } from "../_components/section";

function useThemeValue(variable: string) {
  const [value, setValue] = React.useState("");
  React.useEffect(() => {
    const read = () =>
      setValue(getComputedStyle(document.documentElement).getPropertyValue(variable).trim().toUpperCase());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [variable]);
  return value;
}

function Swatch({ name, variable, use, border }: { name: string; variable: string; use: string; border?: boolean }) {
  const value = useThemeValue(variable);
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn("size-11 shrink-0 rounded-md", border && "shadow-[inset_0_0_0_1px_var(--rule-strong)]")}
        style={{ background: `var(${variable})` }}
      />
      <div className="min-w-0">
        <p className="text-small font-medium text-ink">{name}</p>
        <p className="truncate text-caption text-ink-muted">
          <span className="font-mono">{value || "…"}</span> · {use}
        </p>
      </div>
    </div>
  );
}

const SURFACES = [
  { name: "Paper", variable: "--paper", use: "Page background", border: true },
  { name: "Surface", variable: "--surface", use: "Panels, inputs", border: true },
  { name: "Sunken", variable: "--sunken", use: "Wells, tracks", border: true },
  { name: "Rule", variable: "--rule", use: "Hairlines" },
  { name: "Rule strong", variable: "--rule-strong", use: "Control borders" },
];
const INKS = [
  { name: "Ink", variable: "--ink", use: "Primary text" },
  { name: "Ink 2", variable: "--ink-2", use: "Secondary text" },
  { name: "Ink muted", variable: "--ink-muted", use: "Meta, hints" },
  { name: "Ink faint", variable: "--ink-faint", use: "Placeholders only" },
];
const BRAND = [
  { name: "Quire blue", variable: "--brand", use: "Primary actions" },
  { name: "Brand ink", variable: "--brand-ink", use: "Links, selected text" },
  { name: "Brand tint", variable: "--brand-tint", use: "Selected fills", border: true },
  { name: "Focus", variable: "--focus", use: "Focus rings" },
];
const FEEDBACK = [
  { name: "Danger", variable: "--danger", use: "Destructive, errors" },
  { name: "Warning ink", variable: "--warning-ink", use: "Caution, simulated" },
  { name: "Success ink", variable: "--success-ink", use: "Confirmations" },
  { name: "Info ink", variable: "--info-ink", use: "Neutral notices" },
];

const TYPE_SCALE = [
  { token: "display-lg", spec: "56/60 · Jakarta 800", sample: "Print privately.", className: "font-display text-display-lg font-extrabold" },
  { token: "display", spec: "40/46 · Jakarta 800", sample: "Your file, your rules.", className: "font-display text-display font-extrabold" },
  { token: "headline", spec: "30/36 · Jakarta 600", sample: "Ready for pickup", className: "text-headline font-semibold" },
  { token: "title", spec: "22/28 · Jakarta 600", sample: "Print settings", className: "text-title font-semibold" },
  { token: "title-sm", spec: "17/24 · Jakarta 600", sample: "Sharma Xerox & Stationery", className: "text-title-sm font-semibold" },
  { token: "body-lg", spec: "17/26 · Jakarta 400", sample: "Upload, pay and collect when it's ready.", className: "text-body-lg" },
  { token: "body", spec: "15/24 · Jakarta 400", sample: "The shop can print your file but can't download it.", className: "text-body" },
  { token: "small", spec: "13/20 · Jakarta 400/500", sample: "Lajpat Nagar II · 110024 · 0.4 km", className: "text-small" },
  { token: "caption", spec: "12/16 · Jakarta 500", sample: "PICKUP CODE", className: "text-caption font-medium tracking-[0.08em]" },
  { token: "mono", spec: "Geist Mono · codes only", sample: "PF-2611-0418 · QX7K2P · 4821", className: "font-mono text-body" },
];

const ICONS = [
  { icon: Upload, name: "Upload" },
  { icon: Printer, name: "Printer" },
  { icon: ShieldCheck, name: "ShieldCheck" },
  { icon: Lock, name: "Lock" },
  { icon: Eye, name: "Eye" },
  { icon: Download, name: "Download" },
  { icon: Store, name: "Store" },
  { icon: MapPin, name: "MapPin" },
  { icon: Search, name: "Search" },
  { icon: ReceiptText, name: "ReceiptText" },
  { icon: FileText, name: "FileText" },
  { icon: Layers, name: "Layers" },
  { icon: ScanLine, name: "ScanLine" },
  { icon: Check, name: "Check" },
  { icon: Ban, name: "Ban" },
  { icon: ChevronRight, name: "ChevronRight" },
];

const STATUS_ORDER: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "accepted",
  "printing",
  "ready",
  "completed",
  "cancelled",
];

export function Foundations() {
  return (
    <GallerySection
      id="foundations"
      eyebrow="Foundations"
      title="Paper & ink"
      intro={
        <p>
          White surfaces, navy-charcoal type and a single blue. The palette is deliberately small: colour is
          reserved for actions, selection and order status, so it always means something.
        </p>
      }
    >
      <Specimen
        title="Principles"
        notes="How to decide when the system doesn't say."
      >
        <ul className="grid gap-6 sm:grid-cols-3">
          {[
            ["Trust", "Say what we do and what we can't. Privacy copy is plain, specific and never absolute."],
            ["Simplicity", "One primary action per screen. Defaults are sensible; options appear when they matter."],
            ["Efficiency", "Shop screens favour density, alignment and keyboard speed over decoration."],
          ].map(([title, body]) => (
            <li key={title}>
              <p className="text-body font-semibold text-ink">{title}</p>
              <p className="mt-1 text-small text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen
        title="Colour"
        notes={
          <>
            Values update with the theme. Text tokens meet WCAG AA on paper and surface; <Token>ink-faint</Token> is for
            placeholders and decoration only.
          </>
        }
      >
        <div className="grid gap-8 md:grid-cols-2">
          {[
            ["Surfaces", SURFACES],
            ["Ink", INKS],
            ["Brand", BRAND],
            ["Feedback", FEEDBACK],
          ].map(([label, list]) => (
            <div key={label as string}>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">{label as string}</p>
              <div className="grid gap-3">
                {(list as typeof SURFACES).map((s) => (
                  <Swatch key={s.variable} {...s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Order status"
        notes="One hue per stage, used identically in badges, timelines, queues and filters. Always icon + words, never colour alone."
      >
        <div className="grid gap-2">
          {STATUS_ORDER.map((status) => {
            const meta = ORDER_STATUS[status];
            const Icon = meta.icon;
            return (
              <div key={status} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-0.5 sm:grid-cols-[10rem_13rem_1fr]">
                <span
                  className={cn(
                    "inline-flex h-6 w-fit items-center gap-1 rounded-sm px-2 text-small font-medium",
                    TONE_CLASSES[meta.tone].badge,
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
                  {meta.shopLabel}
                </span>
                <span className="text-small text-ink-2">
                  <span className="text-ink-muted">Customer sees </span>
                  {meta.customerLabel}
                </span>
                <span className="col-span-2 text-small text-ink-muted sm:col-span-1">{meta.customerHint}</span>
              </div>
            );
          })}
          <p className="mt-3 text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">
            Simulated orders (Phase 1) · wording replaced from printing onwards
          </p>
          {(["printing", "ready", "completed", "uncollected"] as const).map((status) => {
            const meta = statusCopy(status, "simulated");
            const Icon = meta.icon;
            return (
              <div key={`sim-${status}`} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-0.5 sm:grid-cols-[10rem_13rem_1fr]">
                <span
                  className={cn(
                    "inline-flex h-6 w-fit items-center gap-1 rounded-sm px-2 text-small font-medium",
                    TONE_CLASSES[meta.tone].badge,
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
                  {meta.shopLabel}
                </span>
                <span className="text-small text-ink-2">
                  <span className="text-ink-muted">Customer sees </span>
                  {meta.customerLabel}
                </span>
                <span className="col-span-2 text-small text-ink-muted sm:col-span-1">{meta.customerHint}</span>
              </div>
            );
          })}
        </div>
      </Specimen>

      <Specimen
        title="Typography"
        notes={
          <>
            Plus Jakarta Sans for everything, from landing headlines to labels; Geist Mono for codes; tabular figures for prices and counts. Headlines use the heaviest weight with tight tracking. Inputs render at 16px on phones to prevent zoom-on-focus.
          </>
        }
      >
        <div className="divide-y divide-rule">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="grid gap-1 py-4 first:pt-0 last:pb-0 md:grid-cols-[9rem_1fr] md:items-baseline md:gap-6">
              <div>
                <Token>{t.token}</Token>
                <p className="mt-1 text-caption text-ink-muted">{t.spec}</p>
              </div>
              <p className={cn("min-w-0 text-ink", t.className)}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Spacing & shape"
        notes={
          <>
            4-pt grid. Three radii only: <Token>sm 6</Token> small controls & badges, <Token>md 10</Token> buttons &
            inputs, <Token>lg 14</Token> containers. One shadow, for overlays.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <span className="w-14 font-mono text-caption text-ink-muted">{n * 4}px</span>
                <span className="h-3 rounded-[2px] bg-brand-tint-strong" style={{ width: n * 4 * 2 }} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-5">
            {[
              ["sm · 6", "rounded-sm", "size-12"],
              ["md · 10", "rounded-md", "size-16"],
              ["lg · 14", "rounded-lg", "size-20"],
            ].map(([label, radius, size]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className={cn("border border-rule-strong bg-sunken", radius, size)} />
                <span className="font-mono text-caption text-ink-muted">{label}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <span className="size-20 rounded-lg bg-surface shadow-overlay" />
              <span className="font-mono text-caption text-ink-muted">overlay</span>
            </div>
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Iconography"
        notes="Lucide only, 1.75px stroke on 24px, rendered at 16/18/20px. Icons support words; they rarely replace them."
      >
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {ICONS.map(({ icon: Icon, name }) => (
            <div key={name} className="flex flex-col items-center gap-2 rounded-md py-3 text-ink-2">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              <span className="max-w-full truncate text-caption text-ink-muted">{name}</span>
            </div>
          ))}
        </div>
      </Specimen>
    </GallerySection>
  );
}
