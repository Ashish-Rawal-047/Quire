"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useFieldControl } from "./field";

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Used for button labels: "Decrease copies". */
  unit?: string;
  className?: string;
  id?: string;
}

/** Copies and other small counts. Typing is allowed; the value is clamped on blur. */
export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  unit = "value",
  className,
  id,
}: NumberStepperProps) {
  const field = useFieldControl();
  // While typing, show the draft; otherwise always reflect the controlled value.
  const [draft, setDraft] = React.useState<string | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(null);
    if (next !== value) onChange(next);
  };

  const stepButton =
    "flex size-10 items-center justify-center text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:size-4";

  return (
    <div
      className={cn(
        "inline-flex h-10 w-fit self-start items-stretch overflow-hidden rounded-md border border-rule-strong bg-surface",
        "focus-within:border-focus focus-within:shadow-[0_0_0_3px_var(--brand-tint-strong)]",
        className,
      )}
    >
      <button
        type="button"
        className={cn(stepButton, "border-r border-rule")}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${unit}`}
      >
        <Minus aria-hidden />
      </button>
      <input
        id={id ?? field?.id}
        aria-describedby={field?.describedBy}
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(clamp(value + 1));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(value - 1));
          }
        }}
        className="w-12 bg-transparent text-center text-input font-medium tabular text-ink outline-none sm:text-body"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        role="spinbutton"
      />
      <button
        type="button"
        className={cn(stepButton, "border-l border-rule")}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${unit}`}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
