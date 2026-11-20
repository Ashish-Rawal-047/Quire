# M1 plan: authentication, shops, pricing and discovery

Status: **approved 2026-11-20 with defaults D1–D5.** Slices 1–2 implemented; see the
[slice 1–2 review](review/2026-11-20-m1-slices-1-2/README.md). Slices 3–7 not started.

Changes from this plan made during slices 1–2 (all reflected in the review):

- Shop profile is `GET` / `PATCH /shops/{shop_id}` (not `/profile`).
- Leaving a shop is `DELETE /me/memberships/{shop_id}`.
- `X-Forwarded-For` is trusted from no one by default (the plan assumed the Next proxy could be
  trusted; it can't).
- The setup checklist is computed in the web app for now; the server-side checklist and
  `/publish` arrive with slice 3.

## 0. Scope

**In M1**

- Email one-time-code sign-in, sessions, CSRF protection, rate limits.
- Roles: customer, shop owner, shop staff.
- Shop registration and management: profile, address, location, hours, contact, staff.
- Printing setup (Phase 1: a simulated agent and its printers, configured by the owner).
- Capabilities derived from actual printers and prices, not self-declared.
- Pricing: versioned price lists, a server pricing engine, quotes with expiry and version checks.
- Discovery: search and filters, public shop pages, a clearly labelled demo seed.
- Authorized HTTP routes for the operations that already exist as services:
  - create a draft order;
  - upload a document;
  - delete a document;
  - read the access receipt;
  - pickup verify and owner unlock.
- An authorization test suite: route inventory, role matrix, two-tenant isolation matrix, and
  pricing-manipulation tests.

**Not in M1:**

- checkout and payments (M3/M4);
- previews (M2);
- the real agent pairing protocol and heartbeats (M6);
- the live queue and SSE (M5);
- phone OTP and Postgres row-level security (Phase 2);
- maps.

## 1. Delivery in slices

Each slice ships with its migration, tests and a short status note. I stop for your review after
slice 2 (the security core), then continue.

| # | Slice | Delivers |
|---|---|---|
| 1 | **Auth** | `users`, `otp_challenges`, `sessions`; OTP email through Mailpit; sign-in/out; `/me`; CSRF; rate limits; the route-inventory test; sign-in screens |
| 2 | **Shops and roles** | `shops`, `shop_members`, `shop_invitations`, `shop_hours`; owner registration; profile, hours and contact; staff invitations; authorization dependencies; foreign keys from existing tables to `shops`/`users`; the two-tenant isolation matrix begins |
| 3 | **Printing setup** | `printers`; owner sets up a simulated agent and printers; the capability and Protected Printing rules (§5); the setup checklist; publish and unpublish |
| 4 | **Pricing** | `price_lists`, `price_rules`, `finishing_options`, `quotes`; owner price editor; pricing engine; non-binding estimates; quote expiry and version checks; manipulation tests |
| 5 | **Discovery** | Public search (POST) and shop pages; filters; distance; open-now; demo seed with demo labels; customer discovery screens on real API data |
| 6 | **Existing operations over HTTP** | Draft order, upload (raw stream), delete document, receipt, pickup verify and unlock, all behind authorization; the full isolation matrix |
| 7 | **Review pack** | Screenshots (desktop/tablet/mobile), status document (implemented / tested / visually checked / not verified) |

## 2. Authentication

### Sign-in flow

1. `POST /auth/otp/request {email}`. The response is **identical whether or not an account
   exists**, and nothing reveals whether an address is registered.
2. A 6-digit code is emailed (Mailpit in development). The server stores only
   `HMAC-SHA256(otp key, challenge_id ‖ code)`.
3. `POST /auth/otp/verify {challenge_id, code}`. On success:
   - the challenge is consumed atomically (row lock, `consumed_at IS NULL` check);
   - a user is created on first sign-in;
   - a new session is issued, never a reused one.

### Limits

| Rule | Value |
|---|---|
| Code length / lifetime | 6 digits / 10 minutes |
| Use | Once. A new request supersedes every earlier unused code for that email |
| Wrong guesses per code | 5, then the code is dead |
| Resend cooldown | 60 s per email |
| Code requests | 5 per email per hour; 20 per client per hour |
| Failed verifications | 10 per email per hour → verification locked for 30 minutes |

Comparisons are constant-time. Clients are identified by a keyed hash of the IP address; raw IPs
are never stored. Codes are never logged; a test checks the captured logs.

### Sessions

- **Token:** 32 random bytes in the cookie. Only its SHA-256 is stored.
- **Cookie:** `__Host-quire_session`, with `HttpOnly; Secure; SameSite=Lax; Path=/`.
- **Lifetime:** 7-day idle timeout and 30-day absolute limit.
- **`last_seen_at`:** written at most every 5 minutes.
- **Sign-out:** sign out (this session) and sign out everywhere (all sessions).
- **CSRF on every non-GET request:**
  - a double-submit token: cookie `__Host-quire_csrf` echoed in the `X-CSRF-Token` header;
  - an `Origin` check against `QUIRE_WEB_ORIGIN`.

### Roles

Being a **customer** is implicit: any signed-in user can order and sees only their own orders.

**Shop owner** and **shop staff** are per-shop memberships (`shop_members.role`). One person can
own one shop, work at another, and still order as a customer. Every request is authorized against
the specific resource. **[D1]**

| Can… | Owner | Staff | Customer |
|---|---|---|---|
| Edit shop profile, hours, contact, location | ✓ | — | — |
| Edit prices and finishing | ✓ | view only | — |
| Printing setup (agent, printers) | ✓ | view only | — |
| Invite and remove staff | ✓ | — | — |
| Pause or resume new orders (Open/Closed) | ✓ | ✓ | — |
| Verify pickup codes | ✓ | ✓ | — |
| Unlock a locked pickup (with reason) | ✓ | — | — |
| Publish or unpublish the shop | ✓ | — | — |
| Own orders, documents, receipts | — | — | ✓ (own only) |

**Staff invitations:** the owner adds an email address. When that person signs in with a
one-time code (which proves they own the address), they see the invitation and accept it. There is
no invitation link to steal or forward. Invitations expire after 7 days.

## 3. Authorization model

The rule: **who the caller is and what they may touch always comes from the server.** Shop
membership and order ownership are looked up for the session's user on every request. IDs in a
request only say *which* resource is meant, never *whose* it is.

| Layer | Mechanism |
|---|---|
| 1. Route policy | Every route declares exactly one policy dependency: `public`, `user`, `shop_staff` or `shop_owner`. A test walks every route in the app and fails if one has none, or if a `public` route is missing from an explicit allowlist |
| 2. Scope resolution | `shop_staff` / `shop_owner` read `shop_id` from the path, then load the caller's membership from the database. The result is a `ShopContext(shop_id, user_id, role)`. Shop services accept a `ShopContext`, not a bare `shop_id`, so unscoped calls are hard to write |
| 3. Scoped queries | Resources are loaded with the scope in the `WHERE` clause (`orders.shop_id = ctx.shop_id`, `orders.customer_id = user.id`), never fetched first and checked after |
| 4. Request bodies | Pydantic models use `extra="forbid"`. A body containing `shop_id`, `customer_id`, `owner_id`, `role`, `price`, `total` or similar fields is rejected with 422, not silently ignored |
| 5. Responses | Shops never see customer emails. Customers are shown to shops as first name + masked contact. Shop responses never include another shop's data |
| 6. Phase 2 | Postgres row-level security as defence in depth (already on the roadmap) |

### Status codes

| Situation | Response |
|---|---|
| No or expired session | 401 |
| Missing or invalid CSRF token, or wrong Origin, on a mutation | 403 |
| Signed in, but not a member of the shop in the path | 404 (doesn't confirm the shop's private data exists) |
| Member, but role too low (staff on an owner action) | 403 |
| An order, document or receipt that isn't yours, or belongs to another shop | 404 |
| Body contains a field the client may not set | 422 |

### Isolation tests

Fixtures:

- shops A and B, each with an owner and a staff member;
- customers 1 and 2, each with orders at both shops;
- one signed-out client.

For every protected route, each principal that shouldn't have access gets the expected 401, 403 or
404, and the response body is checked to contain no identifier belonging to the other tenant.
Covered resources: orders, documents, receipts, printers, agents, pickup, pricing, members and
invitations. Previews are covered when they exist (M2), through the same route-inventory rule.

## 4. Database changes

**New tables:**

| Table | Key columns and constraints |
|---|---|
| `users` | id, email (normalised lower-case, unique), display_name, created_at, last_sign_in_at, disabled_at. Phone comes later |
| `otp_challenges` | id, email, code_mac, expires_at, attempts, consumed_at, superseded_at, client_hash, created_at. Index (email, created_at) |
| `sessions` | id, token_hash (unique), user_id → users, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at |
| `shops` | id, code (6-char Crockford base32, unique), name, description, contact_phone, contact_email, address_line1/2, locality, city, state, pincode, latitude, longitude (nullable until set), timezone (default Asia/Kolkata), status (`draft` / `listed` / `suspended`), accepting_orders (bool), is_demo (bool), current_price_list_id, created_at, updated_at |
| `shop_members` | shop_id → shops, user_id → users, role (`owner` / `staff`), created_at, revoked_at. Unique (shop_id, user_id). A shop always keeps ≥ 1 active owner (service rule + test) |
| `shop_invitations` | id, shop_id, email, role (`staff`), invited_by → users, expires_at, accepted_at, revoked_at |
| `shop_hours` | shop_id, weekday 0–6, opens_at, closes_at (closes > opens; no overnight spans in M1). Several intervals per day allowed |
| `printers` | id, shop_id, agent_id → print_agents (composite FK to the agent's shop), name, colour, duplex, paper_sizes[], allowed (owner approval), created_at, removed_at |
| `price_lists` | id, shop_id, version (unique per shop), created_by, created_at. **Immutable**: editing prices creates a new version, so old quotes stay explainable |
| `price_rules` | price_list_id, paper_size, colour_mode, single_side_paise, double_side_sheet_paise. Checks: positive, ≤ ₹1,000 |
| `finishing_options` | price_list_id, kind (`staple` / `spiral` / `soft_bind` / `lamination`), price_paise, per (`copy` / `order`) |
| `quotes` | id, shop_id, customer_id, order_id (nullable), price_list_id, items_digest, lines (jsonb), total_paise, binding (bool), created_at, expires_at, consumed_at |

**Changes to existing tables:**

- `orders.shop_id` → FK `shops`; `orders.customer_id` → FK `users`.
- `print_agents.shop_id` → FK `shops`.
- Existing `actor_id` columns stay as text and hold user IDs.

The dev database has no orders to migrate, and the test database is rebuilt from migrations on
every run.

## 5. Shop setup, capabilities and Protected Printing

A shop moves through: **registered (draft)** → **printing set up** → **listed**.

| Check | Required to publish |
|---|---|
| Name, address, pincode, contact phone | ✓ |
| Location (latitude/longitude) | ✓ |
| At least one opening-hours interval | ✓ |
| A price list with at least one priced combination | ✓ |
| An active print agent with at least one approved printer | ✓ |

- **Registered vs. set up.** Owners see this checklist. Customers never see draft shops.
  Discovery shows only *listed* shops, and a listed shop can always take orders when open
  and accepting. **[D2]**
- **Protected Printing** is shown only when the shop has an active (non-revoked) print agent
  **and** at least one approved printer. M6 adds a third condition: an agent heartbeat in the
  last 2 minutes. In Phase 1 every agent is simulated, so the badge reads **"Protected Printing ·
  simulated"**, together with the existing "SIMULATED — no paper printed" wording wherever printing
  is shown.
- **Capabilities are derived, never self-declared.** Colour is offered only if an approved printer
  is colour-capable **and** a colour price exists. Double-sided printing and paper sizes follow the
  same rule (printer support ∩ prices). Finishing options are services the shop offers, shown as
  "offered by the shop".

## 6. Pricing

- **The engine** is a pure function. Inputs: a price list and items (pages, copies, colour, sides,
  paper size, page range, finishing). Output: line items in integer paise. Pages per sheet and
  page ranges come in M2, with the settings screen.
- **Table-driven tests** cover the cases (the roadmap's 40-case table is completed in M2, when
  n-up and page ranges exist).
- **Clients never send prices.** Every pricing endpoint accepts settings only. Price fields are
  rejected (422).
- **Optimistic concurrency.** `PUT /pricing` takes `expected_version`. A stale editor gets 409
  rather than silently overwriting a colleague's change.
- **Quote expiry and price changes before payment:**
  - a quote is valid for **15 minutes** and records the price-list version and a digest of the
    exact settings and server page counts;
  - at checkout (M3) the server re-prices;
  - if the quote has expired, or the price list or settings changed, and **the total differs**,
    checkout returns **409 `price_changed`** with old and new totals, and the customer must
    confirm the new price;
  - if the total is unchanged, the new quote is used, and the customer is told prices were updated.
- **[D3] What "authoritative quote" means in M1.** A binding quote needs page counts the server has
  verified itself, which come from the M2 upload validation. Recommended:
  - **M1:** the engine, versioned price lists, the quote store with expiry and version checks
    (service-level, tested), and a public **estimate** endpoint labelled non-binding
    (`binding: false`), where the customer types page counts;
  - **M2:** the binding order quote, priced from server page counts.

  The alternative is to pull PDF/image page counting (in memory, bounded by the 50 MB cap) into M1.

## 7. Discovery

- **Search** is `POST /public/shops/search`, with the query in the body. A GET query string would
  put the customer's location in access logs.
- **Location:**
  - the customer can share their browser location (opt-in), which is rounded to 2 decimals
    (about 1 km) before sending;
  - it is used for that query only, never stored or logged;
  - the customer can also type a pincode or area, which matches shop pincode and locality text;
  - no external geocoding service is called. **[D4]**
- **Distance** is shown only when the customer's location is known. It is computed with haversine
  in SQL, with a bounding-box pre-filter. PostGIS isn't needed at this scale.
- **Filters:** text (name, code, locality, using `pg_trgm`), distance radius, open now, accepting
  orders, Protected Printing, colour, double-sided, paper size, maximum B&W A4 price per side.
- **Sort:** distance, price or name.
- **Availability** comes from the shop's own data only:
  - "Open now · until 9:30 pm" from its hours, in the shop's time zone;
  - "Not taking orders right now" when the owner has paused;
  - nothing about printer status until M6 heartbeats.
- **Estimated completion time [D5].** Recommended: **not shown** until it can be measured, as the
  median of the shop's last ≥ 10 completed orders in 30 days (available from M5). Shops can't type
  their own figure. The alternative is to show an owner-stated time, attributed: "usually ~15 min,
  stated by the shop".
- **Demo data:**
  - the seed script (`scripts/seed_demo.py`, run by hand, never automatically) creates shops with
    `is_demo = true`;
  - they carry a visible **"Demo shop"** badge in search and on their page;
  - the review-only `/design` and `/preview` pages keep their sample data and their "static
    previews" notice;
  - a test fails if any product route imports `lib/sample-data`.

## 8. API contracts (`/api/v1`)

Conventions:

- JSON in snake_case; money in integer paise; times ISO 8601 UTC.
- Errors as RFC 7807 `{type, title, detail, code}`, plus `retry_after` on 429.
- Every mutation needs the CSRF header.

**Public** (allowlisted)

| Method & path | Body → response |
|---|---|
| `GET /health` | (exists) |
| `POST /auth/otp/request` | `{email}` → 202 `{challenge_id, expires_in, resend_after}` · 429 `{retry_after}` |
| `POST /auth/otp/verify` | `{challenge_id, code}` → 200 `{user, memberships, invitations}` + cookies · 400 `{code: "wrong_code", attempts_left}` · 410 `expired`/`used` · 429 `locked` |
| `POST /public/shops/search` | `{q?, near?: {lat, lng}, radius_km?, open_now?, protected?, colour?, duplex?, paper_size?, max_bw_a4_paise?, sort?, cursor?}` → `{items: [ShopCard], next_cursor}` |
| `GET /public/shops/{code}` | → `ShopPage` (profile, hours, open status, capabilities, current prices and version, finishing, protected status, `is_demo`) |
| `POST /public/shops/{code}/estimate` | `{items: [{pages, copies, colour, sides, paper_size, finishing[]}]}` → `{binding: false, price_list_version, lines, total_paise}` |

`ShopCard`: `{code, name, locality, pincode, distance_km|null, open_now, open_until|opens_at, accepting_orders, protected_printing: {available, simulated}, capabilities: {colour, duplex, paper_sizes}, from_prices: {bw_a4_side_paise, colour_a4_side_paise|null}, turnaround_minutes|null, is_demo}`

**Signed-in user**

| Method & path | Purpose |
|---|---|
| `GET /me` · `PATCH /me {display_name}` | Profile, memberships, pending invitations |
| `POST /auth/logout` · `POST /auth/logout-all` | Revoke this session or all sessions |
| `POST /me/invitations/{id}/accept` · `/decline` | Join a shop as staff (invitation must match the signed-in email) |
| `POST /shops {name, …}` | Register a shop; the caller becomes its owner; status `draft` |
| `POST /orders {shop_code, privacy_mode}` | Draft order at a listed, accepting shop. Print mode is set by the server from the shop's agent |
| `PUT /orders/{id}/documents` | Raw-body upload (headers `Content-Type`, `X-Filename`), own draft only. Never multipart |
| `DELETE /orders/{id}/documents/{doc_id}` | Purge now (own orders only) |
| `GET /orders/{id}` · `GET /orders/{id}/receipt` | Own order and its access receipt |

**Shop** (`/shops/{shop_id}/…`; membership checked on every call)

| Method & path | Role |
|---|---|
| `GET /setup` (checklist) · `GET /profile` | staff |
| `PATCH /profile` · `PUT /hours` · `PUT /location` | owner |
| `PUT /accepting {accepting}` | staff |
| `POST /publish` · `POST /unpublish` | owner (publish requires the checklist) |
| `GET /members` · `POST /invitations {email}` · `DELETE /invitations/{id}` · `DELETE /members/{user_id}` | owner |
| `GET /printing` (agents + printers) | staff |
| `POST /agents {name}` (simulated only in Phase 1) · `DELETE /agents/{id}` · `POST /printers` · `PATCH /printers/{id}` · `DELETE /printers/{id}` | owner |
| `GET /pricing` | staff |
| `PUT /pricing {expected_version, rules, finishing}` | owner |
| `POST /orders/{order_id}/pickup {code}` → `{outcome, attempts_left?, locked_until?}` (429 when rate-limited) | staff |
| `POST /orders/{order_id}/pickup/unlock {reason}` | owner |

## 9. Frontend (design system unchanged; new screens built from it)

- **Sign-in:** an email step, then a code step with resend countdown, attempts-left message and
  lockout message.
- **Shop owner:** a registration wizard (profile → location → hours → pricing → printing setup →
  publish checklist), then settings pages for the same, plus staff.
- **Customer:** discovery (search, filters, opt-in location, results) and the public shop page.
- **Data:** product routes read live data through the existing `/api` proxy. Sample data stays in
  `/design` and `/preview` only. Every new screen is checked at desktop, tablet and mobile widths.

## 10. Tests added in M1 (all existing 88 + 4 must keep passing)

- **Auth:**
  - code expiry, single use, superseding;
  - attempts per code, resend cooldown, per-email and per-client limits, verification lock;
  - identical responses for known and unknown emails;
  - cookie flags, token hashed at rest;
  - idle and absolute expiry, sign-out and sign-out-everywhere;
  - CSRF and Origin enforcement;
  - codes absent from logs.
- **Authorization:**
  - the route inventory;
  - the role matrix;
  - the two-tenant isolation matrix (§3);
  - forbidden body fields rejected;
  - last-owner protection;
  - invitation email must match.
- **Shops:**
  - checklist and publish rules;
  - Protected Printing requires an active agent + approved printer;
  - capabilities equal printer support ∩ prices;
  - draft and suspended shops never appear publicly.
- **Pricing:**
  - engine table;
  - price-list versioning;
  - `expected_version` conflict;
  - quote expiry;
  - re-price on version change (same total vs. `price_changed`);
  - estimate is non-binding;
  - client price fields rejected.
- **Discovery:**
  - each filter;
  - distance ordering;
  - open-now in shop time zone (including near midnight);
  - demo badge;
  - location not logged;
  - product routes don't import sample data.
- **Existing operations:** upload, delete, receipt and pickup succeed only for the right principal;
  every other principal gets 401, 404 or 403.

## 11. Decisions needed

| # | Decision | Recommended default |
|---|---|---|
| D1 | One account can be both a customer and a shop member | **Yes.** Roles are per shop; every request is scoped to the resource |
| D2 | Shops without completed printing setup in discovery | **Hidden** until published (setup complete); owners see the checklist |
| D3 | Binding order quotes in M1 or M2 | **M2** (needs server-verified page counts). M1 ships the engine, versioned prices, the quote store with expiry/version checks, and a labelled non-binding estimate |
| D4 | Location source | **Opt-in browser location (rounded, not stored) + pincode/area text match.** No external geocoder; no bundled pincode dataset in M1 |
| D5 | Estimated completion time | **Hidden** until measured from ≥ 10 completed orders (M5+); no owner-typed figure |
