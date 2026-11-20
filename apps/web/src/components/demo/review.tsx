"use client";

import { Pencil, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { shopByCode } from "@/lib/demo/shops";
import { actions } from "@/lib/demo/store";
import type { Order, Review } from "@/lib/demo/types";

export const REVIEW_TAGS = ["Quick", "Good print quality", "Friendly staff", "Fair price", "Easy pickup"] as const;

const MOOD = ["", "Not good", "Could be better", "Okay", "Good", "Loved it"];

/** Read-only stars, e.g. ★★★★☆. */
export function Stars({ value, className, size = "sm" }: { value: number; className?: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(size === "sm" ? "size-3.5" : "size-[18px]", n <= value ? "fill-[#f5a524] text-[#f5a524]" : "fill-transparent text-rule-strong")}
        />
      ))}
    </span>
  );
}

/** Five tappable stars (a radio group). Hovering previews; each choice pops. */
export function StarInput({
  value,
  onChange,
  size = "md",
  label = "Rating",
}: {
  value: number;
  onChange: (stars: number) => void;
  size?: "md" | "lg";
  label?: string;
}) {
  const [hover, setHover] = React.useState(0);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown;
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const next = Math.min(5, Math.max(1, (value || 0) + d));
              onChange(next);
              refs.current[next - 1]?.focus();
            }}
            className={cn(
              "flex items-center justify-center rounded-md transition-transform duration-200 hover:scale-110 active:scale-95",
              size === "lg" ? "size-11" : "size-9",
            )}
          >
            <Star
              key={value === n ? `pop-${value}` : "still"}
              aria-hidden
              className={cn(
                "transition-colors duration-150",
                size === "lg" ? "size-8" : "size-6",
                on ? "fill-[#f5a524] text-[#f5a524]" : "fill-transparent text-rule-strong",
                value === n && "star-pop",
              )}
              strokeWidth={1.6}
            />
          </button>
        );
      })}
      <span className="ml-2 min-w-24 text-small font-medium text-ink-2" aria-live="polite">
        {MOOD[shown]}
      </span>
    </div>
  );
}

export function ReviewDialog({
  order,
  open,
  onOpenChange,
  initialStars,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStars: number;
}) {
  const shop = shopByCode(order.shopCode)!;
  const [stars, setStars] = React.useState(initialStars || order.review?.stars || 0);
  const [tags, setTags] = React.useState<string[]>(order.review?.tags ?? []);
  const [text, setText] = React.useState(order.review?.text ?? "");
  const textId = React.useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={order.review ? "Edit your review" : `How was ${shop.shortName}?`}
        description={`${order.number} · ${order.items.length} ${order.items.length === 1 ? "file" : "files"}. Your review is shown to the shop and to other customers.`}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!stars}
              onClick={() => {
                actions.reviewOrder(order.id, { stars, tags, text });
                toast.success(order.review ? "Review updated" : `Thanks! Your review is on ${shop.shortName}'s page`);
                onOpenChange(false);
              }}
            >
              {order.review ? "Save review" : "Post review"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-2 sm:px-6">
          <StarInput value={stars} onChange={setStars} size="lg" label={`Rate ${shop.name}`} />
          <fieldset>
            <legend className="mb-2 text-small font-medium text-ink">What went well?</legend>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags((list) => (on ? list.filter((x) => x !== t) : [...list, t]))}
                    className={cn(
                      "h-8 rounded-full border px-3 text-small font-medium transition-all duration-200 active:scale-95",
                      on ? "border-brand bg-brand text-on-brand shadow-[0_6px_14px_-8px_rgb(29_78_216/0.8)]" : "border-rule-strong bg-surface text-ink-2 hover:border-brand/40 hover:bg-hover",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Field label="Anything else? (optional)" id={textId} hint={`${text.length}/280`}>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="e.g. The colours on my poster came out great"
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rating strip for a collected order: five stars to tap (opens the review form with that rating),
 * or the posted review with an Edit button.
 */
export function ReviewPrompt({ order, className, variant = "strip" }: { order: Order; className?: string; variant?: "strip" | "card" }) {
  const shop = shopByCode(order.shopCode)!;
  const [open, setOpen] = React.useState(false);
  const [initial, setInitial] = React.useState(0);
  if (order.status !== "completed" || !order.mine) return null;
  const review = order.review;
  const dialog = open ? <ReviewDialog key={initial} order={order} open={open} onOpenChange={setOpen} initialStars={initial} /> : null;

  if (review) {
    return (
      <div className={cn("flex items-start gap-3 px-4 py-3", variant === "card" && "rounded-lg border border-rule bg-surface p-4", className)}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Stars value={review.stars} />
            <span className="text-small font-medium text-ink">Your review</span>
            {review.tags.map((t) => (
              <span key={t} className="rounded-full bg-sunken px-2 py-0.5 text-caption text-ink-2">
                {t}
              </span>
            ))}
          </div>
          {review.text ? <p className="mt-1 text-small text-ink-2">&ldquo;{review.text}&rdquo;</p> : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setInitial(review.stars);
            setOpen(true);
          }}
        >
          <Pencil aria-hidden />
          Edit
        </Button>
        {dialog}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[linear-gradient(90deg,var(--brand-tint),transparent)] px-4 py-2.5",
        variant === "card" && "rounded-lg border border-brand/20 p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-small font-semibold text-ink">How was {shop.shortName}?</p>
        <p className="text-caption text-ink-muted">Tap a star to rate this order</p>
      </div>
      <StarInput
        value={0}
        label={`Rate ${shop.name}`}
        onChange={(n) => {
          setInitial(n);
          setOpen(true);
        }}
      />
      {dialog}
    </div>
  );
}

/** A review as the shop (or another customer) sees it. */
export function ReviewQuote({ review, name, className }: { review: Review; name: string; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <figcaption className="flex items-center gap-2 text-small font-medium text-ink">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-caption font-semibold text-brand-ink">
            {name.slice(0, 1)}
          </span>
          {name}
        </figcaption>
        <Stars value={review.stars} />
      </div>
      {review.text ? <blockquote className="text-small leading-relaxed text-ink-2">&ldquo;{review.text}&rdquo;</blockquote> : null}
      {review.tags.length ? (
        <div className="flex flex-wrap gap-1">
          {review.tags.map((t) => (
            <span key={t} className="rounded-full bg-sunken px-2 py-0.5 text-caption text-ink-2">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}

/** Average and count of reviews, for a shop. */
export function reviewStats(orders: Order[]) {
  const reviews = orders.filter((o) => o.review).map((o) => o.review!);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.stars, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: reviews.filter((r) => r.stars === s).length }));
  return { count: reviews.length, avg, dist };
}
