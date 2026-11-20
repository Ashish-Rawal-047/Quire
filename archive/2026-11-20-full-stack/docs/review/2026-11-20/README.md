# Visual review pack — 2026-11-20 (M0 foundation)

> **Superseded in part.** Every finding below has been fixed. Implementation status, tests and new
> screenshots are in [the review fixes](../2026-11-20-fixes/README.md). This page is kept as the
> original record.

Captured from the running app with headless Edge. The design system was **not modified** for this
review. Screens that don't exist yet as product pages (the order flow, responsive shop layouts) were
assembled on a separate review-only page, **`/preview`**. It uses only existing components and sample
data, and nothing on it calls the API.

## Images

| # | File | What it shows |
|---|---|---|
| 1 | `01-design-system-desktop-light.png`, `…-dark.png` | Full design system page, 1440px wide |
| 1 | `01-design-system-phone-light.png` | Full design system page at 390px |
| 2 | `02-customer-home-mobile-light.png`, `…-dark.png` | Customer home in a phone frame |
| 3 | `03-order-flow-1-shop.png` … `03-order-flow-8-tracking.png` | Shop → upload → settings → privacy (default, and download chosen but not confirmed) → review & price → mock payment → confirmation → tracking. Dark variants for privacy, review and confirmation |
| 4 | `04-shop-desktop-1440.png`, `…-dark.png` | Shop orders workspace at 1440 × 900 |
| 5 | `05-ticket-ready.png`, `05-receipt-collected.png` (+ dark) | Pickup ticket, and the full access receipt after collection |
| 6 | `06-responsive-*.png` | Shop at 834 (icon rail) and 390 (queue only); customer order flow at 1280 and 768; dialog as phone bottom sheet vs centred; shop pickup-code step |

## Confirmations requested

**Status:** M0 built the design system and an API skeleton only. Deletion, encryption, print jobs and
pickup verification are **designed** (docs/01) but **not implemented**. Nothing below can be
confirmed as working yet. Each item lists what exists, what is designed, and the gaps found in this review.

### 1. Privacy wording vs implementation

There is no implementation to match yet. The wording matches the *design* (docs/01 §4.3–4.5), and
correctly separates the original file from temporary print-spool data. Review found these
inaccuracies in the **current copy**. They are not fixed yet, because the design system is frozen for your review:

| Where | Current | Problem | Proposed |
|---|---|---|---|
| `lib/status.ts` · Completed hint | "Collected. Your file has been deleted." | Deletion happens up to 1 hour *after* pickup | "Collected. Your files will be deleted within an hour." |
| `PrivacyChoice` | "…deleted after you collect your prints." | If prints aren't collected, files are deleted 24 h after Ready, i.e. *before* collection | "…deleted within an hour of pickup, or 24 hours after your prints are ready if you don't collect them." |
| `lib/status.ts` · Cancelled hint | "Any payment is refunded." | Refunds take days | "Any payment will be refunded to your original payment method." |
| `lib/status.ts` · Printing hint | "Your pages are being printed." | False when printing is simulated (see §3) | Simulation-aware wording, below |
| `/preview` upload step | "checked and encrypted as they upload" | They're checked and encrypted after arrival, before storage | "checked and encrypted when they arrive" |

### 2. Deletion: key destruction and temporary storage cleanup

**Not implemented.** The design (docs/01 §5.1, §5.3) is: delete the stored ciphertext and destroy
the file's encryption key, with timed purges for every order state and a 72-hour cap.
Review found **two flaws in that design** that must be fixed before building it:

- **Database backups defeat key destruction.** Each file's key is stored wrapped by a single
  master key in Postgres. Postgres backups and point-in-time recovery keep old rows, so deleting
  the row doesn't destroy the key in backups. Docs/01 currently overstates this ("any lingering copy
  becomes undecryptable"). **Proposed fix:** wrap file keys with a **daily key**, and destroy each
  daily key once the 72-hour cap has passed (e.g. on day 4). Anything older than that, including
  backups, then becomes unreadable. Also turn off bucket versioning and exclude the documents
  bucket from storage backups.
- **Uploads can land on disk in plaintext.** The web framework (Starlette) buffers uploaded files
  larger than 1 MB to a temporary file on disk before our code sees them. **Proposed fix:**
  read uploads as a stream and encrypt each chunk in memory, so plaintext is never written to disk.
  Any temporary files (Phase 2 document conversion) go in a per-job RAM-backed folder, deleted
  after each job and swept on startup. Add a test that watches the temp folder during an upload.

Outside platform control (already disclosed in docs/01 §4.3): Windows print-spool files, printer
internal storage, and paper prints left at the shop.

### 3. Simulated printing can't pass for real printing

**Partly covered in the UI. The server side isn't built.** What exists: the `SimulatedTag`
component with fixed wording, shown on simulated printers, in the shop's print panel and on
access-receipt entries. **Gaps found:**

- The customer timeline says "Printing — Your pages are being printed." while the receipt on the
  same screen says SIMULATED (`03-order-flow-8-tracking.png`). The pickup ticket and
  "Ready for pickup" also give no sign that no paper exists.
- `AccessEntry.simulated` is optional, so a missing flag silently renders as a real print.

**Proposed rules (M6):**
- Every print job stores whether it was simulated or real (required, set by the server from the
  agent's registered mode, never sent by the browser). In Phase 1 the server rejects any
  non-simulated agent.
- Status text, the timeline, the ticket and notifications for simulated orders come from the
  server and include "SIMULATED — no paper printed".
- The `simulated` prop becomes required in components.

### 4. Pickup code verified before Collected

**Not implemented.** Designed: a hashed pickup code on the order, and the ready → completed step
only through `POST /orders/{id}/complete {pickup_code}` (or the QR's token), checked by the server.
The UI for it is in `06-responsive-shop-pickup-check.png`. **Gaps found:**

- 4 digits means only 10,000 combinations, so the server needs an attempt limit (proposed: 5 wrong codes lock
  the order, with a staff override that requires a reason and is logged).
- The access receipt has no "Collected — pickup code verified" entry type.

## Other visual findings (not fixed; design system frozen)

1. **`ShopRow` responds to the window, not its container.** The shop code and chevron stay visible
   in phone frames, which squeezes the text (`03-order-flow-1-shop.png`). On a real phone they're
   hidden. Fix: container query, as already done for the shells.
2. **The tablet icon rail hides the Open/Closed switch** (`06-responsive-shop-tablet-834.png`). That
   breaks the shell's own rule that opening status is always one click away. Fix: a status dot plus
   toggle in the rail.
3. The sample shop queue's detail shows 3 files with identical settings. Cosmetic only (sample data).
