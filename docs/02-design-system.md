# Quire design system — reference

The live, interactive version is at **http://localhost:3000/design**. This page records the decisions
and rules behind it, so the product stays consistent as screens are added.

## Direction: "paper & ink"

White and cool blue-white surfaces, navy-charcoal type and one blue brand colour (`#1d4ed8`). The logo is a printer printing a sheet. Colour is reserved for
**actions, selection and order status**, so it always carries meaning. The product should feel calm
and trustworthy for customers, and fast and dense for shop operators.

## Tokens

All tokens are CSS variables in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css), with a
light theme and a dark theme. Tailwind's default palette, radii, shadows and font sizes are **cleared**,
so only system values can be used.

| Group | Tokens (Tailwind utility names) |
|---|---|
| Surfaces | `paper` (page; pure white in light mode), `surface` (panels, inputs), `sunken` (wells), `hover`, `rule`, `rule-strong` |
| Text | `ink`, `ink-2`, `ink-muted`, `ink-faint` (placeholders and decoration only; not AA for text) |
| Brand | `brand` (fills), `brand-hover`, `brand-press`, `brand-ink` (text/links), `brand-tint(-strong)`, `on-brand`, `focus` |
| Feedback | `danger(-hover/-ink/-tint)`, `warning-ink/-tint`, `success-ink/-tint`, `info-ink/-tint` |
| Order status | `st-{new,accepted,printing,ready,done,cancelled}` + `-ink` + `-tint` |
| Type | `text-caption` 12, `small` 13, `body` 15, `input` 16, `body-lg` 17, `title-sm` 17, `title` 22, `headline` 30, `display` 40, `display-lg` 56 |
| Radius | `rounded-sm` 6 (small controls, badges) · `rounded-md` 10 (buttons, inputs) · `rounded-lg` 14 (containers) · `rounded-xl` 18 (feature tiles) · `rounded-2xl` 24 (hero cards) |
| Shadow | `shadow-overlay`, for dialogs, toasts and popovers **only** |
| Icons | Lucide for small UI glyphs. Two-tone illustrated icons for key choices (`illustrated-icons.tsx`) and the shop workspace (`shop-icons.tsx`: currentColor lines, `--ic-fill` / `--ic-accent` fills, one hover movement each, still under reduced motion) |
| Fonts | `font-sans` and `font-display` Plus Jakarta Sans (self-hosted; headlines 800 at −0.025em; body text with slightly wider word spacing) · `font-mono` Geist Mono (order numbers, shop codes, pickup codes) |

## Rules

1. **One primary button per view.** Mobile primary actions use `size="lg"` (48px).
2. **Status = colour + icon + words**, always from [`lib/status.ts`](../apps/web/src/lib/status.ts). Never hand-pick a status colour.
3. **Customers and shops see different words for the same state** ("Sent to shop" vs "New"). Use `StatusBadge audience=…`. Status wording always goes through `statusCopy(status, mode)`: from printing onwards a simulated order has its own words and icon, and `StatusBadge`, `OrderTimeline`, `JobTicket` and `AccessReceipt` all **require** the order's print mode.
4. **Rows before cards.** Lists that are scanned or compared (shops, orders, files) are rows separated by hairlines. Use `Panel` only when content needs a boundary.
5. **Money is integer paise** end to end. Format with `formatPaise`. The browser never computes a price it charges.
6. **Responsive by container, not viewport, for layout shells.** `CustomerShell` (`@container/shell`), `ShopShell` (`@container/shop`), `StepIndicator` and `ShopRow` (`@container/row`) use container queries, so they adapt to the space they get: a phone, a split pane or a preview frame. Page content inside a shell should prefer `@…/shell:` and `@…/shop:` variants.
7. **Print mode is explicit.** Components never default the print mode. In a product connected to real printers, `mode="simulated"` makes statuses read "Simulation finished", shows a demo pickup code, and `SimulatedTag` ("SIMULATED — no paper printed") marks simulated jobs. The portfolio prototype uses the standard wording throughout; it is presented to reviewers as a prototype, so the screens themselves don't repeat it. The payment step shows a "Test mode" badge.
8. **Privacy copy is specific and never absolute.** Distinguish the *original file* from *temporary print-spool data*. Banned phrases: "100% secure", "impossible to copy", "never stored on the shop's computer", "leaves no trace". The current wording is in `PrivacyChoice` and is versioned (`PRIVACY_NOTICE_VERSION`).
9. **Accessibility baseline:** visible focus ring everywhere (`--focus`), labelled icon buttons, 40px+ touch targets (48px for primary mobile actions), keyboard-operable custom controls (radio-group arrow keys), errors announced with `role="alert"`, and `prefers-reduced-motion` respected.
10. **Lucide icons only**, 1.75px stroke (set globally by `LucideProvider`).

## Inventory

**UI components** (`apps/web/src/components/ui`): `Button`, `IconButton`, `Field`, `Input`, `Textarea`,
`Select`, `SegmentedControl`, `NumberStepper`, `Switch`, `Checkbox`, `ToggleRow`, `ChoiceCard(Group)`,
`Badge`, `StatusBadge`, `StatusDot`, `SimulatedTag`, `Dialog` (bottom sheet on phones), toasts,
`Callout`, `ProgressBar`, `Skeleton`, `EmptyState`, `Kbd`, `Tabs`, `Tooltip`, `StepIndicator`, `Panel`,
`DataList`, `SectionHeading`, `Logo`.

**Patterns** (`apps/web/src/components/patterns`): `ShopRow`, `Dropzone` + `FileRow`, `PrivacyChoice`,
`PriceSummary` + `CheckoutBar`, `JobTicket` (with QR), `OrderTimeline`, `AccessReceipt`, `QueueRow`,
`PrinterRow`.

**Shells** (`apps/web/src/components/shell`): `CustomerShell` (top bar, bottom tabs on phones) and
`ShopShell` (sidebar → icon rail → top bar).

## Breakpoints

| Name | Width | Used for |
|---|---|---|
| `xs` | 416px | Large phones |
| `sm` | 640px | Dialog becomes centred instead of a bottom sheet |
| `md` / `lg` / `xl` | 768 / 1024 / 1280px | Page-level layout (gallery, landing) |
| `@3xl/shell` | 768px container | Customer top nav replaces bottom tabs |
| `@3xl/shop`, `@5xl/shop` | 768 / 1024px container | Shop icon rail, then full sidebar |
| `@2xl` (step indicator) | 672px container | Full labelled steps instead of the compact bar |
