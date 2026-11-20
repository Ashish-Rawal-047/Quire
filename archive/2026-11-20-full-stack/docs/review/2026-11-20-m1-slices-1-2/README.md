# M1 slices 1–2: sign-in, shops and roles (implementation and security review)

Scope: [docs/04-m1-plan.md](../../04-m1-plan.md) slices 1 (sign-in) and 2 (shops and roles),
with decisions D1–D5 as approved. **Slice 3 (printing setup and publishing) has not been started.**

Status words used below:

- **Tested:** an automated test passes.
- **Checked in browser:** the end-to-end script below confirmed it against the running stack.
- **Visually checked:** confirmed in the screenshots.
- **Not verified:** not covered; the reason is given.

## 1. Checks run

| Check | Result |
|---|---|
| Backend tests (real Postgres, S3 and Mailpit) | **192 passed**, 3 consecutive runs. 104 new: sign-in codes 22, sessions/CSRF 16, route policies 4, shops 31, tenant isolation 30, mail delivery 1 |
| Earlier tests (encryption, deletion, key expiry, simulated printing, pickup) | All 88 still pass, unchanged except fixtures that now create real users and shops |
| Migrations | Two new revisions. `alembic check`: no drift. The test database is built from migrations on every run |
| Ruff lint + format · `tsc` · ESLint · `npm test` (4) · `next build` | All clean |
| End-to-end browser script: headless Edge → Next.js proxy → API → Postgres → Mailpit | **22 of 22 checks passed**, 0 console errors. Sign-in codes are read from the real test inbox |

## 2. What was built

**Backend**

- **Sign-in code routes:** `/auth/otp/request` and `/auth/otp/verify`.
- **Session routes:** `/auth/logout` and `/auth/logout-all`.
- **Account:** `/me` (read and update).
- **Joining and leaving shops:** accept or decline an invitation, leave a shop.
- **Shop routes:**
  - register;
  - read and edit the profile;
  - location and hours;
  - the Open/Closed switch;
  - members;
  - invitations and their cancellation;
  - removing a member.
- **Request guard** on every route (Origin check, CSRF check, `no-store`).
- **Problem-style errors** that never echo submitted values.
- **New tables:** `users`, `otp_challenges`, `auth_events`, `sessions`, `shops`, `shop_members`,
  `shop_invitations`, `shop_hours`.
- **Foreign keys** from `orders`, `print_agents` and `pickup_attempts` to `shops`/`users`.

**Web**

- `/sign-in` (email step → code step).
- `/profile` (account, invitations, your shops with roles, sign out / sign out everywhere).
- `/shop/new` (registration).
- `/shop/[shopId]/settings`:
  - setup checklist;
  - details, location, hours;
  - staff management (owner);
  - read-only view and "Leave" (staff).

  It uses the real `ShopShell`. Two backward-compatible props were added: a controlled
  Open/Closed switch, and nav links that show as disabled for pages that don't exist yet.

## 3. Security review: sign-in (slice 1)

| Area | How it works | Status |
|---|---|---|
| **Enumeration resistance** | Requesting a code does the same work for every well-formed address: same response, same email, no account lookup. Accounts are created only after the first correct code. Rate limits are keyed by address and client, never by account. Unknown, used, superseded and expired codes all give the same `code_expired` answer | **Tested**: known vs unknown address give identical status, body shape, headers and email text |
| **Code handling** | 6 digits from `secrets`. Only `HMAC(server key, challenge ‖ code)` is stored. Constant-time comparison. 10-minute lifetime. Single use, consumed under a row lock. A new code supersedes older ones. 5 wrong guesses kill a code | **Tested**: expiry, single use, superseding, 5-guess limit, malformed input, only hashes in the table |
| **Rate limiting** | 60 s resend cooldown. 5 codes per address per hour. 20 per client per hour. 10 wrong codes per address per hour lock verification for 30 minutes, during which even the right code is refused. 429 responses include `Retry-After` | **Tested**: each limit at its boundary |
| **Client identity** | A keyed hash of the IP; raw IPs are never stored. `X-Forwarded-For` is trusted from **no one** by default (see finding F1) | **Tested and checked in browser**: forged headers through the real proxy are ignored |
| **Cookies** | `__Host-quire_session`: HttpOnly, Secure, SameSite=Lax, Path=/, no Domain. The CSRF cookie is the same but readable by the page | **Tested** (API) and **checked in browser** (flags as Edge stored them through the Next.js proxy) |
| **CSRF** | Every non-GET request must carry `Origin` equal to the web app's origin. Signed-in requests also need `X-CSRF-Token`, an HMAC of the session token, so a token from another session never matches | **Tested**: missing Origin, foreign Origin, missing/guessed token, another session's token. **Checked in browser**: a mutation without the header gets 403 |
| **Session storage** | 32-byte random token. Only its SHA-256 is stored. 7-day idle timeout (sliding, written at most every 5 min), 30-day absolute limit. At most 20 active sessions per account | **Tested** |
| **Session invalidation** | Sign out, sign out everywhere, disabling an account, idle and absolute expiry. Signing in always issues a new session and revokes any session the browser already had (fixation) | **Tested**. **Checked in browser**: a signed-out cookie can't be replayed |
| **Logs and errors** | Codes, addresses and tokens are never logged. Mail failures log the exception type only. Validation errors return field locations and messages, never the submitted values. API responses are `Cache-Control: no-store` | **Tested** (captured logs searched for the code and the address) |
| **Abuse** | The mail is sent after the response, so response time doesn't depend on the mail server. Invitations are limited to 20 a day per shop, with at most 3 shops per account | **Tested** |

## 4. Security review: shops and roles (slice 2)

| Area | How it works | Status |
|---|---|---|
| **Route policy** | Every route declares exactly one policy (`public` / `user` / `shop_staff` / `shop_owner`). A test walks every route, cross-checked against the OpenAPI operation list, and fails on a missing policy, a public route outside a 3-route allowlist, or a `{shop_id}` route without a shop policy (see F2) | **Tested** |
| **Shop scope** | `shop_staff`/`shop_owner` load the caller's **active membership** for the shop in the path on every request. Non-members get a 404 identical to a non-existent shop. Staff on owner routes get 403. Invitations and members are always looked up within the caller's shop, so another shop's IDs are 404s | **Tested**: 9 routes × 7 kinds of caller, plus explicit cross-shop ID tests |
| **Leak checks** | Every denial is checked to contain none of shop A's ID, code, name or staff emails, and to equal the response for a random shop ID | **Tested** |
| **Server-owned fields** | Request bodies reject unknown fields (422): `status`, `is_demo`, `accepting_orders`, `code`, `created_by`, `owner_id`, `id`, `shop_id`, `role`, an invitation `role`, a `shop_id` in hours | **Tested** |
| **Roles across shops (D1)** | One account is a customer by default and holds a separate role per shop. Test account `multi` is staff at A and B and owner of C. It can manage C, can't manage A or B, can pause orders at A, and leaving A leaves B and C untouched | **Tested** |
| **Membership changes** | Removing someone takes effect on their very next request, without re-login. A shop always keeps at least one owner (row-locked). Staff can leave themselves | **Tested** and **checked in browser** |
| **Invitations** | Staff only. Accepted only by the signed-in owner of the invited address; any other account gets 404. They expire after 7 days, can be cancelled or declined, and are single use. The owner's response doesn't reveal whether the invitee has an account | **Tested** |
| **Customer data** | Shops see nothing about customers yet: there are no order routes. Owners see the emails and names of their own staff only | **Tested** (member list contains exactly that shop's people) |
| **Data quality** | Names have invisible control and format characters removed (e.g. right-to-left overrides). Pincode, phone, email, India-only coordinates and non-overlapping hours are validated by the API and by database constraints | **Tested** |

## 5. Findings during this review (all fixed)

| # | Finding | Fix |
|---|---|---|
| **F1** | **Rate-limit identity could be forged.** Uvicorn trusted `X-Forwarded-For` from 127.0.0.1, and the Next.js proxy passes a client's own header straight through. Any browser could pick a new identity per request. Access logs also showed the forged addresses | Trust nothing by default (`QUIRE_TRUSTED_PROXIES=[]`) and run uvicorn with `--no-proxy-headers`. Re-tested through the real proxy: 21 requests with 21 forged addresses → one identity, the 21st refused. A configured proxy is honoured only for the address it adds (tested) |
| **F2** | **The route-policy test could pass while checking nothing.** This FastAPI version wraps included routers, so the first version of the test found zero routes | The test now follows wrapped routers **and** asserts it found exactly the operations in the OpenAPI schema |
| F3 | Names shown to other people could contain invisible control characters | Stripped on input (tested) |
| F4 | The resend countdown read the clock while rendering, which Next.js flagged during prerendering | The clock is now read only in timers and event handlers |
| F5 | The shell's switch said "Customers can order now" on an unlisted draft shop | Pages can set that line. Draft shops show "Not listed yet" |

## 6. Remaining risks and limits

- **Shared rate-limit bucket in development.** With forwarded headers distrusted, every browser
  behind the Next.js dev proxy shares one per-client limit (20 codes/hour). In production a
  reverse proxy that *overwrites* `X-Forwarded-For` must be configured as the only trusted proxy,
  and the API port must not be publicly reachable.
- **Email is the only factor.** Whoever controls the mailbox controls the account. There are no
  sign-in notification emails yet.
- **No Content-Security-Policy header yet.** An XSS bug could read the CSRF cookie (not the
  HttpOnly session cookie) and act as the user. CSP belongs in the M7 hardening pass; the dev
  server needs `eval`.
- **Rate-limit counting is not locked.** Two simultaneous requests can each pass a limit at its
  edge, so a limit can be exceeded by one or two.
- **Timing equality** for known and unknown addresses holds by construction (the same code runs),
  not by statistical measurement.
- **Secure cookies on `http://localhost`** rely on browsers treating localhost as a secure
  context. Checked in Edge only.
- **Draft shops can be switched "Open".** Harmless today (draft shops are invisible), but the
  tablet rail label "Open" doesn't say "not listed". To be resolved with publishing in slice 3.

## 7. Not verified, or not built yet

- **No account deletion or data export.**
- **Disabling an account has no API.** It works and is tested at database level only.
- **Shop suspension has no admin tool.** It is enforced (members get 403) but can only be set in
  the database.
- **The existing upload, deletion, receipt and pickup operations are still not exposed over
  HTTP.** They arrive behind these authorization checks in slice 6.
- **Missing pages:**
  - the customer navigation links to `/home`, `/shops` and `/orders`, which don't exist yet (404);
  - shop navigation items other than Settings are shown disabled;
  - the phone shop layout's menu (and its Open/Closed control) isn't built.
- **Opening hours editor:** shows one period per day. The API accepts up to three and the page
  warns when it would drop extras.
- **Untested environments:** browsers other than Edge, screen readers, and real mail providers.

## 8. Screenshots (17, from the end-to-end run)

| Files | What it shows |
|---|---|
| `01-sign-in-desktop-1-email` · `01-sign-in-desktop-2-code` · `01-sign-in-tablet` · `01-sign-in-mobile` | Sign-in at three widths, both steps |
| `05-sign-in-wrong-code-mobile` | Wrong code: "4 tries left" |
| `02-profile-empty-desktop` · `02-profile-owner-mobile` | Profile before and after registering a shop |
| `06-profile-invitation-mobile` · `07-profile-member-mobile` | Staff invitation, then membership with role |
| `03-register-desktop` · `03-register-mobile` | Shop registration |
| `04-shop-settings-owner-desktop` · `10-shop-settings-owner-tablet` · `11-shop-settings-owner-mobile` | Owner settings at three widths: checklist (prices and printer marked as later steps), details, location, hours, staff |
| `08-shop-settings-staff-mobile` | Staff: read-only details and "Leave this shop" |
| `09-shop-not-found-tablet` | Another account opening the shop's URL |
| `12-remove-staff-dialog-desktop` | Removing a staff member |

The toast visible over the location section in the full-page desktop shot is a fixed-position
notification captured by the screenshot, not a layout fault.
