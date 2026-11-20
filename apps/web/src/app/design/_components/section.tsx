import * as React from "react";
import { cn } from "@/lib/cn";

export function GallerySection({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-rule py-14 first:border-t-0 first:pt-4">
      <p className="text-small font-medium text-brand-ink">{eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-1 text-headline font-semibold text-ink">
        {title}
      </h2>
      {intro ? <div className="mt-2 max-w-2xl text-body-lg text-ink-2">{intro}</div> : null}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </section>
  );
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A titled example: label + notes on the left of wide screens, the live example on the right. */
export function Specimen({
  title,
  notes,
  children,
  className,
  bleed,
}: {
  title: string;
  notes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Let the example use the full width under the label. */
  bleed?: boolean;
}) {
  return (
    <div id={slugify(title)} className={cn("grid scroll-mt-24 gap-4", bleed ? null : "xl:grid-cols-[14rem_1fr] xl:gap-8")}>
      <div>
        <h3 className="text-title-sm font-semibold text-ink">{title}</h3>
        {notes ? <div className="mt-1 text-small text-ink-muted">{notes}</div> : null}
      </div>
      <div className={cn("min-w-0 rounded-lg border border-rule bg-surface p-5 sm:p-6", className)}>{children}</div>
    </div>
  );
}

export function Token({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[4px] bg-sunken px-1 py-px font-mono text-caption text-ink-2">{children}</code>;
}
