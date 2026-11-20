"use client";

import { toast } from "sonner";
import { AddPrinterDialog } from "@/components/demo/add-printer";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { PrinterRow } from "@/components/patterns/queue";
import { Switch } from "@/components/ui/switch";
import { actions } from "@/lib/demo/store";

function PrintersPageContent() {
  const { shop, live, orders } = useShop();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-headline font-extrabold tracking-[-0.03em] text-ink">Printers</h1>
            <p className="mt-1 max-w-xl text-small text-ink-muted">
              Switch a printer off when it&rsquo;s out of paper or toner. Customers see which printers are available, and
              orders can only be sent to available printers.
            </p>
          </div>
          <AddPrinterDialog shopCode={shop.code} />
        </div>
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          {live.printers.map((p) => {
            const job = orders.find((o) => o.status === "printing" && o.printJob?.printerId === p.id);
            const id = `printer-${p.id}`;
            return (
              <li key={p.id} className="flex items-center gap-2 pr-4">
                <div className="min-w-0 flex-1">
                  <PrinterRow
                    printer={{
                      name: p.name,
                      model: p.model,
                      colour: p.colour,
                      duplex: p.duplex,
                      sizes: p.sizes,
                      state: !p.available ? "offline" : job ? "printing" : "idle",
                      detail: job ? `Job ${job.number}` : p.available ? undefined : "Marked unavailable",
                      simulated: false,
                    }}
                  />
                </div>
                <label htmlFor={id} className="sr-only">
                  {p.name} available
                </label>
                <Switch
                  id={id}
                  checked={p.available}
                  onCheckedChange={(available) => {
                    actions.setPrinterAvailable(shop.code, p.id, available);
                    toast.success(`${p.name} marked ${available ? "available" : "unavailable"}`);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function PrintersPage() {
  return (
    <ShopGate>
      <PrintersPageContent />
    </ShopGate>
  );
}
