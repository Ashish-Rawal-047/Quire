"use client";

import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import * as React from "react";
import { PageThumb } from "@/components/patterns/upload";
import { IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { openPdf, renderPdfPage, sourceBlob } from "@/lib/demo/files";
import type { OrderItem } from "@/lib/demo/types";
import { withBase } from "@/lib/base-path";

type Loaded = { kind: "pdf"; doc: Awaited<ReturnType<typeof openPdf>> } | { kind: "image"; url: string } | { kind: "missing" };

function useLoadedDocument(item: OrderItem, enabled: boolean) {
  const [state, setState] = React.useState<Loaded | null>(null);
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    let doc: Awaited<ReturnType<typeof openPdf>> | null = null;
    (async () => {
      try {
        if (item.type === "image" && item.source.kind === "sample") {
          if (!cancelled) setState({ kind: "image", url: withBase(item.source.url) });
          return;
        }
        const blob = await sourceBlob(item.source);
        if (!blob) throw new Error("missing");
        if (item.type === "image") {
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setState({ kind: "image", url: objectUrl });
        } else {
          doc = await openPdf(blob);
          if (!cancelled) setState({ kind: "pdf", doc });
        }
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      void doc?.loadingTask.destroy();
    };
  }, [item.id, item.type, item.source, enabled]);
  return state;
}

function PdfCanvas({ doc, page, width }: { doc: Awaited<ReturnType<typeof openPdf>>; page: number; width: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (ref.current) void renderPdfPage(doc, page, width, ref.current).catch(() => undefined);
  }, [doc, page, width]);
  return <canvas ref={ref} className="block h-auto w-full bg-white" />;
}

/** Diagonal repeated watermark on shop previews. */
function Watermark({ text }: { text: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-28deg] flex-col justify-center gap-16">
        {Array.from({ length: 9 }).map((_, i) => (
          <p key={i} className="whitespace-nowrap text-center font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]/25">
            {`${text} · `.repeat(6)}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Small first-page thumbnail. Uses the stored thumbnail when there is one. */
export function DocThumb({ item, className }: { item: OrderItem; className?: string }) {
  const needsRender = !item.thumb && item.source.kind === "sample" && item.type === "pdf";
  const loaded = useLoadedDocument(item, needsRender);
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-white", className)}>
      {item.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- local data URL thumbnail
        <img src={item.thumb} alt="" className="h-full w-full object-cover object-top" />
      ) : item.type === "image" && item.source.kind === "sample" ? (
        // eslint-disable-next-line @next/next/no-img-element -- local sample file
        <img src={withBase(item.source.url)} alt="" className="h-full w-full object-cover object-top" />
      ) : loaded?.kind === "pdf" ? (
        <PdfCanvas doc={loaded.doc} page={1} width={120} />
      ) : (
        <PageThumb lines={6} image={item.type === "image"} />
      )}
    </div>
  );
}

/**
 * A full page preview with paging. `watermark` overlays a light order watermark. This is a
 * simulation of the intended experience: in this prototype nothing technically prevents copying.
 */
export function DocPreview({ item, watermark, className }: { item: OrderItem; watermark?: string; className?: string }) {
  const loaded = useLoadedDocument(item, true);
  const [page, setPage] = React.useState(1);
  const pages = loaded?.kind === "pdf" ? loaded.doc.numPages : 1;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-sm border border-rule bg-white shadow-[0_1px_3px_rgb(0_0_0/0.08)] select-none">
        {loaded === null ? (
          <Skeleton className="aspect-[1/1.414] w-full rounded-none" />
        ) : loaded.kind === "pdf" ? (
          <PdfCanvas doc={loaded.doc} page={page} width={544} />
        ) : loaded.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- local file preview
          <img src={loaded.url} alt={`Preview of ${item.name}`} className="block h-auto w-full" draggable={false} />
        ) : (
          <div className="flex aspect-[1/1.414] flex-col items-center justify-center gap-2 bg-sunken text-center text-small text-ink-muted">
            <ImageOff className="size-6" aria-hidden />
            The file has been removed from this order.
          </div>
        )}
        {watermark && loaded && loaded.kind !== "missing" ? <Watermark text={watermark} /> : null}
      </div>
      {pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <IconButton label="Previous page" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft aria-hidden />
          </IconButton>
          <span className="text-small tabular text-ink-2">
            Page {page} of {pages}
          </span>
          <IconButton label="Next page" size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight aria-hidden />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
