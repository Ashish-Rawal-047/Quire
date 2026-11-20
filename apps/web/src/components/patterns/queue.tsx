import { Download, MessageSquareText, Palette, ShieldCheck } from "lucide-react";
import { SimulatedTag, StatusBadge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { formatPaise, pluralize } from "@/lib/format";
import type { SampleQueueOrder } from "@/lib/sample-data";

/**
 * One order in the shop queue. Dense but legible: everything needed to triage at a glance,
 * aligned in fixed columns so the eye can scan down. Age turns amber after 10 minutes.
 */
export function QueueRow({
  order,
  selected,
  onSelect,
}: {
  order: SampleQueueOrder;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const stale = order.status === "paid" && order.minutesAgo >= 10;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2",
        selected ? "bg-brand-tint" : "hover:bg-hover",
      )}
    >
      {selected ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" /> : null}
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-small font-medium text-ink">{order.number}</span>
        <span className="truncate text-small text-ink-2">· {order.customer}</span>
      </div>
      <span className={cn("text-small tabular", stale ? "font-medium text-warning-ink" : "text-ink-muted")}>
        {order.minutesAgo} min
      </span>

      <div className="flex min-w-0 items-center gap-2 text-small text-ink-muted">
        <span className="tabular">
          {pluralize(order.items, "file")} · {pluralize(order.pages, "page")}
        </span>
        {order.colour ? (
          <Tooltip content="Includes colour pages">
            <span className="inline-flex text-st-printing-ink">
              <Palette className="size-3.5" aria-label="Colour" />
            </span>
          </Tooltip>
        ) : null}
        {order.protectedMode ? (
          <Tooltip content="Protected — print only, no download">
            <span className="inline-flex text-brand-ink">
              <ShieldCheck className="size-3.5" aria-label="Protected" />
            </span>
          </Tooltip>
        ) : (
          <Tooltip content="Customer allowed download">
            <span className="inline-flex text-ink-muted">
              <Download className="size-3.5" aria-label="Download allowed" />
            </span>
          </Tooltip>
        )}
        {order.note ? (
          <Tooltip content={order.note}>
            <span className="inline-flex">
              <MessageSquareText className="size-3.5" aria-label="Has instructions" />
            </span>
          </Tooltip>
        ) : null}
      </div>
      <span className="text-small font-medium tabular text-ink">{formatPaise(order.totalPaise)}</span>

      <div className="col-span-2 mt-1">
        <StatusBadge status={order.status} mode={order.printMode} size="sm" />
      </div>
    </button>
  );
}

export type SamplePrinter = {
  name: string;
  model: string;
  colour: boolean;
  duplex: boolean;
  sizes: string[];
  state: "idle" | "printing" | "offline" | "error";
  detail?: string;
  simulated: boolean;
};

const PRINTER_STATE = {
  idle: { label: "Ready", dot: "bg-st-ready", ink: "text-st-ready-ink" },
  printing: { label: "Printing", dot: "bg-st-printing", ink: "text-st-printing-ink" },
  offline: { label: "Offline", dot: "bg-ink-faint", ink: "text-ink-muted" },
  error: { label: "Needs attention", dot: "bg-danger", ink: "text-danger-ink" },
} as const;

export function PrinterRow({ printer }: { printer: SamplePrinter }) {
  const state = PRINTER_STATE[printer.state];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-medium text-ink">{printer.name}</p>
          {printer.simulated ? <SimulatedTag compact /> : null}
        </div>
        <p className="mt-0.5 text-small text-ink-muted">
          {printer.model} · {printer.colour ? "Colour" : "B&W only"} · {printer.duplex ? "Double-sided" : "Single-sided"} ·{" "}
          {printer.sizes.join(", ")}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("inline-flex items-center gap-1.5 text-small font-medium", state.ink)}>
          <span aria-hidden className={cn("size-2 rounded-full", state.dot)} />
          {state.label}
        </p>
        {printer.detail ? <p className="text-caption text-ink-muted">{printer.detail}</p> : null}
      </div>
    </div>
  );
}
