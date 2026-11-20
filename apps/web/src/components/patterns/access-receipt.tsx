import { Ban, Download, Eye, KeyRound, Lock, LockOpen, PackageCheck, Printer, Trash, Upload, type LucideIcon } from "lucide-react";
import { SimulatedTag } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { PrintMode } from "@/lib/status";

/** Everything that happened to an order's files, as shown to the customer. */
export type AccessAction =
  | "uploaded"
  | "previewed"
  | "printed"
  | "download_denied"
  | "downloaded"
  | "deleted"
  | "key_destroyed"
  | "pickup_verified"
  | "pickup_locked"
  | "pickup_unlocked";

export type AccessEntry = {
  action: AccessAction;
  at: string;
  actor: string;
  detail?: string;
};

type ActionMeta = { icon: LucideIcon; label: string; tone?: "danger" | "brand" | "warning" };

const ACTIONS: Record<AccessAction, ActionMeta> = {
  uploaded: { icon: Upload, label: "Uploaded", tone: "brand" },
  previewed: { icon: Eye, label: "Previewed" },
  printed: { icon: Printer, label: "Sent to printer" },
  download_denied: { icon: Ban, label: "Download blocked", tone: "danger" },
  downloaded: { icon: Download, label: "Downloaded by the shop" },
  deleted: { icon: Trash, label: "File deleted", tone: "brand" },
  key_destroyed: { icon: KeyRound, label: "Encryption key destroyed", tone: "brand" },
  pickup_verified: { icon: PackageCheck, label: "Collected — pickup verified", tone: "brand" },
  pickup_locked: { icon: Lock, label: "Pickup locked after wrong codes", tone: "warning" },
  pickup_unlocked: { icon: LockOpen, label: "Pickup unlocked by the shop owner" },
};

/** Simulated orders get their own words for anything that would otherwise imply paper. */
const SIMULATED_ACTIONS: Partial<Record<AccessAction, Partial<ActionMeta>>> = {
  printed: { label: "Simulated print job" },
  pickup_verified: { label: "Demo pickup check passed — no prints handed over" },
};

const SIMULATED_ONLY_ACTIONS: AccessAction[] = ["printed", "pickup_verified"];

/**
 * The customer's view of the audit log for their order: who touched the file, when and how.
 * Plain words, no jargon; denials are shown, not hidden. `printMode` is the order's server-set
 * mode and is required, so print and pickup entries can never read as real when they weren't.
 */
export function AccessReceipt({
  entries,
  printMode,
  className,
}: {
  entries: AccessEntry[];
  printMode: PrintMode;
  className?: string;
}) {
  const simulated = printMode === "simulated";
  return (
    <ol className={cn("flex flex-col", className)}>
      {entries.map((entry, i) => {
        const meta = { ...ACTIONS[entry.action], ...(simulated ? SIMULATED_ACTIONS[entry.action] : undefined) };
        const Icon = meta.icon;
        const tagged = simulated && SIMULATED_ONLY_ACTIONS.includes(entry.action);
        return (
          <li key={i} className="flex gap-3 border-b border-rule py-3 last:border-b-0">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                meta.tone === "danger"
                  ? "bg-danger-tint text-danger-ink"
                  : meta.tone === "warning"
                    ? "bg-warning-tint text-warning-ink"
                    : meta.tone === "brand"
                      ? "bg-brand-tint text-brand-ink"
                      : "bg-sunken text-ink-2",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-body font-medium text-ink">{meta.label}</p>
                {tagged ? <SimulatedTag compact /> : null}
              </div>
              <p className="text-small text-ink-muted">
                {entry.actor}
                {entry.detail ? ` · ${entry.detail}` : null}
              </p>
            </div>
            <time className="shrink-0 pt-0.5 text-small tabular text-ink-muted">{entry.at}</time>
          </li>
        );
      })}
    </ol>
  );
}
