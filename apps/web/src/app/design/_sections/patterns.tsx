"use client";

import * as React from "react";
import { AccessReceipt } from "@/components/patterns/access-receipt";
import { JobTicket } from "@/components/patterns/job-ticket";
import { OrderTimeline } from "@/components/patterns/order-timeline";
import { CheckoutBar, PriceSummary } from "@/components/patterns/price-summary";
import { PrivacyChoice, type PrivacyMode } from "@/components/patterns/privacy-choice";
import { PrinterRow, QueueRow, type SamplePrinter } from "@/components/patterns/queue";
import { ShopRow } from "@/components/patterns/shop-row";
import { Dropzone, FileRow, PageThumb, type FileRowState } from "@/components/patterns/upload";
import { SAMPLE_QUEUE, SAMPLE_SHOPS } from "@/lib/sample-data";
import { GallerySection, Specimen } from "../_components/section";

type DemoFile = { id: string; name: string; type: "pdf" | "image"; sizeKb: number; state: FileRowState };

const INITIAL_FILES: DemoFile[] = [
  { id: "a", name: "Resume_2026_final.pdf", type: "pdf", sizeKb: 184, state: { kind: "ready", pages: 2 } },
  { id: "b", name: "Semester 5 marksheet.pdf", type: "pdf", sizeKb: 912, state: { kind: "uploading", progress: 42 } },
  {
    id: "c",
    name: "Bank statement (locked).pdf",
    type: "pdf",
    sizeKb: 340,
    state: { kind: "error", message: "This PDF is password-protected. Remove the password and upload it again." },
  },
];

export const SAMPLE_PRINTERS: SamplePrinter[] = [
  {
    name: "Counter laser",
    model: "HP LaserJet Pro M404dn",
    colour: false,
    duplex: true,
    sizes: ["A4", "Legal"],
    state: "printing",
    detail: "Job PF-2611-0412 · 34 of 60 sheets",
    simulated: true,
  },
  {
    name: "Colour inkjet",
    model: "Epson EcoTank L3250",
    colour: true,
    duplex: false,
    sizes: ["A4"],
    state: "idle",
    simulated: true,
  },
  {
    name: "A3 copier",
    model: "Canon imageRUNNER 2206",
    colour: false,
    duplex: true,
    sizes: ["A4", "A3"],
    state: "error",
    detail: "Paper jam in tray 2",
    simulated: true,
  },
];

function useDemoUpload() {
  const [files, setFiles] = React.useState<DemoFile[]>(INITIAL_FILES);

  // Advance any "uploading" files so the progress states can be seen in motion.
  React.useEffect(() => {
    const timer = setInterval(() => {
      setFiles((current) =>
        current.map((f) => {
          if (f.state.kind === "uploading") {
            const next = f.state.progress + 9;
            return next >= 100 ? { ...f, state: { kind: "processing" } } : { ...f, state: { kind: "uploading", progress: next } };
          }
          return f;
        }),
      );
    }, 450);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const processing = files.filter((f) => f.state.kind === "processing");
    if (!processing.length) return;
    const t = setTimeout(
      () =>
        setFiles((current) =>
          current.map((f) => (f.state.kind === "processing" ? { ...f, state: { kind: "ready", pages: f.type === "pdf" ? 1 + (f.sizeKb % 5) : 1 } } : f)),
        ),
      1400,
    );
    return () => clearTimeout(t);
  }, [files]);

  const add = (list: File[]) =>
    setFiles((current) => [
      ...current,
      ...list.map((file, i) => {
        const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
        return {
          id: `${Date.now()}-${i}`,
          name: file.name,
          type: (/\.pdf$/i.test(file.name) ? "pdf" : "image") as "pdf" | "image",
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          state: okType
            ? ({ kind: "uploading", progress: 0 } as FileRowState)
            : ({ kind: "error", message: "Only PDF, JPG and PNG files can be printed." } as FileRowState),
        };
      }),
    ]);

  const remove = (id: string) => setFiles((c) => c.filter((f) => f.id !== id));
  return { files, add, remove };
}

export function Patterns() {
  const [shop, setShop] = React.useState(SAMPLE_SHOPS[0].code);
  const [privacy, setPrivacy] = React.useState<PrivacyMode>("protected");
  const [ack, setAck] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState(SAMPLE_QUEUE[0].number);
  const upload = useDemoUpload();

  return (
    <GallerySection
      id="patterns"
      eyebrow="Patterns"
      title="Product patterns"
      intro={<p>Components composed into the recurring pieces of the customer and shop experiences, with realistic content.</p>}
    >
      <h3 className="-mb-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">Customer</h3>

      <Specimen
        title="Shop list"
        notes="Rows, not cards: shops are compared, so details line up. The Protected printing badge appears only when the shop has the print app."
        className="overflow-hidden p-0 sm:p-0"
      >
        <div className="divide-y divide-rule">
          {SAMPLE_SHOPS.map((s) => (
            <ShopRow key={s.code} shop={s} selected={shop === s.code} onSelect={() => setShop(s.code)} />
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Upload"
        notes="Demo only: files you choose here stay in your browser and are never uploaded. Shows uploading → checking → ready, and a recoverable error."
      >
        <div className="flex flex-col gap-4">
          <Dropzone onFiles={upload.add} />
          <div className="divide-y divide-rule">
            {upload.files.map((f) => (
              <FileRow
                key={f.id}
                name={f.name}
                type={f.type}
                sizeKb={f.sizeKb}
                state={f.state}
                onRemove={() => upload.remove(f.id)}
                thumbnail={f.state.kind === "ready" ? <PageThumb image={f.type === "image"} /> : undefined}
              />
            ))}
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Privacy choice"
        notes="Protected is preselected. Each option lists what it does, what it can't do, and the temporary print data. Allowing download needs a second, explicit acknowledgement."
      >
        <div className="max-w-xl">
          <PrivacyChoice
            value={privacy}
            onChange={(v) => {
              setPrivacy(v);
              setAck(false);
            }}
            acknowledged={ack}
            onAcknowledgedChange={setAck}
            shopName="Sharma Xerox"
          />
        </div>
      </Specimen>

      <Specimen title="Price" notes="Itemised from the server's quote. On phones, a sticky bar holds the total and the single next action.">
        <div className="grid gap-8 lg:grid-cols-2">
          <PriceSummary
            testMode
            lines={[
              { label: "Resume_2026_final.pdf", detail: "2 pages · B&W · double-sided · 2 copies", paise: 400 },
              { label: "Semester 5 marksheet.pdf", detail: "1 page · colour · 1 copy", paise: 1000 },
              { label: "Stapling", detail: "2 copies × ₹2", paise: 400 },
            ]}
            totalPaise={1800}
          />
          <div className="self-end overflow-hidden rounded-lg border border-rule">
            <CheckoutBar totalPaise={1800} summary="2 files · 5 sheets · Protected" actionLabel="Review order" />
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Job ticket"
        notes="The order confirmation as a printed ticket. The QR holds an opaque pickup token, not personal data. A simulated order (every order in Phase 1) says so, and shows a demo code that collects nothing."
      >
        <div className="grid gap-6 rounded-lg bg-paper px-4 py-6 lg:grid-cols-2">
          <JobTicket
            orderNumber="PF-2611-0418"
            pickupCode="4821"
            pickupToken="qpk_7d1f9c2b6a0e4c8f"
            shopName="Sharma Xerox & Stationery"
            shopArea="Lajpat Nagar II, New Delhi"
            status="ready"
            summary="3 files · 10 sheets · B&W"
            totalPaise={3200}
            protectedMode
            printMode="simulated"
          />
          <JobTicket
            orderNumber="PF-2611-0418"
            pickupCode="4821"
            pickupToken="qpk_7d1f9c2b6a0e4c8f"
            shopName="Sharma Xerox & Stationery"
            shopArea="Lajpat Nagar II, New Delhi"
            status="ready"
            summary="3 files · 10 sheets · B&W"
            totalPaise={3200}
            protectedMode
            printMode="physical"
          />
        </div>
      </Specimen>

      <Specimen title="Order timeline & access receipt" notes="Progress in plain words, then a full account of who touched the file.">
        <div className="grid gap-10 lg:grid-cols-2">
          <OrderTimeline
            current="printing"
            mode="simulated"
            events={{
              paid: { status: "paid", at: "10:41 am" },
              accepted: { status: "accepted", at: "10:43 am", note: "Ready by about 11:00 am" },
              printing: { status: "printing", at: "10:44 am" },
            }}
          />
          <AccessReceipt
            printMode="simulated"
            entries={[
              { action: "uploaded", at: "10:38", actor: "You", detail: "3 files · each with its own key" },
              { action: "previewed", at: "10:43", actor: "Ravi (Sharma Xerox)", detail: "Page 1 of Resume" },
              { action: "printed", at: "10:44", actor: "Counter laser", detail: "2 copies" },
              { action: "download_denied", at: "10:46", actor: "Ravi (Sharma Xerox)", detail: "Protected order" },
              { action: "pickup_verified", at: "10:51", actor: "Ravi (Sharma Xerox)", detail: "Demo code checked" },
              { action: "deleted", at: "11:51", actor: "Quire", detail: "1 hour after pickup" },
            ]}
          />
        </div>
      </Specimen>

      <h3 className="-mb-4 mt-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">Shop</h3>

      <Specimen
        title="Order queue"
        notes="Fixed columns for scanning. Age turns amber after 10 minutes unaccepted. Icons for colour, privacy mode and instructions carry text labels for screen readers."
        className="overflow-hidden p-0 sm:p-0"
      >
        <div className="max-w-md divide-y divide-rule">
          {SAMPLE_QUEUE.map((o) => (
            <QueueRow key={o.number} order={o} selected={selectedOrder === o.number} onSelect={() => setSelectedOrder(o.number)} />
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Printers"
        notes="Every simulated printer carries the SIMULATED tag. Errors say what's wrong in shop language."
        className="overflow-hidden p-0 sm:p-0"
      >
        <div className="divide-y divide-rule">
          {SAMPLE_PRINTERS.map((p) => (
            <PrinterRow key={p.name} printer={p} />
          ))}
        </div>
      </Specimen>
    </GallerySection>
  );
}
