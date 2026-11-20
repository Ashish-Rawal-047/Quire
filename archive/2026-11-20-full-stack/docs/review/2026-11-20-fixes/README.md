# Review fixes: 2026-11-20

Follow-up to the [visual review pack](../2026-11-20/README.md). It covers every fix approved in that
review. **Authentication, shop registration, pricing and discovery have not been started.**

Status used below:

- **Implemented and tested:** built, with an automated test that passes.
- **Implemented, checked visually:** built in the UI and confirmed in the screenshots or by a
  browser check. The UI is still on sample data.
- **Not verified / not built:** said plainly, with the reason.

## Checks run

| Check | Result |
|---|---|
| Backend tests (`pytest`, against real Postgres 17 and SeaweedFS S3) | **88 passed**, 8 consecutive runs. One flaky assertion (a 1-byte input can appear in random ciphertext) was found and fixed |
| Migration: upgrade, downgrade, re-upgrade, and `alembic check` for drift from the models | Pass, no drift |
| Ruff lint + format | Clean |
| Web type check (`tsc --noEmit`) | Clean |
| Web lint (`eslint`) | Clean |
| Web tests (`npm test`: status wording rules, matched against the server's wording) | **4 passed** |
| Production build (`next build`) | Pass: `/`, `/design`, `/preview` static |
| Browser checks (headless Edge, `/preview` and `/design`) | **17 of 17 passed**, 0 console errors |
| `GET /api/v1/health` on the running dev API | `ok`. New `key_store` check |

## 1. Encryption and deletion

| Requirement | Status |
|---|---|
| Uploads use bounded streaming encryption; plaintext never touches temp disk | **Implemented and tested.** Raw body stream, 64 KiB AES-256-GCM chunks, 5 MiB multipart parts. Peak memory was 12.5 MiB for a 32 MiB upload (the test limit is 16 MiB). No temp file and no spool rollover during a 3 MB upload through the real ASGI path. A control test proves the detector catches multipart spooling. A guard test fails if any route uses multipart file parsing |
| Key expiry follows the real expiry of every file under the key | **Implemented and tested.** Epoch `retain_until` = the latest hard expiry under it, updated when payment extends a file. Regression test: a file uploaded at 11:55 and paid the next day keeps its key past "window start + 72 h", and the key is destroyed exactly at the file's expiry. Keys are also destroyed early once the window has closed and all files are purged (tested) |
| Keys kept out of ordinary database backups | **Implemented and tested.** Envelope encryption: root key seals epoch keys in a separate key store; epoch keys wrap per-document keys. A test takes a "backup" copy of a wrapped key, shows it still unwraps before the epoch key is destroyed (the honest residual window), and fails to unwrap after. Excluding the key-store folder from backups is a deployment step. It is documented, and the folder carries a notice, but code cannot verify it |
| Deletion covers originals, encrypted objects, temp files, previews, thumbnails, keys | **Implemented and tested.** One test stores the original, a preview, a thumbnail, a print-ready render and a scratch file, then purges: storage prefix empty, folder gone, wrapped key and encrypted filename erased. The schedule (unpaid 24 h, collected 1 h, uncollected 24 h, cancelled 5 min, 72 h cap) is tested at the boundary minute. Orphan objects, folders and keys are swept |
| Document what can and cannot be deleted from backups and logs | **Done:** [docs/03-retention-and-deletion.md](../../03-retention-and-deletion.md) §4–6. docs/01 §5.1 was corrected (it overstated what purge alone achieves) |

## 2. Simulated printing

| Requirement | Status |
|---|---|
| Real/simulated mode stored server-side on orders and print jobs | **Implemented and tested.** The order takes its mode from the shop's print agent. The job takes its mode from the agent that runs it. Composite foreign keys make the database reject a job whose mode differs from its order's or its agent's, even if the service is bypassed. Phase 1 refuses to register a physical agent |
| Every customer-facing screen, notification, timeline, ticket and receipt says it's simulated | **Implemented and tested** for the server wording (status text, ticket, notifications: 31 tests) and the web wording (`statusCopy`, 4 tests, which also check web labels match the server's). `StatusBadge`, `OrderTimeline`, `JobTicket` and `AccessReceipt` now **require** the print mode, so it can't be forgotten. **Checked visually** in the screenshots. Notifications are not sent yet (no email sending exists); their text is built and tested |
| A simulated order never implies paper is ready to collect | **Implemented and tested.** From printing onwards a simulated order reads "Simulated printing", "Simulation finished · There is nothing to collect", "Demo completed · No prints were handed over". A test scans every status, ticket and notification for phrases such as "ready for pickup", "being printed" and "collected". The review step now says, before payment, that the shop's printer is simulated |
| A simulated pickup code isn't presented as a real credential | **Implemented and tested.** The server returns `code_valid_for_collection: false` and the label "Demo code". The ticket shows "DEMO CODE", a "DEMO" stamp over a faded QR, and "Not valid for collecting anything — no prints exist" (`07-ticket-simulated-mobile.png`; real ticket for comparison: `07-ticket-physical-phase2-mobile.png`) |

## 3. Pickup verification

| Requirement | Status |
|---|---|
| Server-side code verification | **Implemented and tested** as a service. The 4-digit code is derived with a server key (HMAC-SHA256) and never stored. It is compared in constant time. Another shop's order returns "not found" |
| Attempt limits, rate limiting, temporary lockout | **Implemented and tested.** 5 wrong codes → 15-minute lock, during which even the right code is refused. The 3rd lock blocks the order until the shop owner unlocks it with a written reason (owner role required, reason ≥ 10 characters, logged). Per staff member: 10 checks a minute. Per shop: 20 wrong codes in 10 minutes across all orders |
| Successful verification recorded on the access receipt | **Implemented and tested.** A `pickup_verified` entry records the print mode ("Pickup code verified at the counter", or the demo wording for simulated orders). Locks and owner unlocks are recorded too |
| No collection status change without verification | **Implemented and tested.** The state machine has no route to `completed` except verification, and a database constraint rejects a `completed` order without a verified pickup, even through a direct SQL update |

## 4. Responsive fixes

| Requirement | Status |
|---|---|
| Mobile shop list | **Implemented, checked visually and by browser check.** `ShopRow` uses a container query. The shop code and chevron are hidden at 390 px and shown at 768 and 1280 px (`12-shop-list-*.png`) |
| Open/Closed reachable on tablet | **Implemented, checked visually and by browser check.** The icon rail now has the switch with an "Open"/"Closed" label. Click and keyboard (Space) toggling were both checked. The desktop still shows exactly one switch (`10-shop-workspace-tablet.png`) |

## Not verified, or not built yet

- **No HTTP routes for any of the above.** Upload, pickup and deletion are services called by tests.
  Their routes need sign-in and shop membership checks (M1+). The upload route will read
  `request.stream()`; the guard test enforces that.
- **The UI is on sample data.** The screens show the designed states. Nothing yet confirms that a
  live API response renders correctly, because no API endpoints exist.
- **Deployment settings can't be checked by code:** the key store excluded from backups, bucket
  versioning off, bucket excluded from backups. They are documented in docs/03 §6.
- **Malware scanning is not built.** Uploads are marked `not_scanned`. The health check says so.
- **Memory wiping is best-effort** (a Python limitation). Secure deletion of key-store files on
  SSDs is not guaranteed; the files are sealed under the root key (docs/03 §5).
- **The QR pickup token is not built.** Only the 4-digit code path exists.
- **The phone shop layout** still has no Open/Closed control. It sits behind the menu, which isn't
  built yet. The review only asked for the tablet fix.
- **Retention of pickup attempts (90 days) and the access receipt (1 year)** is planned but not automated.

## Screenshots (35)

| Files | What it shows |
|---|---|
| `01-shop-list-mobile` · `12-shop-list-{desktop,tablet,mobile}` | ShopRow fix at three widths |
| `02-upload-mobile` · `03-privacy-mobile` | Corrected wording ("encrypted when they arrive"; deletion timing) |
| `04-review-simulated-disclosure-mobile` | Simulated printing disclosed before payment |
| `05-confirmation-ticket-mobile` · `07-ticket-simulated-mobile` (+dark) · `14-ticket-{desktop,tablet,mobile}` | Simulated ticket: banner, demo code, stamped QR |
| `07-ticket-physical-phase2-mobile` | The real pickup ticket, for comparison (Phase 2) |
| `06-tracking-mobile` · `13-tracking-{desktop,tablet,mobile}` | Simulated timeline and receipt: no "being printed" |
| `08-receipt-mobile` (+dark) · `15-receipt-{desktop,tablet,mobile}` | Receipt with demo pickup check, deletion and key destruction |
| `10-shop-workspace-{desktop,tablet,mobile}` (+tablet dark) | Rail Open/Closed switch; queue badges "Printing · simulated", "Ready · simulated" |
| `11-pickup-wrong-code-desktop` · `11-pickup-locked-tablet` (+dark) · `11-pickup-demo-verified-mobile` | Pickup check responses: attempts left, lockout, demo check passed |
| `20-design-system-{desktop-light,desktop-dark,tablet-light,mobile-light}` | Full design system with the simulated status rows, badges and both tickets |

## What changed in the design system (targeted, no redesign)

- `lib/status.ts`: corrected wording (completed, cancelled, printing), the `PrintMode` type,
  simulated overrides, and `statusCopy()`.
- `StatusBadge`, `OrderTimeline`, `JobTicket`, `AccessReceipt`: the print mode is required. The
  ticket has a simulated variant. The receipt has new entries (key destroyed, pickup verified,
  locked and unlocked) and no longer takes an optional per-entry `simulated` flag.
- `PrivacyChoice`: corrected deletion timing.
- `ShopRow`: container query. `ShopShell`: rail Open/Closed switch.
- Colours, type, spacing, radii and component shapes are unchanged.
