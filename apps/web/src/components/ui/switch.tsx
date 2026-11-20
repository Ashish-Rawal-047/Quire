"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-150",
        "bg-rule-strong data-[state=checked]:bg-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Expand the hit area to 40px without changing the visual size.
        "before:absolute before:-inset-2 before:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)]",
          "translate-x-px transition-transform duration-150 ease-out data-[state=checked]:translate-x-[17px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
});

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-rule-strong bg-surface transition-colors duration-150",
        "hover:border-ink-faint data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        "before:absolute before:-inset-2.5 before:content-['']",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-on-brand">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

/** A labelled row: control + label + optional description, the whole row clickable. */
export function ToggleRow({
  id,
  label,
  description,
  control,
  className,
}: {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-body font-medium text-ink">{label}</span>
        {description ? <span className="block text-small text-ink-muted">{description}</span> : null}
      </label>
      <div className="pt-0.5">{control}</div>
    </div>
  );
}
