"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { IcAdd, IcPrinter } from "@/components/demo/shop-icons";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox, Switch, ToggleRow } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { actions } from "@/lib/demo/store";
import type { Order, PaperSize, Printer } from "@/lib/demo/types";

const SIZES: PaperSize[] = ["A4", "A3", "Legal"];

/** Dialog for adding a printer to the shop. New printers start available. */
export function AddPrinterDialog({ shopCode, trigger }: { shopCode: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [model, setModel] = React.useState("");
  const [colour, setColour] = React.useState<"bw" | "colour">("bw");
  const [duplex, setDuplex] = React.useState(true);
  const [sizes, setSizes] = React.useState<PaperSize[]>(["A4"]);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setName("");
    setModel("");
    setColour("bw");
    setDuplex(true);
    setSizes(["A4"]);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="group">
            <IcAdd inverse />
            Add printer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        title="Add a printer"
        description="It appears in your printer list and can take orders straight away."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="add-printer-form" className="group">
              <IcAdd inverse />
              Add printer
            </Button>
          </>
        }
      >
        <form
          id="add-printer-form"
          className="flex flex-col gap-5 overflow-y-auto px-5 pb-2 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return setError("Give the printer a name your staff will recognise.");
            if (!sizes.length) return setError("Choose at least one paper size.");
            const added = actions.addPrinter(shopCode, {
              name: name.trim(),
              model: model.trim() || "Printer",
              colour: colour === "colour",
              duplex,
              sizes: SIZES.filter((s) => sizes.includes(s)),
            });
            toast.success(`${added.name} added`);
            setOpen(false);
            reset();
          }}
        >
          <Field label="Name" hint="What your staff call it, e.g. Back-room laser" error={error && !name.trim() ? error : undefined}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={40}
              autoComplete="off"
              placeholder="Back-room laser"
            />
          </Field>
          <Field label="Model (optional)">
            <Input value={model} onChange={(e) => setModel(e.target.value)} maxLength={60} autoComplete="off" placeholder="HP LaserJet Pro M404dn" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span id="add-printer-colour" className="text-small font-medium text-ink">
              Prints in
            </span>
            <SegmentedControl
              aria-labelledby="add-printer-colour"
              value={colour}
              onChange={setColour}
              options={[
                { value: "bw", label: "Black & white" },
                { value: "colour", label: "Colour and B&W" },
              ]}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-small font-medium text-ink">Paper sizes</legend>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => {
                const id = `add-printer-${size}`;
                const on = sizes.includes(size);
                return (
                  <label
                    key={size}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-small font-medium transition-colors",
                      on ? "border-brand bg-brand-tint text-brand-ink" : "border-rule-strong text-ink-2 hover:bg-hover",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={on}
                      onCheckedChange={(v) => {
                        setSizes((list) => (v === true ? [...list, size] : list.filter((s) => s !== size)));
                        setError(null);
                      }}
                    />
                    {size}
                  </label>
                );
              })}
            </div>
            {error && name.trim() && !sizes.length ? <p className="text-small text-danger-ink">{error}</p> : null}
          </fieldset>
          <ToggleRow
            id="add-printer-duplex"
            label="Double-sided"
            description="Can print on both sides of the sheet"
            control={<Switch id="add-printer-duplex" checked={duplex} onCheckedChange={setDuplex} />}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Compact printer list for Settings, with remove for printers added here. */
export function PrinterSettingsList({ shopCode, printers, orders }: { shopCode: string; printers: Printer[]; orders: Order[] }) {
  return (
    <ul className="divide-y divide-rule">
      {printers.map((p) => {
        const busy = orders.some((o) => o.status === "printing" && o.printJob?.printerId === p.id);
        const added = p.id.startsWith("added-");
        return (
          <li key={p.id} className="group flex items-center gap-3 px-5 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-ink">
              <IcPrinter active className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-body font-medium text-ink">
                {p.name}
                {added ? (
                  <Badge tone="info" size="sm">
                    New
                  </Badge>
                ) : null}
              </p>
              <p className="truncate text-small text-ink-muted">
                {p.model} · {p.colour ? "Colour" : "B&W"} · {p.duplex ? "double-sided" : "single-sided"} · {p.sizes.join(", ")}
              </p>
            </div>
            <span className={cn("text-small", p.available ? "text-st-ready-ink" : "text-ink-muted")}>{p.available ? "Available" : "Off"}</span>
            {added ? (
              <IconButton
                label={busy ? `${p.name} is printing` : `Remove ${p.name}`}
                disabled={busy}
                onClick={() => {
                  actions.removePrinter(shopCode, p.id);
                  toast.success(`${p.name} removed`);
                }}
              >
                <Trash2 aria-hidden />
              </IconButton>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
