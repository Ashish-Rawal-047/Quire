"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Contrast,
  Droplet,
  Eye,
  FileText,
  MessageSquareText,
  Printer,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import * as React from "react";
import { CheckoutBar } from "@/components/patterns/price-summary";
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
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { formatPaise, pluralize } from "@/lib/format";
import { SAMPLE_QUEUE, SAMPLE_SHOPS } from "@/lib/sample-data";
import { GallerySection } from "../_components/section";
import { SAMPLE_PRINTERS } from "./patterns";

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="h-[760px] w-[375px] max-w-full overflow-hidden rounded-[28px] border border-rule-strong bg-paper shadow-overlay">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
      <figcaption className="text-small text-ink-muted">{label}</figcaption>
    </figure>
  );
}

/* ── Customer home ──────────────────────────────────────────────────────── */

function CustomerHome() {
  return (
    <CustomerShell active="home" preview activeOrders={1}>
      <div className="flex flex-col gap-8 px-4 pb-8 pt-6">
        <div>
          <p className="text-small text-ink-muted">Good evening, Ashish</p>
          <h1 className="mt-1 text-headline font-semibold text-ink">What are we printing today?</h1>
        </div>

        <div className="rounded-lg bg-brand p-5 text-on-brand">
          <p className="text-title-sm font-semibold">Start a new print</p>
          <p className="mt-1 text-small text-on-brand/80">Upload, choose settings and pay. Collect when it&rsquo;s ready.</p>
          <Button size="lg" variant="secondary" block className="mt-4 border-transparent bg-white text-brand hover:bg-white/90">
            <Upload aria-hidden />
            Choose files
          </Button>
        </div>

        <section aria-labelledby="active-title">
          <h2 id="active-title" className="text-title-sm font-semibold text-ink">
            In progress
          </h2>
          <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 flex items-center gap-3 rounded-lg border border-rule bg-surface p-4 transition-colors hover:bg-hover">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status="printing" mode="simulated" audience="customer" size="sm" />
                <span className="font-mono text-caption text-ink-muted">PF-2611-0418</span>
              </div>
              <p className="mt-2 truncate text-body font-medium text-ink">Sharma Xerox & Stationery</p>
              <p className="mt-0.5 flex items-center gap-1 text-small text-ink-muted">
                <Clock className="size-3.5" aria-hidden />
                Ready by about 11:00 am
              </p>
            </div>
            <ChevronRight className="size-5 text-ink-faint" aria-hidden />
          </a>
        </section>

        <section aria-labelledby="shops-title">
          <div className="flex items-baseline justify-between">
            <h2 id="shops-title" className="text-title-sm font-semibold text-ink">
              Your shops
            </h2>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-small font-medium text-brand-ink">
              Find shops
            </a>
          </div>
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-surface">
            {SAMPLE_SHOPS.slice(0, 2).map((s) => (
              <li key={s.code} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">{s.name}</p>
                  <p className="text-small text-ink-muted">
                    {s.area} · <span className="text-st-ready-ink">Open</span>
                  </p>
                </div>
                <Button size="sm" variant="secondary">
                  Print here
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="text-title-sm font-semibold text-ink">
            Recent orders
          </h2>
          <ul className="mt-3 flex flex-col">
            {[
              { n: "PF-2611-0391", d: "18 Nov · Campus Copy Centre", p: 1200, s: "completed" as const },
              { n: "PF-2611-0334", d: "12 Nov · Sharma Xerox", p: 400, s: "completed" as const },
              { n: "PF-2611-0302", d: "9 Nov · Print Bazaar", p: 2400, s: "cancelled" as const },
            ].map((o) => (
              <li key={o.n} className="flex items-center justify-between gap-3 border-b border-rule py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-mono text-small text-ink">{o.n}</p>
                  <p className="truncate text-small text-ink-muted">{o.d}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-small font-medium tabular text-ink">{formatPaise(o.p)}</span>
                  <StatusBadge status={o.s} mode="simulated" audience="customer" size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </CustomerShell>
  );
}

/* ── Customer: print settings step ─────────────────────────────────────── */

function CustomerSettings() {
  const [file, setFile] = React.useState("resume");
  const [colour, setColour] = React.useState<"bw" | "colour">("bw");
  const [sides, setSides] = React.useState<"single" | "double">("double");
  const [copies, setCopies] = React.useState(2);
  const [pages, setPages] = React.useState<"all" | "custom">("all");
  const [staple, setStaple] = React.useState(true);

  // Illustrative only — real quotes come from the API (M2). Resume: 2 sides per copy;
  // the marksheet item (1 colour page, ₹10) is fixed in this preview.
  const perSide = colour === "bw" ? 200 : 1000;
  const sheetsPerCopy = sides === "double" ? 1 : 2;
  const total = copies * 2 * perSide + (staple ? copies * 200 : 0) + 1000;

  return (
    <CustomerShell preview hideNav>
      <div className="flex min-h-[calc(760px-56px)] flex-col">
        <div className="flex flex-col gap-4 px-4 pt-3">
          <div className="flex items-center gap-1">
            <IconButton label="Back" className="-ml-2.5">
              <ArrowLeft aria-hidden />
            </IconButton>
            <StepIndicator steps={["Shop", "Upload", "Settings", "Privacy", "Review", "Pay"]} current={2} className="flex-1" />
          </div>
          <div>
            <h1 className="text-title font-semibold text-ink">Print settings</h1>
            <p className="mt-0.5 text-small text-ink-muted">Sharma Xerox & Stationery · prices per side</p>
          </div>

          <div role="tablist" aria-label="Files" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[
              { id: "resume", name: "Resume_2026_final.pdf", pages: 2 },
              { id: "marks", name: "Semester 5 marksheet.pdf", pages: 1 },
            ].map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={file === f.id}
                onClick={() => setFile(f.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                  file === f.id ? "border-brand bg-brand-tint" : "border-rule-strong bg-surface hover:bg-hover",
                )}
              >
                <FileText className={cn("size-4", file === f.id ? "text-brand-ink" : "text-ink-muted")} aria-hidden />
                <span className="max-w-36 truncate text-small font-medium text-ink">{f.name}</span>
                <span className="text-caption text-ink-muted">{f.pages}p</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-4">
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
              { value: "double", label: "Double-sided", description: `${sheetsPerCopy * copies} sheets` },
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
            <span id="pages-label" className="text-small font-medium text-ink">
              Pages
            </span>
            <SegmentedControl
              aria-labelledby="pages-label"
              value={pages}
              onChange={setPages}
              options={[
                { value: "all", label: "All 2 pages" },
                { value: "custom", label: "Choose pages" },
              ]}
            />
            {pages === "custom" ? <Input aria-label="Page range" placeholder="e.g. 1-3, 7" /> : null}
          </div>
          <ToggleRow
            id="phone-staple"
            label="Staple each copy"
            description="+ ₹2 per copy"
            control={<Switch id="phone-staple" checked={staple} onCheckedChange={setStaple} />}
          />
          <button type="button" className="flex items-center justify-between rounded-md py-1 text-body text-ink-2">
            <span className="flex items-center gap-2">
              <MessageSquareText className="size-[18px] text-ink-muted" aria-hidden />
              More options
            </span>
            <span className="text-small text-ink-muted">Orientation, pages per sheet, notes</span>
          </button>
        </div>

        <div className="sticky bottom-0">
          <CheckoutBar totalPaise={Math.round(total)} summary="2 files · prices from the shop" actionLabel="Continue" />
        </div>
      </div>
    </CustomerShell>
  );
}

/* ── Shop workspace ────────────────────────────────────────────────────── */

function ShopWorkspace() {
  const [selected, setSelected] = React.useState(SAMPLE_QUEUE[0].number);
  const [printer, setPrinter] = React.useState(SAMPLE_PRINTERS[0].name);
  const order = SAMPLE_QUEUE.find((o) => o.number === selected) ?? SAMPLE_QUEUE[0];

  return (
    <ShopShell active="orders" preview counts={{ orders: 2, queue: 1 }}>
      <div className="flex h-full min-h-0">
        {/* Queue */}
        <section aria-label="Order queue" className="flex w-[20rem] shrink-0 flex-col border-r border-rule bg-surface">
          <div className="flex flex-col gap-3 px-4 pb-0 pt-4">
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
              <QueueRow key={o.number} order={o} selected={o.number === selected} onSelect={() => setSelected(o.number)} />
            ))}
          </div>
        </section>

        {/* Detail */}
        <section aria-label="Order details" className="min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-rule bg-paper/95 px-6 py-4 backdrop-blur-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
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
              <Button variant="secondary" onClick={() => toast("Reject dialog would open")}>
                Reject
              </Button>
              <Button onClick={() => toast.success("Order accepted", { description: `${order.number} moved to Accepted.` })}>
                Accept
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6 px-6 py-5">
            {order.protectedMode ? (
              <Callout tone="neutral" icon={ShieldCheck} title="Protected order — print only">
                Previews are watermarked and every view is logged. The original can&rsquo;t be downloaded.
              </Callout>
            ) : (
              <Callout tone="info" title="Customer allowed download">
                You can download the original files. Downloads are recorded on the order.
              </Callout>
            )}

            {order.note ? (
              <div className="flex gap-3 rounded-md border border-rule bg-surface px-4 py-3">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                <p className="text-body text-ink">&ldquo;{order.note}&rdquo;</p>
              </div>
            ) : null}

            <div>
              <h3 className="text-small font-medium text-ink-muted">Files ({order.items})</h3>
              <ul className="mt-2 divide-y divide-rule rounded-lg border border-rule bg-surface">
                {Array.from({ length: order.items }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm border border-rule">
                      <PageThumb />
                      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-[35deg] whitespace-nowrap font-mono text-[7px] font-semibold uppercase tracking-wider text-ink/30">
                          Preview only
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-ink">
                        Document {i + 1} <span className="font-normal text-ink-muted">· PDF · {pluralize(i === 0 ? 2 : 1, "page")}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {["A4", order.colour && i === 0 ? "Colour" : "B&W", "Double-sided", "2 copies", i === 0 ? "Staple" : null]
                          .filter(Boolean)
                          .map((t) => (
                            <Badge key={t as string} tone="neutral" size="sm">
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
                  <Select value={printer} onChange={(e) => setPrinter(e.target.value)}>
                    {SAMPLE_PRINTERS.map((p) => (
                      <option key={p.name} value={p.name} disabled={p.state === "error"}>
                        {p.name} — {p.state === "error" ? "needs attention" : p.state === "printing" ? "busy" : "ready"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast("Accept the order first", {
                      description: "Printing unlocks once the order is accepted.",
                    })
                  }
                >
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
      </div>
    </ShopShell>
  );
}

export function Screens() {
  return (
    <GallerySection
      id="screens"
      eyebrow="Screens"
      title="In context"
      intro={
        <p>
          Early compositions of real screens using only the components above. Content is sample data; these become the
          working product in the next milestones.
        </p>
      }
    >
      <div id="customer-app" className="flex scroll-mt-24 flex-wrap justify-center gap-10 xl:justify-start">
        <PhoneFrame label="Customer · Home">
          <CustomerHome />
        </PhoneFrame>
        <PhoneFrame label="Customer · Order step 3, print settings">
          <CustomerSettings />
        </PhoneFrame>
      </div>

      <figure id="shop-workspace" className="flex scroll-mt-24 flex-col gap-3">
        <div className="overflow-x-auto rounded-lg border border-rule-strong shadow-overlay">
          <div className="h-[720px] min-w-[1100px]">
            <ShopWorkspace />
          </div>
        </div>
        <figcaption className="text-center text-small text-ink-muted">Shop · Orders workspace (desktop)</figcaption>
      </figure>
    </GallerySection>
  );
}
