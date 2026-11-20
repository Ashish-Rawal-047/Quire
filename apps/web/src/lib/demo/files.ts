"use client";

/**
 * Uploaded files stay in this browser: the file itself in IndexedDB, a small first-page thumbnail
 * on the order. Page counts and previews come from pdf.js, running locally (worker in /public).
 */
import type { DocSource } from "./types";
import { withBase } from "@/lib/base-path";

const DB = "quire-demo-files";
const STORE = "files";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveFile = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id));
export const loadFile = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const deleteFile = (id: string) => tx("readwrite", (s) => s.delete(id));
export const clearFiles = () => tx("readwrite", (s) => s.clear());

type PdfJs = typeof import("pdfjs-dist");
let pdfjs: Promise<PdfJs> | null = null;

export function getPdfJs(): Promise<PdfJs> {
  pdfjs ??= import("pdfjs-dist").then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = withBase("/pdf.worker.min.mjs");
    return mod;
  });
  return pdfjs;
}

/** The bytes behind a document source, as a pdf.js loading parameter or an image URL. */
export async function sourceBlob(source: DocSource): Promise<Blob | null> {
  if (source.kind === "sample") {
    const res = await fetch(withBase(source.url));
    return res.ok ? res.blob() : null;
  }
  return (await loadFile(source.id)) ?? null;
}

export async function openPdf(blob: Blob) {
  const lib = await getPdfJs();
  return lib.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    standardFontDataUrl: withBase("/pdfjs/standard_fonts/"),
  }).promise;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.72);
}

/** Renders one PDF page into a canvas at the given CSS width. */
export async function renderPdfPage(
  doc: Awaited<ReturnType<typeof openPdf>>,
  pageNumber: number,
  width: number,
  canvas: HTMLCanvasElement,
) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale: (width / base.width) * ratio });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
}

export type Analysed = { type: "pdf" | "image"; pages: number; thumb: string };

export class FileProblem extends Error {}

/** Checks a chosen file and reads its page count and first-page thumbnail. */
export async function analyseFile(file: File): Promise<Analysed> {
  if (file.size > MAX_FILE_BYTES) throw new FileProblem("This file is over 20 MB. Try a smaller file.");
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;

  if (isPdf) {
    let doc;
    try {
      doc = await openPdf(file);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      throw new FileProblem(
        name === "PasswordException"
          ? "This PDF is password-protected. Remove the password and upload it again."
          : "This PDF couldn't be read. It may be damaged.",
      );
    }
    const canvas = document.createElement("canvas");
    await renderPdfPage(doc, 1, 160, canvas);
    const pages = doc.numPages;
    await doc.loadingTask.destroy();
    return { type: "pdf", pages, thumb: canvasToDataUrl(canvas) };
  }
  if (isPng || isJpeg) {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) throw new FileProblem("This image couldn't be read.");
    const canvas = document.createElement("canvas");
    const scale = 240 / Math.max(bitmap.width, bitmap.height);
    canvas.width = Math.round(bitmap.width * Math.min(1, scale));
    canvas.height = Math.round(bitmap.height * Math.min(1, scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { type: "image", pages: 1, thumb: canvasToDataUrl(canvas) };
  }
  throw new FileProblem("Only PDF, JPG and PNG files can be printed.");
}
