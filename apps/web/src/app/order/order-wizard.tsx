"use client";

import { ArrowLeft, Banknote, Contrast, CreditCard, Droplet, FileText, Image as ImageIcon, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { CustomerFrame } from "@/components/demo/customer-frame";
import { DocThumb } from "@/components/demo/doc-preview";
import { CheckoutBar, PriceSummary } from "@/components/patterns/price-summary";
import { Dropzone, FileRow, type FileRowState } from "@/components/patterns/upload";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui/choice-card";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { DataList } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Switch, ToggleRow } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { analyseFile, FileProblem, saveFile } from "@/lib/demo/files";
import { DEFAULT_SETTINGS, describeSettings, quote } from "@/lib/demo/pricing";
import { SAMPLE_DOCS, sampleItem, type SampleDocKey } from "@/lib/demo/seed";
import { shopByCode } from "@/lib/demo/shops";
import { actions } from "@/lib/demo/store";
import type { DemoShop, ItemSettings, OrderItem, PaperSize, PaymentMethod, ShopState } from "@/lib/demo/types";
import { formatPaise } from "@/lib/format";

const STEPS = ["Upload", "Settings", "Review", "Pay"];

type DraftItem = OrderItem & { state: FileRowState };

function canPrint(live: ShopState, s: ItemSettings) {
  return live.printers.some((p) => p.sizes.includes(s.paper) && (s.colour === "bw" || p.colour));
}

/* ── Step 1: upload ─────────────────────────────────────────────────────────────────────── */

function UploadStep({ items, setItems }: { items: DraftItem[]; setItems: React.Dispatch<React.SetStateAction<DraftItem[]>> }) {
  const patch = (id: string, p: Partial<DraftItem>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)));

  async function addFiles(files: File[]) {
    for (const file of files) {
      const id = crypto.randomUUID();
      const lower = file.name.toLowerCase();
      setItems((list) => [
        ...list,
        {
          id,
          name: file.name,
          type: lower.endsWith(".pdf") ? "pdf" : "image",
          pages: 1,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          source: { kind: "upload", id },
          settings: { ...DEFAULT_SETTINGS },
          state: { kind: "processing" },
        },
      ]);
      try {
        const info = await analyseFile(file);
        await saveFile(id, file);
        patch(id, {
          type: info.type,
          pages: info.pages,
          thumb: info.thumb,
          settings: { ...DEFAULT_SETTINGS, sides: info.pages > 1 ? "double" : "single" },
          state: { kind: "ready", pages: info.pages },
        });
      } catch (err) {
        patch(id, { state: { kind: "error", message: err instanceof FileProblem ? err.message : "This file couldn't be read." } });
      }
    }
  }

  function addSample(key: SampleDocKey) {
    const item = sampleItem(key, SAMPLE_DOCS[key].pages > 1 ? {} : { sides: "single" });
    setItems((list) => [...list, { ...item, state: { kind: "ready", pages: item.pages } }]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Dropzone onFiles={(f) => void addFiles(f)} compact={items.length > 0} />
      <div className="flex flex-col gap-2">
        <p className="text-small text-ink-muted">Or try a sample document:</p>
        <div className="flex flex-wrap gap-2">
          {(["resume", "report", "marksheet", "poster"] as SampleDocKey[]).map((key) => {
            const doc = SAMPLE_DOCS[key];
            const Icon = doc.type === "pdf" ? FileText : ImageIcon;
            return (
              <Button key={key} type="button" size="sm" variant="secondary" onClick={() => addSample(key)}>
                <Icon aria-hidden />
                {doc.name.replace(/_/g, " ").replace(/\.(pdf|png)$/, "")}
                <span className="text-ink-muted">· {doc.pages}p</span>
              </Button>
            );
          })}
        </div>
      </div>
      {items.length ? (
        <div className="divide-y divide-rule">
          {items.map((it) => (
            <FileRow
              key={it.id}
              name={it.name}
              type={it.type}
              sizeKb={it.sizeKb}
              state={it.state}
              onRemove={() => setItems((list) => list.filter((x) => x.id !== it.id))}
              thumbnail={it.state.kind === "ready" ? <DocThumb item={it} /> : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Step 2: settings ───────────────────────────────────────────────────────────────────── */

function SettingsStep({ items, setItems, live }: { items: DraftItem[]; setItems: React.Dispatch<React.SetStateAction<DraftItem[]>>; live: ShopState }) {
  const [activeId, setActiveId] = React.useState(items[0]?.id);
  const item = items.find((i) => i.id === activeId) ?? items[0];
  const s = item.settings;
  const set = (p: Partial<ItemSettings>) =>
    setItems((list) => list.map((it) => (it.id === item.id ? { ...it, settings: { ...it.settings, ...p } } : it)));
  const hasColour = live.printers.some((p) => p.colour);
  const sizes = (["A4", "A3", "Legal"] as PaperSize[]).filter((size) => live.printers.some((p) => p.sizes.includes(size)));
  const prices = live.prices.perSide[s.paper];

  return (
    <div className="flex flex-col gap-5">
      {items.length > 1 ? (
        <div role="tablist" aria-label="Files" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {items.map((f) => {
            const active = f.id === item.id;
            const Icon = f.type === "pdf" ? FileText : ImageIcon;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(f.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left",
                  active ? "border-brand bg-brand-tint" : "border-rule-strong bg-surface hover:bg-hover",
                )}
              >
                <Icon className={cn("size-4", active ? "text-brand-ink" : "text-ink-muted")} aria-hidden />
                <span className="max-w-40 truncate text-small font-medium text-ink">{f.name}</span>
                <span className="text-caption text-ink-muted">{f.pages}p</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-small text-ink-muted">
          {item.name} · {item.pages} {item.pages === 1 ? "page" : "pages"}
        </p>
      )}
      <SegmentedControl
        aria-label="Colour"
        size="lg"
        value={s.colour}
        onChange={(colour) => set({ colour })}
        options={[
          { value: "bw", label: "Black & white", icon: <Contrast />, description: `${formatPaise(prices.bw)} / side` },
          { value: "colour", label: "Colour", icon: <Droplet />, description: hasColour ? `${formatPaise(prices.colour)} / side` : "Not available", disabled: !hasColour },
        ]}
      />
      <SegmentedControl
        aria-label="Sides"
        size="lg"
        value={item.pages === 1 ? "single" : s.sides}
        onChange={(sides) => set({ sides })}
        options={[
          { value: "single", label: "Single-sided", description: `${item.pages * s.copies} sheets` },
          { value: "double", label: "Double-sided", description: item.pages > 1 ? `${Math.ceil(item.pages / 2) * s.copies} sheets` : "Needs 2+ pages", disabled: item.pages === 1 },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 @md/shell:grid-cols-2">
        <Field label="Copies">
          <NumberStepper value={s.copies} onChange={(copies) => set({ copies })} min={1} max={50} unit="copies" />
        </Field>
        <div className="flex flex-col gap-2">
          <span id="paper-label" className="text-small font-medium text-ink">
            Paper size
          </span>
          <SegmentedControl
            aria-labelledby="paper-label"
            value={s.paper}
            onChange={(paper) => set({ paper })}
            options={sizes.map((size) => ({ value: size, label: size }))}
          />
        </div>
      </div>
      {item.pages > 1 ? (
        <ToggleRow
          id={`staple-${item.id}`}
          label="Staple each copy"
          description={`+ ${formatPaise(live.prices.staplePerCopy)} per copy`}
          control={<Switch id={`staple-${item.id}`} checked={s.staple} onCheckedChange={(staple) => set({ staple })} />}
        />
      ) : null}
      {!canPrint(live, s) ? (
        <Callout tone="warning" title="This shop can't print that combination">
          No printer here does {s.colour === "colour" ? "colour" : "black & white"} on {s.paper}. Choose another paper size or
          black &amp; white.
        </Callout>
      ) : null}
      {items.length > 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setItems((list) => list.map((it) => ({ ...it, settings: { ...s, sides: it.pages > 1 ? s.sides : "single", staple: it.pages > 1 && s.staple } })))}
        >
          Use these settings for all files
        </Button>
      ) : null}
    </div>
  );
}

/* ── Steps 4–5: review and payment ───────────────────────────────────────────── */

function ReviewStep({ shop, items, total, lines, note, setNote }: { shop: DemoShop; items: DraftItem[]; total: number; lines: ReturnType<typeof quote>["lines"]; note: string; setNote: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <DataList
        items={[
          [
            "Shop",
            <span key="s">
              {shop.name}
              <span className="block text-small text-ink-muted">
                {shop.area} · open until {shop.closesAt}
              </span>
            </span>,
          ],
          ["Files", `${items.length} · ${items.reduce((n, i) => n + i.pages, 0)} pages`],
        ]}
      />
      <Field label="Instructions for the shop (optional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="e.g. Please use thick paper for the cover" />
      </Field>
      <div className="rounded-lg border border-rule bg-surface p-4">
        <PriceSummary lines={lines} totalPaise={total} testMode />
      </div>
      <p className="text-small text-ink-muted">
        If the shop declines the order, you&rsquo;re refunded straight away.
      </p>
    </div>
  );
}

function PayStep({ method, setMethod, failed, total }: { method: PaymentMethod; setMethod: (m: PaymentMethod) => void; failed: boolean; total: number }) {
  return (
    <div className="flex flex-col gap-5">
      {method === "cash" ? (
        <p className="text-small text-ink-muted">
          The shop prints your order first. Pay <span className="font-semibold tabular text-ink">{formatPaise(total)}</span> in cash
          when you collect it, then show your pickup code.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-small text-ink-muted">
          <Badge tone="info" size="sm">
            Test mode
          </Badge>
          No card or UPI details needed.
        </p>
      )}
      {failed && method !== "cash" ? (
        <Callout tone="danger" title="Payment failed">
          You haven&rsquo;t been charged. Try again, or choose another method.
        </Callout>
      ) : null}
      <ChoiceCardGroup value={method} onValueChange={(m) => setMethod(m as PaymentMethod)} aria-label="Payment method">
        <ChoiceCard value="upi" icon={<Smartphone />} title="UPI">
          Any UPI app
        </ChoiceCard>
        <ChoiceCard value="card" icon={<CreditCard />} title="Card">
          Debit or credit card
        </ChoiceCard>
        <ChoiceCard value="cash" icon={<Banknote />} title="Cash at pickup">
          Pay the shop when you collect
        </ChoiceCard>
      </ChoiceCardGroup>
    </div>
  );
}

/* ── The wizard ─────────────────────────────────────────────────────────────────────────── */

function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const shop = shopByCode(params.get("shop"));
  const [step, setStep] = React.useState(0);
  const [items, setItems] = React.useState<DraftItem[]>([]);
  const [note, setNote] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>("upi");
  const [paying, setPaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  return (
    <CustomerFrame hideNav>
      {(state) => {
        if (!shop) {
          return (
            <EmptyState icon={FileText} title="Choose a shop first" action={<Button asChild><Link href="/shops">Find a shop</Link></Button>}>
              Orders are sent to one shop. Pick where you&rsquo;d like to print.
            </EmptyState>
          );
        }
        const live = state.shops[shop.code];
        const ready = items.filter((i) => i.state.kind === "ready");
        const busy = items.some((i) => i.state.kind === "processing");
        const q = quote(ready, live.prices);
        const printable = ready.every((i) => canPrint(live, i.settings));
        const summary = ready.length ? `${ready.length} ${ready.length === 1 ? "file" : "files"} · ${q.sheets} sheets` : "No files yet";

        const next = {
          label: ["Continue to settings", "Continue", `Pay ${formatPaise(q.totalPaise)}`, method === "cash" ? "Place order" : `Pay ${formatPaise(q.totalPaise)}`][step],
          disabled:
            !live.open ||
            (step === 0 && (ready.length === 0 || busy)) ||
            (step === 1 && !printable),
          hint:
            !live.open
              ? "The shop has paused new orders."
              : step === 0 && busy
                ? "Reading your files…"
                : undefined,
        };

        const advance = () => {
          if (step < 3) {
            if (step === 0) setItems((list) => list.filter((i) => i.state.kind === "ready"));
            setStep(step + 1);
            window.scrollTo({ top: 0 });
            return;
          }
          setPaying(true);
          setFailed(false);
          window.setTimeout(() => {
            const order = actions.placeOrder({
              shopCode: shop.code,
              items: ready.map((i) => ({ id: i.id, name: i.name, type: i.type, pages: i.pages, sizeKb: i.sizeKb, source: i.source, thumb: i.thumb, settings: i.settings })),
              privacy: "download_permitted",
              note,
              method,
            });
            router.replace(`/orders/track?id=${order.id}&placed=1`);
          }, method === "cash" ? 600 : 1300);
        };

        const title = ["Add your files", "Print settings", "Review your order", method === "cash" ? `Pay ${formatPaise(q.totalPaise)} at pickup` : `Pay ${formatPaise(q.totalPaise)}`][step];
        const showSummary = step < 3 && ready.length > 0;

        return (
          <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col">
            <div className="flex flex-col gap-4 px-4 pt-3 @xl/shell:px-6">
              <div className="flex items-center gap-1">
                {step === 0 ? (
                  <Link
                    href={`/shops/${shop.code}`}
                    aria-label="Cancel order"
                    className="-ml-2.5 flex size-10 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-hover hover:text-ink [&_svg]:size-5"
                  >
                    <X aria-hidden />
                  </Link>
                ) : (
                  <IconButton label="Back" className="-ml-2.5" onClick={() => setStep(step - 1)} disabled={paying}>
                    <ArrowLeft aria-hidden />
                  </IconButton>
                )}
                <StepIndicator steps={STEPS} current={step} className="flex-1" />
              </div>
              <div>
                <h1 className="text-title font-semibold text-ink">{title}</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-small text-ink-muted">
                  {shop.name} · {shop.area}
                </p>
              </div>
            </div>

            <div className="grid flex-1 gap-8 px-4 pb-6 pt-5 @xl/shell:px-6 @3xl/shell:grid-cols-[1fr_20rem]">
              <div className="flex min-w-0 flex-col gap-5">
                {!live.open ? (
                  <Callout tone="warning" title={`${shop.name} isn't taking orders right now`}>
                    The owner paused new orders while you were here. Your files are still on this page.
                  </Callout>
                ) : null}
                {step === 0 ? <UploadStep items={items} setItems={setItems} /> : null}
                {step === 1 ? <SettingsStep items={ready} setItems={setItems} live={live} /> : null}
                {step === 2 ? <ReviewStep shop={shop} items={ready} total={q.totalPaise} lines={q.lines} note={note} setNote={setNote} /> : null}
                {step === 3 ? <PayStep method={method} setMethod={setMethod} failed={failed} total={q.totalPaise} /> : null}
                {step === 3 && method !== "cash" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    disabled={paying}
                    onClick={() => setFailed(true)}
                  >
                    Try a failed payment
                  </Button>
                ) : null}
              </div>

              {showSummary ? (
                <aside className="hidden flex-col gap-4 self-start rounded-lg border border-rule bg-surface p-5 @3xl/shell:flex">
                  <h2 className="text-title-sm font-semibold text-ink">Estimated price</h2>
                  <PriceSummary lines={q.lines} totalPaise={q.totalPaise} />
                  <Button size="lg" block disabled={next.disabled} onClick={advance}>
                    {next.label}
                  </Button>
                  {next.hint ? <p className="text-center text-caption text-ink-muted">{next.hint}</p> : null}
                </aside>
              ) : null}
            </div>

            <div className={cn("sticky bottom-0", showSummary && "@3xl/shell:hidden")}>
              {next.hint ? <p className="bg-surface/95 px-4 pt-2 text-center text-caption text-ink-muted">{next.hint}</p> : null}
              <CheckoutBar
                totalPaise={q.totalPaise}
                summary={step === 3 ? (method === "upi" ? "Paying by UPI" : method === "card" ? "Paying by card" : "Pay in cash at pickup") : summary}
                actionLabel={next.label}
                onAction={advance}
                disabled={next.disabled}
                loading={paying}
              />
            </div>
          </div>
        );
      }}
    </CustomerFrame>
  );
}

export function OrderWizard() {
  return (
    <React.Suspense fallback={<div className="min-h-full bg-paper" />}>
      <Wizard />
    </React.Suspense>
  );
}

export { describeSettings };
