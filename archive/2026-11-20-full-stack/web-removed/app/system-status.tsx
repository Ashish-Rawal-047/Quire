"use client";

import { RefreshCw } from "lucide-react";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import { Callout, Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";

type Check = { status: "ok" | "down" | "disabled" | "missing"; detail: string };
type Health = { status: "ok" | "degraded"; environment: string; checks: Record<string, Check> };

const LABELS: Record<string, string> = {
  database: "Database",
  storage: "Object storage",
  mail: "Test mail inbox",
  malware_scan: "Malware scanning",
  encryption_key: "Encryption key",
  payments: "Payments",
};

const DOT: Record<Check["status"], string> = {
  ok: "bg-st-ready",
  down: "bg-danger",
  missing: "bg-danger",
  disabled: "bg-ink-faint",
};

async function getHealth(): Promise<Health> {
  const res = await fetch("/api/v1/health", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Health;
}

/** Live view of GET /api/v1/health — makes local setup problems obvious. */
export function SystemStatus() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [attempt, setAttempt] = React.useState(0);

  // State is written only in the promise callbacks (after the request settles).
  React.useEffect(() => {
    let cancelled = false;
    getHealth().then(
      (h) => {
        if (cancelled) return;
        setHealth(h);
        setError(false);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setHealth(null);
        setError(true);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const load = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return (
    <section aria-labelledby="status-title" className="mt-14 rounded-lg border border-rule bg-surface">
      <div className="flex items-center justify-between border-b border-rule px-5 py-3">
        <h2 id="status-title" className="text-body font-semibold text-ink">
          Local services
        </h2>
        <IconButton label="Check again" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn(loading && "animate-spin")} aria-hidden />
        </IconButton>
      </div>
      <div className="px-5 py-2" aria-live="polite">
        {loading && !health ? (
          <div className="flex flex-col gap-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : error ? (
          <Callout tone="danger" title="Can't reach the API" className="my-3">
            Start it from services/api with <code className="font-mono">uvicorn app.main:app --reload</code>, then check
            again.
          </Callout>
        ) : health ? (
          <ul className="divide-y divide-rule">
            {Object.entries(health.checks).map(([key, check]) => (
              <li key={key} className="flex items-center gap-3 py-2.5">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[check.status])} />
                <span className="w-36 shrink-0 text-small font-medium text-ink">{LABELS[key] ?? key}</span>
                <span className="min-w-0 truncate text-small text-ink-muted">
                  <span className="sr-only">{check.status}: </span>
                  {check.detail}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
