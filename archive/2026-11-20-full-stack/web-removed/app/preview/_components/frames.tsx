import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * REVIEW-ONLY. Fixed-size device frames for visual review screenshots. Layout shells inside use
 * container queries, so they respond to the frame width exactly as they would to a real device.
 */
export function DeviceFrame({
  shot,
  label,
  width,
  minHeight,
  height,
  children,
  className,
}: {
  /** Stable id used by the screenshot script. */
  shot: string;
  label: string;
  width: number;
  /** Phone frames grow to show the full screen length; set `height` to clip instead. */
  minHeight?: number;
  height?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure data-shot={shot} className="flex flex-col items-center gap-3 p-2">
      <div
        className={cn(
          "overflow-hidden border border-rule-strong bg-paper shadow-overlay",
          width < 600 ? "rounded-[28px]" : "rounded-lg",
          className,
        )}
        style={{ width, minHeight, height }}
      >
        <div className={cn("flex flex-col", height ? "h-full" : null)} style={{ minHeight }}>
          {children}
        </div>
      </div>
      <figcaption className="max-w-full text-center text-small text-ink-muted">
        {label} · <span className="tabular">{width}px</span>
      </figcaption>
    </figure>
  );
}
