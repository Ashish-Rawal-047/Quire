"use client";

import { FileImage, FileText, RefreshCw, Trash, Upload } from "lucide-react";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";

export const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Large, forgiving drop target. The whole area is a real <button> for keyboard users. */
export function Dropzone({
  onFiles,
  compact,
  className,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={className}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed text-center transition-colors duration-150",
          compact ? "gap-1 px-4 py-5" : "gap-3 px-6 py-10 sm:py-14",
          dragging
            ? "border-brand bg-brand-tint"
            : "border-rule-strong bg-surface hover:border-ink-faint hover:bg-hover",
        )}
      >
        {!compact ? (
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
            <Upload className="size-5" aria-hidden />
          </span>
        ) : null}
        <span className={cn("font-semibold text-ink", compact ? "text-body" : "text-title-sm")}>
          {dragging ? "Drop to upload" : compact ? "Add another file" : "Choose files to print"}
        </span>
        <span className="text-small text-ink-muted">
          {compact ? "PDF, JPG or PNG" : "or drag them here · PDF, JPG or PNG · up to 20 MB each"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export type FileRowState =
  | { kind: "uploading"; progress: number }
  | { kind: "processing" }
  | { kind: "ready"; pages: number }
  | { kind: "error"; message: string };

/** A file in the order: name, page count, state, and remove/replace actions. */
export function FileRow({
  name,
  type,
  sizeKb,
  state,
  onRemove,
  onRetry,
  thumbnail,
}: {
  name: string;
  type: "pdf" | "image";
  sizeKb: number;
  state: FileRowState;
  onRemove?: () => void;
  onRetry?: () => void;
  thumbnail?: React.ReactNode;
}) {
  const Icon = type === "pdf" ? FileText : FileImage;
  const size = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "relative flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-surface",
          state.kind === "error" ? "border-danger/40" : "border-rule",
        )}
      >
        {thumbnail ?? <Icon className="size-5 text-ink-faint" aria-hidden />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink" title={name}>
          {name}
        </p>
        <div className="mt-1 text-small">
          {state.kind === "uploading" ? (
            <div className="flex items-center gap-3">
              <ProgressBar value={state.progress} label={`Uploading ${name}`} className="max-w-48" />
              <span className="tabular text-ink-muted">{Math.round(state.progress)}%</span>
            </div>
          ) : state.kind === "processing" ? (
            <div className="flex items-center gap-3">
              <ProgressBar label={`Checking ${name}`} className="max-w-48" />
              <span className="text-ink-muted">Reading pages…</span>
            </div>
          ) : state.kind === "ready" ? (
            <p className="text-ink-muted">
              {type === "pdf" ? "PDF" : "Image"} · {size} ·{" "}
              <span className="font-medium text-ink-2">{pluralize(state.pages, "page")}</span>
            </p>
          ) : (
            <p className="text-danger-ink" role="alert">
              {state.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        {state.kind === "error" && onRetry ? (
          <IconButton label={`Try ${name} again`} size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden />
          </IconButton>
        ) : null}
        {onRemove ? (
          <IconButton label={`Remove ${name}`} size="sm" variant="ghost" onClick={onRemove}>
            <Trash aria-hidden />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

/** Lightweight page thumbnail stand-in, shown while a real preview loads or when none exists. */
export function PageThumb({ lines = 7, image }: { lines?: number; image?: boolean }) {
  return (
    <div aria-hidden className="flex h-full w-full flex-col gap-[3px] bg-white p-1.5">
      {image ? (
        <div className="h-full w-full rounded-[2px] bg-[linear-gradient(135deg,#d9d3c7,#efe9df)]" />
      ) : (
        <>
          <div className="h-[3px] w-3/5 rounded-full bg-[#2b2a27]/70" />
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-[2px] rounded-full bg-[#2b2a27]/25"
              style={{ width: `${70 + ((i * 37) % 30)}%` }}
            />
          ))}
        </>
      )}
    </div>
  );
}
