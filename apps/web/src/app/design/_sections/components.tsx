"use client";

import {
  ArrowRight,
  Columns2,
  Contrast,
  Droplet,
  Inbox,
  Plus,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  Search,
  Trash,
  Upload,
} from "lucide-react";
import * as React from "react";
import { Badge, SimulatedTag, StatusBadge, StatusDot } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Callout, EmptyState, Kbd, ProgressBar, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Checkbox, Switch, ToggleRow } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { GallerySection, Specimen, Token } from "../_components/section";

const ORDER_STEPS = ["Shop", "Upload", "Settings", "Privacy", "Review", "Pay"];

export function Components() {
  const [colour, setColour] = React.useState<"bw" | "colour">("bw");
  const [sides, setSides] = React.useState<"single" | "double">("double");
  const [orientation, setOrientation] = React.useState<"portrait" | "landscape">("portrait");
  const [perSheet, setPerSheet] = React.useState<"1" | "2" | "4">("1");
  const [copies, setCopies] = React.useState(2);
  const [staple, setStaple] = React.useState(true);
  const [agree, setAgree] = React.useState(false);
  const [step, setStep] = React.useState(2);
  const [range, setRange] = React.useState("1-3, 7");
  const [loading, setLoading] = React.useState(false);

  const rangeError = /^[\d,\s-]*$/.test(range) ? undefined : "Use page numbers and ranges, like 1-3, 7";

  return (
    <GallerySection
      id="components"
      eyebrow="Components"
      title="Building blocks"
      intro={<p>Every control is keyboard-operable, labelled for screen readers and has hover, focus, disabled and error states. Try them.</p>}
    >
      <Specimen
        title="Buttons"
        notes={
          <>
            One <Token>primary</Token> per view. <Token>lg</Token> (48px) for the main mobile action. Loading keeps width
            stable and announces busy state.
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Continue</Button>
            <Button variant="secondary">Back</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Reject order</Button>
            <Button variant="danger-ghost">
              <Trash aria-hidden />
              Delete file now
            </Button>
            <Button variant="link">View price list</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              Pay ₹32
              <ArrowRight aria-hidden />
            </Button>
            <Button size="md">
              <Upload aria-hidden />
              Upload files
            </Button>
            <Button size="sm" variant="secondary">
              <Plus aria-hidden />
              Add printer
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
            >
              Accept order
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Search orders">
              <Search aria-hidden />
            </IconButton>
            <IconButton label="Print" variant="secondary">
              <Printer aria-hidden />
            </IconButton>
            <IconButton label="Remove file" size="sm">
              <Trash aria-hidden />
            </IconButton>
            <span className="ml-2 text-small text-ink-muted">Icon buttons always carry an accessible label.</span>
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Text inputs"
        notes="Label above, hint below, error replaces nothing — it's added and announced. 16px text on phones."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Shop name, code or PIN code" hint="Example: QX7K2P or 110024">
            <Input placeholder="Search shops" leading={<Search />} />
          </Field>
          <Field label="Email" required>
            <Input type="email" defaultValue="ashish.r@example.in" autoComplete="email" />
          </Field>
          <Field label="Pages to print" error={rangeError} hint={rangeError ? undefined : "Leave empty to print all pages"}>
            <Input value={range} onChange={(e) => setRange(e.target.value)} />
          </Field>
          <Field label="Black & white price" hint="Per side, A4">
            <Input defaultValue="2.00" inputMode="decimal" leading={<span className="text-body">₹</span>} trailing="/ side" />
          </Field>
          <Field label="Paper size">
            <Select defaultValue="A4">
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="A3">A3 (297 × 420 mm)</option>
              <option value="LEGAL">Legal (216 × 356 mm)</option>
              <option value="LETTER">Letter (216 × 279 mm)</option>
            </Select>
          </Field>
          <Field label="Disabled">
            <Input disabled defaultValue="Shop code can't be changed" />
          </Field>
          <Field label="Instructions for the shop" hint="Optional. Don't include personal details." className="md:col-span-2">
            <Textarea placeholder="e.g. Please use thick paper for the certificate" />
          </Field>
        </div>
      </Specimen>

      <Specimen
        title="Selection controls"
        notes={
          <>
            <Token>SegmentedControl</Token> for 2–4 exclusive options (arrow keys move), <Token>NumberStepper</Token> for
            copies, <Token>Switch</Token> for instant on/off, <Token>Checkbox</Token> for consent.
          </>
        }
      >
        <div className="grid gap-7 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span id="seg-colour" className="text-small font-medium text-ink">
              Colour
            </span>
            <SegmentedControl
              aria-labelledby="seg-colour"
              size="lg"
              value={colour}
              onChange={setColour}
              options={[
                { value: "bw", label: "Black & white", icon: <Contrast />, description: "₹2 / side" },
                { value: "colour", label: "Colour", icon: <Droplet />, description: "₹10 / side" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="seg-sides" className="text-small font-medium text-ink">
              Sides
            </span>
            <SegmentedControl
              aria-labelledby="seg-sides"
              size="lg"
              value={sides}
              onChange={setSides}
              options={[
                { value: "single", label: "Single-sided", description: "10 sheets" },
                { value: "double", label: "Double-sided", description: "5 sheets" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="seg-orient" className="text-small font-medium text-ink">
              Orientation
            </span>
            <SegmentedControl
              aria-labelledby="seg-orient"
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: "portrait", label: "Portrait", icon: <RectangleVertical /> },
                { value: "landscape", label: "Landscape", icon: <RectangleHorizontal /> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="seg-sheet" className="text-small font-medium text-ink">
              Pages per sheet
            </span>
            <SegmentedControl
              aria-labelledby="seg-sheet"
              value={perSheet}
              onChange={setPerSheet}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2", icon: <Columns2 /> },
                { value: "4", label: "4" },
              ]}
            />
          </div>
          <Field label="Copies">
            <NumberStepper value={copies} onChange={setCopies} min={1} max={50} unit="copies" />
          </Field>
          <div className="flex flex-col gap-4">
            <ToggleRow
              id="staple"
              label="Staple each copy"
              description="+ ₹2 per copy"
              control={<Switch id="staple" checked={staple} onCheckedChange={setStaple} />}
            />
            <label htmlFor="agree" className="flex cursor-pointer items-start gap-3">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <span className="text-small text-ink-2">I confirm these files are mine to print.</span>
            </label>
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Status & labels"
        notes={
          <>
            <Token>StatusBadge</Token> takes an audience (shops read “New”, customers read “Sent to shop”) and a
            required print <Token>mode</Token>: simulated orders never read as real printing or pickup. The{" "}
            <Token>SimulatedTag</Token> wording is fixed.
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {(["paid", "accepted", "printing", "ready", "completed", "cancelled"] as const).map((s) => (
              <StatusBadge key={s} status={s} mode="physical" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["paid", "accepted", "printing", "ready", "completed", "cancelled"] as const).map((s) => (
              <StatusBadge key={s} status={s} mode="physical" audience="customer" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["printing", "ready", "completed"] as const).map((s) => (
              <StatusBadge key={s} status={s} mode="simulated" />
            ))}
            {(["printing", "ready", "completed"] as const).map((s) => (
              <StatusBadge key={`c-${s}`} status={s} mode="simulated" audience="customer" />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Protected printing</Badge>
            <Badge tone="neutral">A4</Badge>
            <Badge tone="outline">Spiral binding</Badge>
            <Badge tone="success">Paid</Badge>
            <Badge tone="warning">Payment pending</Badge>
            <Badge tone="danger">Refund failed</Badge>
            <Badge tone="info">Test mode</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SimulatedTag />
            <SimulatedTag compact />
            <StatusDot tone="ready">Printer ready</StatusDot>
            <StatusDot tone="printing">Printing 3 of 10</StatusDot>
            <StatusDot tone="neutral">Offline</StatusDot>
          </div>
        </div>
      </Specimen>

      <Specimen title="Feedback" notes="Callouts sit in the flow; toasts confirm actions; skeletons mirror real layout.">
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Callout tone="info" title="Prices are set by the shop">
              The total updates as you change settings.
            </Callout>
            <Callout tone="success" title="Payment confirmed">
              Sharma Xerox has your order.
            </Callout>
            <Callout tone="warning" title="Printer is offline">
              Your order will start when it reconnects.
            </Callout>
            <Callout tone="danger" title="We couldn't read this PDF">
              It may be password-protected. Remove the password and upload again.
            </Callout>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast.success("Order accepted", { description: "PF-2611-0418 moved to Accepted." })}>
              Success toast
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast.error("Couldn't reach the printer", { description: "Check that the Quire print app is running." })}>
              Error toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast("File removed", { action: { label: "Undo", onClick: () => toast.success("Restored") } })}
            >
              Toast with undo
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <ProgressBar value={64} label="Upload progress" />
              <ProgressBar label="Processing" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="size-11 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
            <div className="rounded-md border border-dashed border-rule-strong">
              <EmptyState icon={Inbox} title="No orders yet today" action={<Button variant="secondary" size="sm">Print counter QR poster</Button>}>
                New paid orders appear here instantly.
              </EmptyState>
            </div>
          </div>
        </div>
      </Specimen>

      <Specimen
        title="Overlays"
        notes="Dialogs become bottom sheets on phones. Focus is trapped and restored; Esc closes. Tooltips are hints, never essential."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Reject order…</Button>
            </DialogTrigger>
            <DialogContent
              title="Reject this order?"
              description="Ashish will get a full refund, and the files will be deleted within 5 minutes."
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="secondary">Keep order</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger" onClick={() => toast("Order rejected · refund started")}>
                      Reject & refund
                    </Button>
                  </DialogClose>
                </>
              }
            >
              <Field label="Reason shown to the customer">
                <Select defaultValue="paper">
                  <option value="paper">Out of the requested paper size</option>
                  <option value="busy">Too busy right now</option>
                  <option value="closing">Closing soon</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </DialogContent>
          </Dialog>
          <Tooltip content="Protected — print only, no download">
            <Button variant="ghost">Hover or focus me</Button>
          </Tooltip>
          <span className="flex items-center gap-1.5 text-small text-ink-muted">
            Shortcut hints: <Kbd>A</Kbd> accept · <Kbd>P</Kbd> print
          </span>
        </div>
      </Specimen>

      <Specimen title="Navigation" notes="Step indicator collapses to a compact header on phones. Tabs underline the active view.">
        <div className="flex flex-col gap-8">
          <div>
            <StepIndicator steps={ORDER_STEPS} current={step} />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Previous
              </Button>
              <Button size="sm" onClick={() => setStep((s) => Math.min(ORDER_STEPS.length - 1, s + 1))}>
                Next
              </Button>
            </div>
          </div>
          <Tabs defaultValue="new">
            <TabsList>
              <TabsTrigger value="new" count={2}>
                New
              </TabsTrigger>
              <TabsTrigger value="accepted" count={1}>
                Accepted
              </TabsTrigger>
              <TabsTrigger value="printing" count={1}>
                Printing
              </TabsTrigger>
              <TabsTrigger value="ready" count={1}>
                Ready
              </TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="pt-4 text-small text-ink-muted">
              2 paid orders waiting for you to accept.
            </TabsContent>
            <TabsContent value="accepted" className="pt-4 text-small text-ink-muted">
              1 order accepted and waiting to print.
            </TabsContent>
            <TabsContent value="printing" className="pt-4 text-small text-ink-muted">
              1 order printing now.
            </TabsContent>
            <TabsContent value="ready" className="pt-4 text-small text-ink-muted">
              1 order waiting for pickup.
            </TabsContent>
          </Tabs>
        </div>
      </Specimen>
    </GallerySection>
  );
}
