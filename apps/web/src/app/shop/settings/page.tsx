"use client";

import { ExternalLink, LogOut, Repeat, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddPrinterDialog, PrinterSettingsList } from "@/components/demo/add-printer";
import { ShopQrCard } from "@/components/demo/shop-qr-card";
import { ShopGate, useShop } from "@/components/demo/shop-frame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DataList, Panel, PanelHeader } from "@/components/ui/panel";
import { Switch, ToggleRow } from "@/components/ui/switch";
import { clearFiles } from "@/lib/demo/files";
import { actions } from "@/lib/demo/store";

function SettingsPageContent() {
  const { shop, live, ownerName, orders } = useShop();
  const router = useRouter();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
        <h1 className="font-display text-headline font-extrabold tracking-[-0.03em] text-ink">Settings</h1>

        <Panel as="section" className="p-5">
          <ToggleRow
            id="accepting"
            label={live.open ? "Open for orders" : "New orders paused"}
            description="When paused, customers can still see your shop but can't place orders."
            control={<Switch id="accepting" checked={live.open} onCheckedChange={(open) => actions.setShopOpen(shop.code, open)} />}
          />
        </Panel>

        <Panel as="section" aria-labelledby="printers-title" className="pb-2">
          <PanelHeader
            title={<span id="printers-title">Printers</span>}
            description={`${live.printers.length} in your shop. Customers only see what your printers can do.`}
            action={<AddPrinterDialog shopCode={shop.code} />}
          />
          <div className="mt-3 border-t border-rule">
            <PrinterSettingsList shopCode={shop.code} printers={live.printers} orders={orders} />
          </div>
        </Panel>

        <Panel as="section" className="p-5">
          <h2 className="mb-4 text-title-sm font-semibold text-ink">Your shop QR code</h2>
          <ShopQrCard shop={shop} />
        </Panel>

        <Panel as="section" className="pb-2">
          <PanelHeader
            title="Shop details"
          />
          <DataList
            className="px-5"
            items={[
              ["Name", shop.name],
              ["Shop code", <span key="c" className="font-mono">{shop.code}</span>],
              ["Address", `${shop.address}, ${shop.area}, ${shop.city} ${shop.pincode}`],
              ["Phone", shop.phone],
              ["Hours", `${shop.days}, ${shop.opensAt} – ${shop.closesAt}`],
              ["Owner", ownerName],
              ["Services", shop.services.join(", ")],
            ]}
          />
        </Panel>

        <Panel as="section" className="flex flex-col gap-3 p-5">
          <h2 className="text-title-sm font-semibold text-ink">Account</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/shops/${shop.code}`} target="_blank">
                <ExternalLink aria-hidden />
                See your shop as a customer
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/sign-in/shop?shop=${shop.code}`}>
                <Repeat aria-hidden />
                Switch shop
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                actions.leaveShop();
                router.push("/");
              }}
            >
              <LogOut aria-hidden />
              Sign out
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">
                  <RotateCcw aria-hidden />
                  Reset data
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Reset the demo?"
                description="Restores the original shops, prices, printers and orders, and removes uploaded files."
                footer={
                  <>
                    <DialogClose asChild>
                      <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          await clearFiles().catch(() => undefined);
                          actions.resetDemo();
                          toast.success("Demo data reset");
                        }}
                      >
                        Reset
                      </Button>
                    </DialogClose>
                  </>
                }
              />
            </Dialog>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ShopGate>
      <SettingsPageContent />
    </ShopGate>
  );
}
