import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * The one container style. Use sparingly: group related content with spacing and rules
 * first; reach for a Panel only when content genuinely needs a boundary.
 */
export function Panel({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "aside" }) {
  return <Tag className={cn("rounded-lg border border-rule bg-surface", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4", className)}>
      <div className="min-w-0">
        <h3 className="text-title-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Label/value rows for summaries ("Paper  A4"). */
export function DataList({ items, className }: { items: [React.ReactNode, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-rule", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-small text-ink-muted">{k}</dt>
          <dd className="text-right text-body text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-small font-medium text-brand-ink">{eyebrow}</p> : null}
        <h2 className="text-title font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-body text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
