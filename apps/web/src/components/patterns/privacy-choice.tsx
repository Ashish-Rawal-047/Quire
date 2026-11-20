"use client";

import { Check, Download, Info, ShieldCheck, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui/choice-card";
import { Callout } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/switch";

export type PrivacyMode = "protected" | "download_permitted";

/** Version of the wording below. Stored with each order's consent so we know what was shown. */
export const PRIVACY_NOTICE_VERSION = "2026-11-20.1";

function Point({ kind, children }: { kind: "yes" | "info" | "no"; children: React.ReactNode }) {
  const Icon = kind === "yes" ? Check : kind === "info" ? Info : X;
  return (
    <li className="flex gap-2">
      <Icon
        aria-hidden
        className={
          kind === "yes"
            ? "mt-0.5 size-4 shrink-0 text-success-ink"
            : kind === "info"
              ? "mt-0.5 size-4 shrink-0 text-ink-muted"
              : "mt-0.5 size-4 shrink-0 text-danger-ink"
        }
        strokeWidth={2.5}
      />
      <span>
        <span className="sr-only">{kind === "yes" ? "Does: " : kind === "info" ? "Note: " : "Does not: "}</span>
        {children}
      </span>
    </li>
  );
}

/**
 * The privacy decision for an order. This prototype only *demonstrates* Protected Printing: it
 * shows the intended workflow (watermarked preview, no download button, an access receipt) but
 * provides no technical protection, and the wording says so. Never "100% secure" or
 * "impossible to copy". Allowing download needs an explicit second acknowledgement.
 */
export function PrivacyChoice({
  value,
  onChange,
  acknowledged,
  onAcknowledgedChange,
  shopName,
  shopSupportsProtected = true,
}: {
  value: PrivacyMode;
  onChange: (mode: PrivacyMode) => void;
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
  shopName: string;
  shopSupportsProtected?: boolean;
}) {
  const ackId = React.useId();

  return (
    <div className="flex flex-col gap-3">
      <ChoiceCardGroup
        value={value}
        onValueChange={(v) => onChange(v as PrivacyMode)}
        aria-label="Who can access your original file"
      >
        <ChoiceCard
          value="protected"
          disabled={!shopSupportsProtected}
          icon={<ShieldCheck />}
          title="Protected printing"
          tag={
            <Badge tone="brand" size="sm">
              Recommended
            </Badge>
          }
        >
          <p>The shop sees a watermarked preview and prints from Quire, with no download button.</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            <Point kind="yes">Your access receipt lists every preview and print.</Point>
            <Point kind="yes">The file is removed from the order once it&rsquo;s collected.</Point>
            <Point kind="no">It can&rsquo;t stop someone photographing the screen or the printed pages.</Point>
          </ul>
        </ChoiceCard>

        <ChoiceCard value="download_permitted" icon={<Download />} title="Allow download">
          <p>
            {shopName} can download your original file. Choose this only if the shop needs to edit or reformat it.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            <Point kind="info">The shop may keep the copy on its own computer, outside Quire.</Point>
            <Point kind="yes">Every download is still listed on your access receipt.</Point>
          </ul>
        </ChoiceCard>
      </ChoiceCardGroup>

      {!shopSupportsProtected ? (
        <Callout tone="warning" title="This shop doesn't support Protected printing yet">
          Choose a shop with the Protected printing badge if your document is sensitive.
        </Callout>
      ) : null}

      {value === "download_permitted" ? (
        <label
          htmlFor={ackId}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-warning-ink/30 bg-warning-tint px-4 py-3"
        >
          <Checkbox
            id={ackId}
            checked={acknowledged}
            onCheckedChange={(v) => onAcknowledgedChange(v === true)}
            className="mt-0.5"
          />
          <span className="text-small text-ink">
            I understand {shopName} will be able to download and keep a copy of my file.
          </span>
        </label>
      ) : null}
    </div>
  );
}
