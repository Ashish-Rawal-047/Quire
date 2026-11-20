"use client";

/**
 * REVIEW-ONLY compositions showing the main responsive states. Shells respond to the frame width
 * via container queries (`@container/shop`, `@container/shell`), exactly as on real devices.
 */
import { ArrowRight, Contrast, Droplet, Eye, MessageSquareText, Printer, ScanLine, Search, ShieldCheck } from "lucide-react";
import * as React from "react";
import { CheckoutBar, PriceSummary } from "@/components/patterns/price-summary";
import { QueueRow } from "@/components/patterns/queue";
import { PageThumb } from "@/components/patterns/upload";
import { CustomerShell } from "@/components/shell/customer-shell";
import { ShopShell } from "@/components/shell/shop-shell";
import { Badge, SimulatedTag, StatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Switch, ToggleRow } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPaise, pluralize } from "@/lib/format";
import { SAMPLE_QUEUE, type SampleQueueOrder } from "@/lib/sample-data";
import { DeviceFrame } from "./frames";
import { CollectedReceipt, ORDER_LINES, ORDER_TOTAL, ReadyTicket, StepShop, Tracking } from "./order-flow";

function QueuePane({ selected, onSelect }: { selected?: string; onSelect: (n: string) => void }) {
  return (
    <section aria-label="Order queue" className="flex min-h-0 w-full flex-col border-rule bg-surface @3xl/shop:w-[20rem] @3xl/shop:shrink-0 @3xl/shop:border-r">
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-title font-semibold text-ink">Orders</h1>
          <span className="text-small text-ink-muted">Today · ₹1,284</span>
        </div>
        <Input aria-label="Search orders" placeholder="Order no., customer or code" leading={<Search />} />
        <Tabs defaultValue="active">
          <TabsList className="gap-4">
            <TabsTrigger value="active" count={5}>
              Active
            </TabsTrigger>
            <TabsTrigger value="ready" count={1}>
              Ready
            </TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
        {SAMPLE_QUEUE.map((o) => (
          <QueueRow key={o.number} order={o} selected={o.number === selected} onSelect={() => onSelect(o.number)} />
        ))}
      </div>
    </section>
  );
}

function DetailPane({ order }: { order: SampleQueueOrder }) {
  return (
    <section aria-label="Order details" className="min-w-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper/95 px-6 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-mono text-title-sm font-semibold text-ink">{order.number}</h2>
            <StatusBadge status={order.status} mode={order.printMode} />
            <Badge tone="success" size="sm">
              Paid {formatPaise(order.totalPaise)}
            </Badge>
          </div>
          <p className="mt-1 text-small text-ink-muted">
            {order.customer} · {order.phoneMasked} · placed {order.minutesAgo} min ago
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary">Reject</Button>
          <Button>
            Accept
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-6 px-6 py-5">
        <Callout tone="neutral" icon={ShieldCheck} title="Protected order — print only">
          Previews are watermarked and every view is logged. The original can&rsquo;t be downloaded.
        </Callout>
        <div>
          <h3 className="text-small font-medium text-ink-muted">Files ({order.items})</h3>
          <ul className="mt-2 divide-y divide-rule rounded-lg border border-rule bg-surface">
            {Array.from({ length: order.items }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm border border-rule">
                  <PageThumb />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-ink">
                    Document {i + 1}{" "}
                    <span className="font-normal text-ink-muted">· PDF · {pluralize(i === 0 ? 2 : 1, "page")}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["A4", "B&W", "Double-sided", "2 copies"].map((t) => (
                      <Badge key={t} tone="neutral" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye aria-hidden />
                  Preview
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-rule bg-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Send to printer" className="min-w-56 flex-1">
              <Select defaultValue="laser">
                <option value="laser">Counter laser — ready</option>
                <option value="inkjet">Colour inkjet — ready</option>
              </Select>
            </Field>
            <Button variant="secondary">
              <Printer aria-hidden />
              Print {order.sheets} sheets
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-small text-ink-muted">
            <SimulatedTag compact />
            <span>This printer is simulated by the Quire print agent. No paper will be printed.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShopWorkspace() {
  const [selected, setSelected] = React.useState(SAMPLE_QUEUE[0].number);
  const order = SAMPLE_QUEUE.find((o) => o.number === selected) ?? SAMPLE_QUEUE[0];
  return (
    <ShopShell active="orders" preview counts={{ orders: 2, queue: 1 }}>
      <div className="flex h-full min-h-0">
        <QueuePane selected={selected} onSelect={setSelected} />
        {/* Below tablet width the queue is the page; the detail opens as its own screen. */}
        <div className="hidden min-w-0 flex-1 @3xl/shop:flex">
          <DetailPane order={order} />
        </div>
      </div>
    </ShopShell>
  );
}

type PickupState = "idle" | "wrong" | "locked" | "verified";

/**
 * Completing a Ready order. The server checks the code (attempt limits, rate limits, lockout);
 * this composition shows each response it can give. Simulated orders get a demo check that hands
 * over nothing.
 */
function PickupCheck({ state = "idle" }: { state?: PickupState }) {
  const [code, setCode] = React.useState(state === "idle" ? "" : state === "verified" ? "7305" : "7350");
  const ready = SAMPLE_QUEUE.find((o) => o.status === "ready") ?? SAMPLE_QUEUE[4];
  const simulated = ready.printMode === "simulated";
  const locked = state === "locked";
  const done = state === "verified";
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-paper p-4 @3xl/shop:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-mono text-title-sm font-semibold text-ink">{ready.number}</h2>
        <StatusBadge status={done ? "completed" : "ready"} mode={ready.printMode} />
        <span className="text-small text-ink-muted">
          {ready.customer} · {ready.phoneMasked}
        </span>
      </div>
      <div className="max-w-2xl rounded-lg border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-title-sm font-semibold text-ink">{simulated ? "Demo pickup check" : "Hand over prints"}</h3>
          {simulated ? <SimulatedTag compact /> : null}
        </div>
        <p className="mt-1 text-small text-ink-muted">
          {simulated
            ? "This order was printed by the simulated printer, so there are no prints to hand over. Checking the customer’s demo code completes the demo order."
            : "Ask the customer for their 4-digit pickup code, or scan the QR on their phone. The order is only marked collected once the code is verified."}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label={simulated ? "Demo code" : "Pickup code"} className="w-40">
            <Input
              inputMode="numeric"
              maxLength={4}
              value={code}
              disabled={locked || done}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="font-mono tracking-[0.3em]"
              placeholder="••••"
            />
          </Field>
          <Button disabled={code.length !== 4 || locked || done}>
            {simulated ? "Verify demo code" : "Verify & mark collected"}
          </Button>
          <Button variant="secondary" disabled={locked || done}>
            <ScanLine aria-hidden />
            Scan QR
          </Button>
        </div>
        {state === "wrong" ? (
          <Callout tone="danger" title="That code doesn’t match" className="mt-4">
            3 attempts left. After 5 wrong codes, pickup for this order is locked for 15 minutes.
          </Callout>
        ) : null}
        {locked ? (
          <Callout tone="warning" title="Pickup locked until 6:52 pm" className="mt-4">
            5 wrong codes were entered, so this order can&rsquo;t be checked for 15 minutes. If the customer is at the
            counter, the shop owner can unlock it with a reason. The unlock is shown on the customer&rsquo;s receipt.
          </Callout>
        ) : null}
        {done ? (
          <Callout tone="success" title={simulated ? "Demo pickup check passed" : "Code verified · order collected"} className="mt-4">
            {simulated
              ? "Demo order completed. No prints were handed over. The customer’s files will be deleted within an hour."
              : "Hand over the prints. The customer’s files will be deleted within an hour."}
          </Callout>
        ) : null}
        <p className="mt-4 flex items-center gap-1.5 text-caption text-ink-muted">
          <ShieldCheck className="size-3.5" aria-hidden />
          Checked by the server. Attempts are limited and every attempt is logged.
        </p>
      </div>
    </div>
  );
}

function CustomerSettingsDesktop() {
  const [colour, setColour] = React.useState<"bw" | "colour">("bw");
  const [sides, setSides] = React.useState<"single" | "double">("double");
  const [copies, setCopies] = React.useState(2);
  const [staple, setStaple] = React.useState(true);
  return (
    <CustomerShell preview hideNav>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 @xl/shell:px-6">
        <StepIndicator steps={["Shop", "Upload", "Settings", "Privacy", "Review", "Pay"]} current={2} />
        <div className="grid gap-8 @3xl/shell:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <IconButton label="Back" className="-ml-2.5">
                <ArrowRight className="rotate-180" aria-hidden />
              </IconButton>
              <div>
                <h1 className="text-title font-semibold text-ink">Print settings</h1>
                <p className="text-small text-ink-muted">Resume_2026_final.pdf · 2 pages</p>
              </div>
            </div>
            <div className="grid gap-5 @2xl/shell:grid-cols-2">
              <SegmentedControl
                aria-label="Colour"
                size="lg"
                value={colour}
                onChange={setColour}
                options={[
                  { value: "bw", label: "Black & white", icon: <Contrast />, description: "₹2 / side" },
                  { value: "colour", label: "Colour", icon: <Droplet />, description: "₹10 / side" },
                ]}
              />
              <SegmentedControl
                aria-label="Sides"
                size="lg"
                value={sides}
                onChange={setSides}
                options={[
                  { value: "single", label: "Single-sided", description: `${2 * copies} sheets` },
                  { value: "double", label: "Double-sided", description: `${copies} sheets` },
                ]}
              />
              <Field label="Copies">
                <NumberStepper value={copies} onChange={setCopies} max={50} unit="copies" />
              </Field>
              <Field label="Paper">
                <Select defaultValue="A4">
                  <option value="A4">A4</option>
                  <option value="LEGAL">Legal</option>
                </Select>
              </Field>
            </div>
            <ToggleRow
              id="desk-staple"
              label="Staple each copy"
              description="+ ₹2 per copy"
              control={<Switch id="desk-staple" checked={staple} onCheckedChange={setStaple} />}
            />
            <button type="button" className="flex items-center gap-2 self-start rounded-md py-1 text-body text-ink-2">
              <MessageSquareText className="size-[18px] text-ink-muted" aria-hidden />
              More options
            </button>
          </div>
          <aside className="hidden flex-col gap-4 self-start rounded-lg border border-rule bg-surface p-5 @3xl/shell:flex">
            <h2 className="text-title-sm font-semibold text-ink">Order summary</h2>
            <PriceSummary lines={ORDER_LINES} totalPaise={ORDER_TOTAL} testMode />
            <Button size="lg" block>
              Continue
            </Button>
          </aside>
        </div>
      </div>
      <div className="sticky bottom-0 @3xl/shell:hidden">
        <CheckoutBar totalPaise={ORDER_TOTAL} summary="2 files · 3 sheets" actionLabel="Continue" />
      </div>
    </CustomerShell>
  );
}

const SIZES = [
  { key: "desktop", label: "desktop", width: 1280, minHeight: 760 },
  { key: "tablet", label: "tablet", width: 768, minHeight: 900 },
  { key: "mobile", label: "mobile", width: 390, minHeight: 844 },
] as const;

/** One affected customer screen at desktop, tablet and phone widths. */
function ThreeSizes({ shot, label, render }: { shot: string; label: string; render: () => React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      {SIZES.map((s) => (
        <DeviceFrame key={s.key} shot={`${shot}-${s.key}`} label={`${label} · ${s.label}`} width={s.width} minHeight={s.minHeight}>
          {render()}
        </DeviceFrame>
      ))}
    </div>
  );
}

function ShopPickup({ state }: { state: PickupState }) {
  return (
    <ShopShell active="orders" preview counts={{ orders: 2, queue: 1 }}>
      <PickupCheck state={state} />
    </ShopShell>
  );
}

export function ResponsiveStates() {
  return (
    <div className="flex flex-col gap-10">
      <DeviceFrame shot="shop-desktop-1440" label="Shop workspace · desktop (full sidebar)" width={1440} height={900}>
        <ShopWorkspace />
      </DeviceFrame>
      <div className="flex flex-wrap items-start gap-6">
        <DeviceFrame shot="shop-tablet-834" label="Shop workspace · tablet (icon rail with Open/Closed switch)" width={834} height={1000}>
          <ShopWorkspace />
        </DeviceFrame>
        <DeviceFrame shot="shop-phone-390" label="Shop workspace · phone (queue only)" width={390} height={844}>
          <ShopWorkspace />
        </DeviceFrame>
      </div>

      <h3 className="-mb-4 text-title font-semibold text-ink">Pickup verification (shop)</h3>
      <div className="flex flex-wrap items-start gap-6">
        <DeviceFrame shot="shop-pickup-desktop" label="Pickup · wrong code, attempts left · desktop" width={1280} height={640}>
          <ShopPickup state="wrong" />
        </DeviceFrame>
        <DeviceFrame shot="shop-pickup-tablet" label="Pickup · locked after 5 wrong codes · tablet" width={834} height={640}>
          <ShopPickup state="locked" />
        </DeviceFrame>
        <DeviceFrame shot="shop-pickup-mobile" label="Pickup · demo check passed · mobile" width={390} height={844}>
          <ShopPickup state="verified" />
        </DeviceFrame>
      </div>

      <h3 className="-mb-4 text-title font-semibold text-ink">Affected customer screens at three widths</h3>
      <ThreeSizes shot="customer-shops" label="Choose shop (shop list)" render={() => <StepShop />} />
      <ThreeSizes shot="customer-tracking" label="Tracking (simulated)" render={() => <Tracking />} />
      <ThreeSizes shot="customer-ticket" label="Demo ticket (simulated)" render={() => <ReadyTicket />} />
      <ThreeSizes shot="customer-receipt" label="Access receipt (simulated)" render={() => <CollectedReceipt />} />

      <h3 className="-mb-4 text-title font-semibold text-ink">Customer settings (unchanged)</h3>
      <DeviceFrame shot="customer-desktop-1280" label="Customer order flow · desktop (full steps, side summary)" width={1280} minHeight={760}>
        <CustomerSettingsDesktop />
      </DeviceFrame>
      <DeviceFrame shot="customer-tablet-768" label="Customer order flow · tablet" width={768} minHeight={900}>
        <CustomerSettingsDesktop />
      </DeviceFrame>
    </div>
  );
}
