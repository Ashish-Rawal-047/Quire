import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Where am I in the order flow? Phones get a compact "Step 3 of 6" header with a segmented
 * bar; wider screens get the full labelled list.
 */
export function StepIndicator({
  steps,
  current,
  className,
}: {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}) {
  return (
    <nav aria-label="Order progress" className={cn("@container", className)}>
      {/* Compact (phones) */}
      <div className="@2xl:hidden">
        <p className="text-small text-ink-muted">
          Step {current + 1} of {steps.length}
          <span className="text-ink"> · {steps[current]}</span>
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((step, i) => (
            <span
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= current ? "bg-brand" : "bg-rule",
              )}
            />
          ))}
        </div>
      </div>

      {/* Full (tablet and up) */}
      <ol className="hidden items-center gap-2 @2xl:flex">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step} className="flex min-w-0 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-small",
                  active ? "font-medium text-ink" : done ? "text-ink-2" : "text-ink-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold tabular",
                    done && "bg-brand text-on-brand",
                    active && "border-[1.5px] border-brand text-brand-ink",
                    !done && !active && "border border-rule-strong text-ink-muted",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Done" /> : i + 1}
                </span>
                <span className="truncate">{step}</span>
              </span>
              {i < steps.length - 1 ? (
                <span aria-hidden className={cn("h-px w-6 @3xl:w-10", done ? "bg-brand" : "bg-rule-strong")} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
