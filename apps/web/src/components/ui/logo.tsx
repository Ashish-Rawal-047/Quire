import { cn } from "@/lib/cn";

/**
 * The Quire mark: a printer with a fresh sheet coming out of it, on a blue tile.
 */
export function QuireMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      {/* paper waiting in the input tray */}
      <rect x="10.5" y="5.5" width="11" height="7" rx="1" fill="#fff" opacity="0.7" />
      {/* printer body */}
      <rect x="5.5" y="11" width="21" height="10.5" rx="2.6" fill="#fff" />
      <circle cx="22.4" cy="14.4" r="1.15" fill="var(--brand)" />
      {/* output slot */}
      <rect x="9.5" y="17.2" width="13" height="1.7" rx="0.85" fill="var(--brand)" />
      {/* printed sheet */}
      <path d="M10.6 18.4h10.8v7.6a.9.9 0 0 1-.9.9h-9a.9.9 0 0 1-.9-.9z" fill="#fff" stroke="var(--brand)" strokeWidth="1.2" />
      <path d="M13 21.6h6M13 24.1h4" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <QuireMark />
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Quire</span>
        {subtitle ? (
          <span className="mt-0.5 text-caption font-medium text-ink-muted">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
