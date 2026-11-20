"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type SegmentOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  /** Secondary line, e.g. a price ("₹2 / side"). */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** Accessible name for the group (use `aria-labelledby` when a visible label exists). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Single choice between 2–4 mutually exclusive options (colour mode, sides, orientation).
 * Implements the WAI-ARIA radio group pattern: one tab stop, arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);

  function move(delta: number) {
    const current = enabled.findIndex((o) => o.value === value);
    const next = enabled[(current + delta + enabled.length) % enabled.length];
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      {...aria}
      className={cn(
        "grid gap-1 rounded-md border border-rule bg-sunken p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center rounded-sm px-2 text-center transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40",
              size === "lg" ? "min-h-14 py-2" : "min-h-9 py-1.5",
              selected
                ? "bg-surface text-ink shadow-[0_0_0_1px_var(--rule-strong)]"
                : "text-ink-muted hover:bg-hover hover:text-ink",
            )}
          >
            <span className="flex items-center gap-1.5 text-small font-medium [&_svg]:size-4">
              {option.icon}
              {option.label}
            </span>
            {option.description ? (
              <span className={cn("text-caption tabular", selected ? "text-ink-muted" : "text-ink-faint")}>
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
