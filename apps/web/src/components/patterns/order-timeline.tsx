import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { CUSTOMER_TIMELINE, statusCopy, TONE_CLASSES, type OrderStatus, type PrintMode } from "@/lib/status";

export type TimelineEvent = { status: OrderStatus; at?: string; note?: string };

/**
 * Vertical progress for the customer. Done stages are checked, the current stage carries
 * its status colour and a plain-language hint, upcoming stages are quiet.
 * `mode` is required so a simulated order's stages never read as real printing or pickup.
 */
export function OrderTimeline({
  current,
  mode,
  events,
  className,
}: {
  current: OrderStatus;
  mode: PrintMode;
  events: Partial<Record<OrderStatus, TimelineEvent>>;
  className?: string;
}) {
  const currentIndex = CUSTOMER_TIMELINE.indexOf(current);

  return (
    <ol className={cn("flex flex-col", className)}>
      {CUSTOMER_TIMELINE.map((status, i) => {
        const meta = statusCopy(status, mode);
        const done = i < currentIndex || (i === currentIndex && status === "completed");
        const active = i === currentIndex && !done;
        const last = i === CUSTOMER_TIMELINE.length - 1;
        const event = events[status];
        const Icon = meta.icon;

        return (
          <li key={status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={active ? "step" : undefined}>
            {!last ? (
              <span
                aria-hidden
                className={cn("absolute left-[13px] top-8 bottom-1 w-[2px] rounded-full", done ? "bg-brand" : "bg-rule")}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                done && "bg-brand text-on-brand",
                active && cn(TONE_CLASSES[meta.tone].badge, "ring-4 ring-paper"),
                !done && !active && "border border-rule-strong bg-surface text-ink-faint",
              )}
            >
              {done ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              ) : (
                <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-body",
                  active ? "font-semibold text-ink" : done ? "font-medium text-ink" : "text-ink-muted",
                )}
              >
                {meta.customerLabel}
                {event?.at ? <span className="ml-2 text-small font-normal text-ink-muted tabular">{event.at}</span> : null}
              </p>
              {active ? <p className="mt-0.5 text-small text-ink-2">{event?.note ?? meta.customerHint}</p> : null}
              {!active && event?.note ? <p className="mt-0.5 text-small text-ink-muted">{event.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
