"use client";

import { RadioGroup } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Large, plainly-worded radio options — used where a choice deserves explanation (privacy mode). */
export const ChoiceCardGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroup.Root>
>(function ChoiceCardGroup({ className, ...props }, ref) {
  return <RadioGroup.Root ref={ref} className={cn("grid gap-3", className)} {...props} />;
});

export interface ChoiceCardProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroup.Item>, "title"> {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Short tag beside the title, e.g. "Recommended". */
  tag?: React.ReactNode;
  children?: React.ReactNode;
}

export const ChoiceCard = React.forwardRef<
  React.ComponentRef<typeof RadioGroup.Item>,
  ChoiceCardProps
>(function ChoiceCard({ className, title, icon, tag, children, ...props }, ref) {
  return (
    <RadioGroup.Item
      ref={ref}
      className={cn(
        "group relative w-full rounded-lg border border-rule-strong bg-surface p-4 text-left transition-[border-color,background-color,box-shadow] duration-150 sm:p-5",
        "hover:border-ink-faint",
        "data-[state=checked]:border-brand data-[state=checked]:shadow-[0_0_0_1px_var(--brand)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2 transition-colors group-data-[state=checked]:bg-brand-tint group-data-[state=checked]:text-brand-ink [&_svg]:size-[18px]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
            <span className="text-title-sm font-semibold text-ink">{title}</span>
            {tag}
          </div>
          {children ? <div className="mt-1.5 text-small text-ink-2">{children}</div> : null}
        </div>
      </div>
      <span
        aria-hidden
        className="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border border-rule-strong bg-surface transition-colors group-data-[state=checked]:border-brand sm:right-5 sm:top-5"
      >
        <RadioGroup.Indicator className="size-2.5 rounded-full bg-brand" />
      </span>
    </RadioGroup.Item>
  );
});
