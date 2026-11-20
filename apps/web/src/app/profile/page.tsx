"use client";

import { LogOut, RotateCcw, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerFrame } from "@/components/demo/customer-frame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DataList, Panel, PanelHeader } from "@/components/ui/panel";
import { clearFiles } from "@/lib/demo/files";
import { actions } from "@/lib/demo/store";
import { maskPhone } from "@/lib/format";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <CustomerFrame active="profile">
      {(state) => (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 pt-6 @xl/shell:px-6">
          <h1 className="text-headline font-semibold text-ink">Profile</h1>
          <Panel as="section" className="pb-2">
            <PanelHeader title="Account" />
            <DataList
              className="px-5"
              items={[
                ["Name", state.customer!.name],
                ["Mobile", state.customer!.phone || "—"],
                ["Shops see", `${state.customer!.name.split(" ")[0]} · ${maskPhone(state.customer!.phone)}`],
                ["Orders", String(state.orders.filter((o) => o.mine).length)],
              ]}
            />
          </Panel>
          <Panel as="section" className="flex flex-col gap-3 p-5">
            <h2 className="text-title-sm font-semibold text-ink">Try the other side</h2>
            <p className="text-small text-ink-2">
              Switch to the shop workspace to accept, print and complete orders, including the ones you placed here.
            </p>
            <Button asChild variant="secondary" className="self-start">
              <Link href={state.shopSession ? "/shop" : "/sign-in/shop"}>
                <Store aria-hidden />
                Open shop workspace
              </Link>
            </Button>
          </Panel>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                actions.leaveCustomer();
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
                description="Clears your orders and changes and restores the original shops and orders."
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
        </div>
      )}
    </CustomerFrame>
  );
}
