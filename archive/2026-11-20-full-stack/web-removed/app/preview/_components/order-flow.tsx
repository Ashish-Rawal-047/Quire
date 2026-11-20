"use client";

/**
 * REVIEW-ONLY composition of the customer order flow, built purely from existing design-system
 * components with sample data. Nothing here is wired to the API; the real flow is built in M2–M4.
 */
import {
  ArrowLeft,
  CreditCard,
  FileText,
  MessageSquareText,
  Search,
  ShieldCheck,
  Smartphone,
  Trash,
  X,
  Contrast,
  Droplet,
} from "lucide-react";
import * as React from "react";
import { AccessReceipt, type AccessEntry } from "@/components/patterns/access-receipt";
import { JobTicket } from "@/components/patterns/job-ticket";
import { OrderTimeline } from "@/components/patterns/order-timeline";
import { CheckoutBar, PriceSummary, type PriceLine } from "@/components/patterns/price-summary";
import { PrivacyChoice, type PrivacyMode } from "@/components/patterns/privacy-choice";
import { ShopRow } from "@/components/patterns/shop-row";
import { Dropzone, FileRow, PageThumb } from "@/components/patterns/upload";
import { CustomerShell } from "@/components/shell/customer-shell";
import { Badge, SimulatedTag, StatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui/choice-card";
import { Callout } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { DataList } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Switch, ToggleRow } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { SAMPLE_SHOPS } from "@/lib/sample-data";
import { statusCopy, type PrintMode } from "@/lib/status";
import { DeviceFrame } from "./frames";

const STEPS = ["Shop", "Upload", "Settings", "Privacy", "Review", "Pay"];
const SHOP = SAMPLE_SHOPS[0];
const PHONE = { width: 390, minHeight: 844 };

export const ORDER_LINES: PriceLine[] = [
  { label: "Resume_2026_final.pdf", detail: "2 pages · B&W · double-sided · 2 copies", paise: 800 },
  { label: "Stapling", detail: "2 copies × ₹2", paise: 400 },
  { label: "Semester 5 marksheet.pdf", detail: "1 page · colour · 1 copy", paise: 1000 },
];
export const ORDER_TOTAL = 2200;

/** Every Phase 1 order is simulated: the server sets this from the shop's print agent. */
const MODE: PrintMode = "simulated";

const RECEIPT_PRINTING: AccessEntry[] = [
  { action: "uploaded", at: "6:08", actor: "You", detail: "2 files · each with its own key" },
  { action: "previewed", at: "6:14", actor: "Ravi (Sharma Xerox)", detail: "Page 1 of Resume" },
  { action: "printed", at: "6:15", actor: "Counter laser", detail: "2 copies" },
];

const RECEIPT_COLLECTED: AccessEntry[] = [
  ...RECEIPT_PRINTING,
  { action: "printed", at: "6:16", actor: "Colour inkjet", detail: "1 copy" },
  { action: "download_denied", at: "6:17", actor: "Ravi (Sharma Xerox)", detail: "Protected order" },
  { action: "pickup_verified", at: "6:41", actor: "Ravi (Sharma Xerox)", detail: "Demo code checked" },
  { action: "deleted", at: "7:41", actor: "Quire", detail: "1 hour after pickup" },
  { action: "key_destroyed", at: "Sat 00:05", actor: "Quire", detail: "Backup copies can no longer be decrypted" },
];

/** Customer screens are a single column; on wider frames it is centred at a readable width. */
const COLUMN = "mx-auto w-full max-w-2xl";

function WizardScreen({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <CustomerShell preview hideNav>
      <div className={cn("flex min-h-[788px] flex-col", COLUMN)}>
        <div className="flex flex-col gap-4 px-4 pt-3">
          <div className="flex items-center gap-1">
            <IconButton label={step === 0 ? "Close" : "Back"} className="-ml-2.5">
              {step === 0 ? <X aria-hidden /> : <ArrowLeft aria-hidden />}
            </IconButton>
            <StepIndicator steps={STEPS} current={step} className="flex-1" />
          </div>
          <div>
            <h1 className="text-title font-semibold text-ink">{title}</h1>
            {subtitle ? <p className="mt-0.5 text-small text-ink-muted">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">{children}</div>
        <div className="sticky bottom-0">{footer}</div>
      </div>
    </CustomerShell>
  );
}

function FooterButton({ children, disabled, hint }: { children: React.ReactNode; disabled?: boolean; hint?: string }) {
  return (
    <div className="border-t border-rule bg-surface/95 px-4 pb-4 pt-3 backdrop-blur-sm">
      {hint ? <p className="mb-2 text-center text-caption text-ink-muted">{hint}</p> : null}
      <Button size="lg" block disabled={disabled}>
        {children}
      </Button>
    </div>
  );
}

/* 1 — Shop */
function StepShop() {
  const [selected, setSelected] = React.useState(SHOP.code);
  return (
    <WizardScreen
      step={0}
      title="Choose a print shop"
      subtitle="Search by name, shop code or PIN code"
      footer={<FooterButton>Continue with Sharma Xerox</FooterButton>}
    >
      <Input aria-label="Search shops" defaultValue="110024" leading={<Search />} />
      <p className="-mb-3 text-small font-medium text-ink-muted">3 shops near 110024</p>
      <div className="-mx-4 divide-y divide-rule border-y border-rule bg-surface">
        {SAMPLE_SHOPS.map((s) => (
          <ShopRow key={s.code} shop={s} selected={selected === s.code} onSelect={() => setSelected(s.code)} />
        ))}
      </div>
    </WizardScreen>
  );
}

/* 2 — Upload */
function StepUpload() {
  return (
    <WizardScreen
      step={1}
      title="Add your files"
      subtitle="Sharma Xerox & Stationery · QX7K2P"
      footer={<FooterButton hint="Files that couldn't be read won't be included.">Continue with 2 files</FooterButton>}
    >
      <Dropzone onFiles={() => undefined} />
      <div className="divide-y divide-rule">
        <FileRow name="Resume_2026_final.pdf" type="pdf" sizeKb={184} state={{ kind: "ready", pages: 2 }} onRemove={() => undefined} thumbnail={<PageThumb />} />
        <FileRow name="Semester 5 marksheet.pdf" type="pdf" sizeKb={912} state={{ kind: "ready", pages: 1 }} onRemove={() => undefined} thumbnail={<PageThumb lines={5} />} />
        <FileRow
          name="Bank statement (locked).pdf"
          type="pdf"
          sizeKb={340}
          state={{ kind: "error", message: "This PDF is password-protected. Remove the password and upload it again." }}
          onRemove={() => undefined}
        />
      </div>
      <Callout tone="neutral" icon={ShieldCheck}>
        Files are checked and encrypted when they arrive. The shop can&rsquo;t see them until you&rsquo;ve paid.
      </Callout>
    </WizardScreen>
  );
}

/* 3 — Settings */
function StepSettings() {
  const [colour, setColour] = React.useState<"bw" | "colour">("bw");
  const [sides, setSides] = React.useState<"single" | "double">("double");
  const [copies, setCopies] = React.useState(2);
  const [pages, setPages] = React.useState<"all" | "custom">("all");
  const [staple, setStaple] = React.useState(true);
  return (
    <WizardScreen
      step={2}
      title="Print settings"
      subtitle="Prices are set by Sharma Xerox"
      footer={<CheckoutBar totalPaise={ORDER_TOTAL} summary="2 files · 3 sheets" actionLabel="Continue" />}
    >
      <div role="tablist" aria-label="Files" className="-mx-4 -mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          { id: "resume", name: "Resume_2026_final.pdf", pages: 2, active: true },
          { id: "marks", name: "Semester 5 marksheet.pdf", pages: 1, active: false },
        ].map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.active}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left",
              f.active ? "border-brand bg-brand-tint" : "border-rule-strong bg-surface",
            )}
          >
            <FileText className={cn("size-4", f.active ? "text-brand-ink" : "text-ink-muted")} aria-hidden />
            <span className="max-w-36 truncate text-small font-medium text-ink">{f.name}</span>
            <span className="text-caption text-ink-muted">{f.pages}p</span>
          </button>
        ))}
      </div>
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
      <div className="grid grid-cols-2 gap-4">
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
      <div className="flex flex-col gap-2">
        <span id="flow-pages" className="text-small font-medium text-ink">
          Pages
        </span>
        <SegmentedControl
          aria-labelledby="flow-pages"
          value={pages}
          onChange={setPages}
          options={[
            { value: "all", label: "All 2 pages" },
            { value: "custom", label: "Choose pages" },
          ]}
        />
      </div>
      <ToggleRow
        id="flow-staple"
        label="Staple each copy"
        description="+ ₹2 per copy"
        control={<Switch id="flow-staple" checked={staple} onCheckedChange={setStaple} />}
      />
      <button type="button" className="flex items-center justify-between rounded-md py-1 text-body text-ink-2">
        <span className="flex items-center gap-2">
          <MessageSquareText className="size-[18px] text-ink-muted" aria-hidden />
          More options
        </span>
        <span className="text-small text-ink-muted">Orientation, pages per sheet, notes</span>
      </button>
    </WizardScreen>
  );
}

/* 4 — Privacy (default, and with "Allow download" chosen but not yet acknowledged) */
function StepPrivacy({ mode: initial }: { mode: PrivacyMode }) {
  const [mode, setMode] = React.useState<PrivacyMode>(initial);
  const [ack, setAck] = React.useState(false);
  const blocked = mode === "download_permitted" && !ack;
  return (
    <WizardScreen
      step={3}
      title="Who can access your files?"
      subtitle="Applies to every file in this order"
      footer={
        <FooterButton disabled={blocked} hint={blocked ? "Tick the box above to allow downloads." : undefined}>
          Continue
        </FooterButton>
      }
    >
      <PrivacyChoice
        value={mode}
        onChange={(m) => {
          setMode(m);
          setAck(false);
        }}
        acknowledged={ack}
        onAcknowledgedChange={setAck}
        shopName="Sharma Xerox"
      />
    </WizardScreen>
  );
}

/* 5 — Review */
function StepReview() {
  return (
    <WizardScreen
      step={4}
      title="Review your order"
      footer={<CheckoutBar totalPaise={ORDER_TOTAL} summary="Test payment · no real money" actionLabel="Pay ₹22" />}
    >
      <DataList
        items={[
          [
            "Shop",
            <span key="s">
              Sharma Xerox & Stationery
              <span className="block text-small text-ink-muted">Lajpat Nagar II · open until 9:30 pm</span>
            </span>,
          ],
          [
            "Privacy",
            <span key="p" className="inline-flex items-center gap-1.5 text-brand-ink">
              <ShieldCheck className="size-4" aria-hidden />
              Protected printing
            </span>,
          ],
          [
            "Printing",
            <span key="m" className="flex flex-col items-start gap-1">
              <SimulatedTag />
              <span className="text-small text-ink-muted">This shop uses Quire&rsquo;s demo printer. There will be nothing to collect.</span>
            </span>,
          ],
        ]}
      />
      <div className="rounded-lg border border-rule bg-surface p-4">
        <PriceSummary lines={ORDER_LINES} totalPaise={ORDER_TOTAL} testMode />
      </div>
      <p className="text-small text-ink-muted">
        If the shop doesn&rsquo;t accept within 20 minutes, or rejects the order, you get a full refund and your files are
        deleted.
      </p>
    </WizardScreen>
  );
}

/* 6 — Pay (mock gateway) */
function StepPay() {
  const [method, setMethod] = React.useState("upi");
  return (
    <WizardScreen
      step={5}
      title="Pay ₹22"
      subtitle="Sharma Xerox & Stationery · PF-2611-0421"
      footer={
        <div className="flex flex-col gap-2 border-t border-rule bg-surface/95 px-4 pb-4 pt-3">
          <Button size="lg" block>
            Simulate successful payment
          </Button>
          <Button size="lg" block variant="secondary">
            Simulate failed payment
          </Button>
        </div>
      }
    >
      <Callout tone="warning" title="Test mode — no money moves">
        This is Quire&rsquo;s mock payment gateway. Nothing is charged, and the order is only marked paid after the server
        confirms the test payment.
      </Callout>
      <ChoiceCardGroup value={method} onValueChange={setMethod} aria-label="Payment method">
        <ChoiceCard value="upi" icon={<Smartphone />} title="UPI">
          Any UPI app
        </ChoiceCard>
        <ChoiceCard value="card" icon={<CreditCard />} title="Card">
          Debit or credit card
        </ChoiceCard>
      </ChoiceCardGroup>
      <p className="text-small text-ink-muted">
        With Razorpay test mode enabled, Razorpay&rsquo;s own checkout opens here instead. Card details never touch Quire.
      </p>
    </WizardScreen>
  );
}

/* Confirmation */
function Confirmation() {
  return (
    <CustomerShell preview active="orders" activeOrders={1}>
      <div className={cn("flex flex-col gap-6 px-4 pb-8 pt-6", COLUMN)}>
        <div className="text-center">
          <p className="text-small font-medium text-success-ink">Payment confirmed (test)</p>
          <h1 className="mt-1 text-headline font-semibold text-ink">Sent to Sharma Xerox</h1>
          <p className="mt-2 text-body text-ink-2">We&rsquo;ll let you know when it&rsquo;s accepted and when it&rsquo;s done.</p>
        </div>
        <JobTicket
          orderNumber="PF-2611-0421"
          pickupCode="7305"
          pickupToken="qpk_3a9e1c07f2d64b5e"
          shopName="Sharma Xerox & Stationery"
          shopArea="Lajpat Nagar II, New Delhi"
          status="paid"
          summary="2 files · 3 sheets"
          totalPaise={ORDER_TOTAL}
          protectedMode
          printMode={MODE}
        />
        <div className="flex flex-col gap-2">
          <Button size="lg" block>
            Track order
          </Button>
          <Button size="lg" block variant="ghost">
            Back to home
          </Button>
        </div>
      </div>
    </CustomerShell>
  );
}

/* Tracking (printing) */
export function Tracking() {
  return (
    <CustomerShell preview active="orders" activeOrders={1}>
      <div className={cn("flex flex-col gap-6 px-4 pb-8 pt-6", COLUMN)}>
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status="printing" mode={MODE} audience="customer" />
            <span className="font-mono text-small text-ink-muted">PF-2611-0421</span>
          </div>
          <h1 className="mt-2 text-title font-semibold text-ink">Sharma Xerox & Stationery</h1>
          <p className="text-small text-ink-muted">Demo print job · Lajpat Nagar II</p>
        </div>
        <OrderTimeline
          current="printing"
          mode={MODE}
          events={{
            paid: { status: "paid", at: "6:12 pm" },
            accepted: { status: "accepted", at: "6:13 pm" },
            printing: { status: "printing", at: "6:15 pm" },
          }}
        />
        <section aria-labelledby="receipt-title" className="rounded-lg border border-rule bg-surface px-4 pt-3">
          <div className="flex items-center justify-between">
            <h2 id="receipt-title" className="text-title-sm font-semibold text-ink">
              Access receipt
            </h2>
            <Badge tone="brand" size="sm">
              <ShieldCheck aria-hidden />
              Protected
            </Badge>
          </div>
          <AccessReceipt entries={RECEIPT_PRINTING} printMode={MODE} />
        </section>
      </div>
    </CustomerShell>
  );
}

/* Ready: pickup ticket. Simulated (Phase 1) and physical (Phase 2, for comparison). */
export function ReadyTicket({ mode = MODE }: { mode?: PrintMode }) {
  return (
    <CustomerShell preview active="orders" activeOrders={1}>
      <div className={cn("flex flex-col gap-6 px-4 pb-8 pt-6", COLUMN)}>
        <div>
          <h1 className="text-title font-semibold text-ink">{statusCopy("ready", mode).customerLabel}</h1>
          <p className="mt-1 text-small text-ink-2">{statusCopy("ready", mode).customerHint}</p>
        </div>
        <JobTicket
          orderNumber="PF-2611-0421"
          pickupCode="7305"
          pickupToken="qpk_3a9e1c07f2d64b5e"
          shopName="Sharma Xerox & Stationery"
          shopArea="Lajpat Nagar II, New Delhi"
          status="ready"
          summary="2 files · 3 sheets"
          totalPaise={ORDER_TOTAL}
          protectedMode
          printMode={mode}
        />
        <Button variant="danger-ghost" className="self-center">
          <Trash aria-hidden />
          Delete my files now
        </Button>
      </div>
    </CustomerShell>
  );
}

export function CollectedReceipt() {
  return (
    <CustomerShell preview active="orders">
      <div className={cn("flex flex-col gap-5 px-4 pb-8 pt-6", COLUMN)}>
        <div>
          <StatusBadge status="completed" mode={MODE} audience="customer" />
          <h1 className="mt-2 text-title font-semibold text-ink">Access receipt</h1>
          <p className="mt-1 text-small text-ink-muted">PF-2611-0421 · everything that happened to your files</p>
        </div>
        <AccessReceipt entries={RECEIPT_COLLECTED} printMode={MODE} />
        <Callout tone="neutral">
          Order details and this receipt stay in your history. The files, their stored copies and their encryption keys
          are gone.
        </Callout>
      </div>
    </CustomerShell>
  );
}

export { StepShop };

export function OrderFlow() {
  return (
    <div className="flex flex-wrap gap-6">
      <DeviceFrame shot="flow-1-shop" label="1 · Choose shop" {...PHONE}>
        <StepShop />
      </DeviceFrame>
      <DeviceFrame shot="flow-2-upload" label="2 · Upload" {...PHONE}>
        <StepUpload />
      </DeviceFrame>
      <DeviceFrame shot="flow-3-settings" label="3 · Print settings" {...PHONE}>
        <StepSettings />
      </DeviceFrame>
      <DeviceFrame shot="flow-4a-privacy-protected" label="4 · Privacy (default)" {...PHONE}>
        <StepPrivacy mode="protected" />
      </DeviceFrame>
      <DeviceFrame shot="flow-4b-privacy-download" label="4 · Privacy (download chosen, not yet confirmed)" {...PHONE}>
        <StepPrivacy mode="download_permitted" />
      </DeviceFrame>
      <DeviceFrame shot="flow-5-review" label="5 · Review & price (simulated printing disclosed before paying)" {...PHONE}>
        <StepReview />
      </DeviceFrame>
      <DeviceFrame shot="flow-6-pay" label="6 · Pay (mock gateway)" {...PHONE}>
        <StepPay />
      </DeviceFrame>
      <DeviceFrame shot="flow-7-confirmation" label="Confirmation · job ticket (simulated)" {...PHONE}>
        <Confirmation />
      </DeviceFrame>
      <DeviceFrame shot="flow-8-tracking" label="Tracking · timeline + access receipt (simulated)" {...PHONE}>
        <Tracking />
      </DeviceFrame>
      <DeviceFrame shot="ticket-ready" label="Simulation finished · demo ticket" {...PHONE}>
        <ReadyTicket />
      </DeviceFrame>
      <DeviceFrame shot="ticket-ready-physical" label="Phase 2 comparison · real pickup ticket" {...PHONE}>
        <ReadyTicket mode="physical" />
      </DeviceFrame>
      <DeviceFrame shot="receipt-collected" label="Demo completed · full access receipt" {...PHONE}>
        <CollectedReceipt />
      </DeviceFrame>
    </div>
  );
}
