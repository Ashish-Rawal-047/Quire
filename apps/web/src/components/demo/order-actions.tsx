"use client";

import { ArrowRight, Banknote, Download, Eye, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DocPreview, DocThumb } from "@/components/demo/doc-preview";
import { QrScanner } from "@/components/demo/qr-scanner";
import { IcAccept, IcHandover, IcPrinter, IcReady } from "@/components/demo/shop-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Callout, ProgressBar } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/switch";
import { sourceBlob } from "@/lib/demo/files";
import { actions, cashDue, methodLabel, orderIdFromPickupQr, printProgress, useNow } from "@/lib/demo/store";
import type { DemoShop, Order, OrderItem, ShopState } from "@/lib/demo/types";
import { formatPaise } from "@/lib/format";

export function settingBadges(item: OrderItem): string[] {
  const s = item.settings;
  return [
    s.paper,
    s.colour === "bw" ? "B&W" : "Colour",
    s.sides === "double" && item.pages > 1 ? "Double-sided" : "Single-sided",
    `${s.copies} ${s.copies === 1 ? "copy" : "copies"}`,
    ...(s.staple && item.pages > 1 ? ["Staple"] : []),
  ];
}

export function printersFor(order: Order, live: ShopState) {
  return live.printers.filter((p) =>
    order.items.every((it) => p.sizes.includes(it.settings.paper) && (it.settings.colour === "bw" || p.colour)),
  );
}

const REJECT_REASONS = [
  "A printer we need is not working",
  "We can't print this paper size or colour",
  "We're closing soon",
  "The file looks incomplete",
];

function RejectDialog({ order }: { order: Order }) {
  const [reason, setReason] = React.useState(REJECT_REASONS[0]);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <X aria-hidden />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Reject ${order.number}?`}
        description="The customer is told the reason and gets a full refund. Their files are removed from the order."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Keep order</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                variant="danger"
                onClick={() => {
                  actions.rejectOrder(order.id, reason);
                  toast.success(`${order.number} rejected · refund issued`);
                }}
              >
                Reject order
              </Button>
            </DialogClose>
          </>
        }
      >
        <div className="px-5 pb-2 sm:px-6">
          <Field label="Reason shown to the customer">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrintControls({ order, live }: { order: Order; live: ShopState }) {
  const usable = printersFor(order, live);
  const available = usable.filter((p) => p.available);
  const [printerId, setPrinterId] = React.useState(available[0]?.id ?? "");
  const chosen = available.find((p) => p.id === printerId) ?? available[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Send to printer" className="min-w-56 flex-1">
          <Select value={chosen?.id ?? ""} onChange={(e) => setPrinterId(e.target.value)} disabled={!available.length}>
            {usable.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.available}>
                {p.name} — {p.available ? "available" : "unavailable"}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          className="group"
          disabled={!chosen}
          onClick={() => {
            actions.startPrinting(order.id, chosen!.id);
            toast.success(`Printing ${order.number} on ${chosen!.name}`);
          }}
        >
          <IcPrinter inverse />
          Start printing
        </Button>
      </div>
      {!usable.length ? (
        <Callout tone="warning">None of this shop&rsquo;s printers can print these settings.</Callout>
      ) : !available.length ? (
        <Callout tone="warning">Every printer that can do this order is marked unavailable. Change that on the Printers page.</Callout>
      ) : null}
    </div>
  );
}

function PrintingControls({ order }: { order: Order }) {
  const now = useNow(500);
  const progress = printProgress(order, now);
  const done = progress >= 1;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-small">
        <span className="text-ink-2">
          {done ? "Finished on" : "Printing on"} {order.printJob?.printerName}
        </span>
      </div>
      <ProgressBar value={progress * 100} label="Print progress" />
      <Button
        className="group self-start"
        disabled={!done}
        onClick={() => {
          actions.markReady(order.id);
          toast.success(`${order.number} is ready for pickup`);
        }}
      >
        <IcReady inverse />
        Mark ready for pickup
      </Button>
    </div>
  );
}

/**
 * Scans a customer's pickup QR (`quire:pickup:<order id>`). `onOrder` returns an error message to
 * show, or null when the scan was handled (the dialog then closes).
 */
export function ScanPickupDialog({
  onOrder,
  trigger,
}: {
  onOrder: (orderId: string) => string | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Scan the pickup QR" description="It's on the customer's order ticket, under My orders.">
        <div className="overflow-y-auto px-5 pb-6 sm:px-6">
          {open ? (
            <QrScanner
              hint="Point the camera at the QR code on the customer's order ticket."
              error={error}
              onResult={(text) => {
                const id = orderIdFromPickupQr(text);
                const problem = id ? onOrder(id) : "That isn't a Quire pickup QR code.";
                if (problem) setError(problem);
                else setOpen(false);
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CashBox({ order, checked, onChange }: { order: Order; checked: boolean; onChange: (v: boolean) => void }) {
  const id = `cash-${order.id}`;
  return (
    <div className="flex items-center gap-3 rounded-md border border-warning-ink/25 bg-warning-tint px-3.5 py-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-warning-ink">
        <Banknote className="size-5" />
      </span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-body font-semibold text-ink">
          Collect <span className="tabular">{formatPaise(order.totalPaise)}</span> in cash
        </span>
        <span className="block text-small text-ink-2">The customer chose to pay at pickup. Tick once you have it.</span>
      </label>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label="Cash received" />
    </div>
  );
}

function HandoverControls({ order, verifiedByQr = false }: { order: Order; verifiedByQr?: boolean }) {
  const due = cashDue(order);
  const [cashOk, setCashOk] = React.useState(!due);
  const [qrOk, setQrOk] = React.useState(verifiedByQr);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  /** Returns false only when the proof doesn't match. */
  const finish = (proof: { code: string } | { qrOrderId: string }) => {
    const matches = "code" in proof ? proof.code.trim() === order.pickupCode : proof.qrOrderId === order.id;
    if (!matches) return false;
    if (!cashOk) {
      setError(`Collect ${formatPaise(order.totalPaise)} in cash and tick the box first.`);
      return true;
    }
    if (actions.completeOrder(order.id, proof)) {
      toast.success(due ? `${order.number} handed over · ${formatPaise(order.totalPaise)} cash received` : `${order.number} completed`);
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-3">
      {due ? (
        <CashBox
          order={order}
          checked={cashOk}
          onChange={(v) => {
            setCashOk(v);
            setError(null);
          }}
        />
      ) : null}
      {qrOk ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-small font-medium text-st-ready-ink">
              <IcHandover className="size-5" />
              Pickup QR matches this order
            </p>
            <Button className="group" disabled={!cashOk} onClick={() => finish({ qrOrderId: order.id })}>
              Complete handover
              <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          {error ? <p className="text-small text-danger-ink">{error}</p> : null}
        </div>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!finish({ code })) setError("That code doesn't match this order. Ask the customer to check their ticket.");
          }}
        >
          <Field label="Pickup code" error={error ?? undefined} className="w-44">
            <Input
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              className="font-mono tracking-[0.3em]"
              placeholder="••••"
            />
          </Field>
          <Button type="submit" className="group" disabled={code.length !== 4}>
            Verify &amp; complete
            <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </Button>
          <span className="pb-2.5 text-small text-ink-muted">or</span>
          <ScanPickupDialog
            trigger={
              <Button type="button" variant="secondary" className="group">
                <IcHandover className="text-brand-ink" />
                Scan pickup QR
              </Button>
            }
            onOrder={(id) => {
              if (id !== order.id) return "That QR is for a different order.";
              if (!cashOk) {
                setQrOk(true);
                return null;
              }
              return finish({ qrOrderId: id }) ? null : "This order can't be handed over.";
            }}
          />
        </form>
      )}
      <p className="text-caption text-ink-muted">
        {order.mine ? "The code and QR are on the customer's order ticket." : `Sample order · code ${order.pickupCode}`}
      </p>
    </div>
  );
}

export function StatusActions({ order, live, verifiedByQr }: { order: Order; live: ShopState; verifiedByQr?: boolean }) {
  if (order.status === "paid") {
    return (
      <div className="flex flex-wrap gap-2">
        <RejectDialog order={order} />
        <Button
          className="group"
          onClick={() => {
            actions.acceptOrder(order.id);
            toast.success(`${order.number} accepted`);
          }}
        >
          <IcAccept inverse />
          Accept order
        </Button>
      </div>
    );
  }
  if (order.status === "accepted") return <PrintControls key={order.id} order={order} live={live} />;
  if (order.status === "printing") return <PrintingControls order={order} />;
  if (order.status === "ready") return <HandoverControls key={`${order.id}-${verifiedByQr}`} order={order} verifiedByQr={verifiedByQr} />;
  return null;
}

async function downloadItem(item: OrderItem) {
  const blob = await sourceBlob(item.source);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FileList({ order, shop }: { order: Order; shop: DemoShop }) {
  const watermark = `${order.number} · ${shop.shortName} · preview only`;
  return (
    <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
      {order.items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
          <div className="relative h-[88px] w-16 shrink-0 overflow-hidden rounded-sm border border-rule shadow-[0_1px_2px_rgb(15_27_45/0.06)]">
            {order.filesRemoved ? <div className="h-full w-full bg-sunken" /> : <DocThumb item={item} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-ink">
              {item.name}{" "}
              <span className="font-normal text-ink-muted">
                · {item.type === "pdf" ? "PDF" : "Image"} · {item.pages} {item.pages === 1 ? "page" : "pages"}
              </span>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {settingBadges(item).map((t) => (
                <Badge key={t} tone={t === "Colour" ? "info" : "neutral"} size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          {order.filesRemoved ? (
            <span className="text-small text-ink-muted">File removed</span>
          ) : (
            <div className="flex gap-1">
              <Dialog onOpenChange={(open) => open && actions.recordPreview(order.id, item.name)}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Eye aria-hidden />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent
                  title={item.name}
                  description="Preview of the customer's file."
                  className="sm:w-[min(94vw,40rem)]"
                >
                  <div className="overflow-y-auto px-5 pb-6 sm:px-6">
                    <DocPreview item={item} watermark={watermark} />
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  actions.recordDownload(order.id, item.name, true);
                  void downloadItem(item);
                }}
              >
                <Download aria-hidden />
                Download
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}


export function earningsLine(order: Order) {
  return `${formatPaise(order.totalPaise)} · ${order.payment.method === "cash" ? (cashDue(order) ? "cash at pickup" : "paid in cash") : `paid by ${methodLabel(order.payment.method)}`} `;
}
