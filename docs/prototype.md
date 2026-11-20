# Quire prototype

## What it is

A front-end-only, interactive prototype of Quire for portfolio and case-study demos. Everything runs
in the browser:

- **App state** (orders, shop open/closed, prices, printer availability, the demo identities) is one
  JSON document in `localStorage`. Every tab of the browser shares it and updates live.
- **Uploaded files** stay in the browser's IndexedDB. pdf.js reads page counts and renders previews
  locally. Files are deleted when an order is completed, cancelled or rejected, or when the demo is reset.
- **Sample shops, orders and documents** are fictional: six shops around Lajpat Nagar, New Delhi,
  with 19 seed orders at every stage (one of Ananya's is ready to collect). Sample PDFs and images are in `apps/web/public/samples`.

## Simulated, and labelled as such

| Area | In the prototype |
|---|---|
| Sign-in | Customer and shop-owner sign-in pages with credentials filled in (customer: Ashish Rawal). Any password of 4+ characters works; the shop page lists every shop account |
| Shop QR codes | Each shop's QR encodes a link to its page (`/shops/CODE`). The scanner reads it with the camera (jsQR, on the device) or from an uploaded photo. Shops download a printable counter poster from Settings |
| Payment | A simulated UPI/card step with a "failed payment" path, or **cash at pickup**: the order goes to the shop unpaid, and the shop ticks "cash received" before it can hand over. No details asked, no money moves |
| Printing | Printers are sample data. "Start printing" runs a timed progress bar. Nothing is printed |
| Pickup | The shop scans the customer's pickup QR (it encodes `quire:pickup:<order id>`; camera or photo) or types the 4-digit code. Both are checked against the order in the browser |
| Printers | Shops can add printers in Settings (name, model, colour, sides, paper sizes) and remove the ones they added. Added printers can take orders straight away |
| Shop previews | Watermarked with the order number. The shop can also download the file; every preview and download is listed on the access receipt |
| Turnaround times, ratings | Sample figures. Reviews customers post on collected orders are stored with the order and shown to the shop (dashboard, order detail) and on the shop's page |

The screens don't repeat that they're a prototype: reviewers know. The payment step shows a small
"Test mode" badge. The earlier Protected Printing option was removed from the prototype, so nothing on
screen claims file protection.

Screenshots of the whole flow, at phone, tablet and desktop widths: [prototype-screens/](prototype-screens/).

## Two-minute demo script

1. **Landing:** explain the two sides (light theme by default). Click **Continue as Customer** → **Sign in** (pre-filled as Ashish Rawal).
2. **Customer:** Home → **Choose a shop**. Show the three ways to find a shop: **By name** (filter A3 or Colour), **Shop code** (type `QX7K2P`), **Scan QR** (camera, or upload a photo of a shop's QR poster from the shop workspace's Settings). Open **Sharma Xerox** → **Print at Sharma Xerox** (top right).
3. **Upload** a real PDF (or tap a sample) and see the page count read from the file. Add the
   *Semester 5 Marksheet* sample.
4. **Settings:** 2 copies, double-sided, stapled; the price updates. Set the marksheet to colour,
   then try A3 colour to show the "can't print that combination" check.
5. **Review** (add a note for the shop) → **Pay** → optionally **Try a failed payment**, then choose
   UPI, card or **Cash at pickup**. The tracking page opens; a cash order's ticket says how much to pay.
6. Open http://localhost:3000/sign-in/shop in a new tab → **Sign in** as Sharma Xerox.
7. **Shop:** the order is at the top of *Needs your attention*. Open it, **Preview** a file
   (watermarked), **Download** it (recorded on the receipt), **Accept** (watch the sheet fly from
   step 1 to step 2), choose a printer,
   **Start printing**.
8. Switch tabs: the customer's timeline moved to *Printing* by itself. Back in the shop, **Mark
   ready for pickup**; the customer's ticket shows the pickup code.
9. **Hand over:** in the **Ready** tab, **Scan a customer's pickup QR** (camera, or a screenshot of
   the ticket's QR), or type the code (a wrong code is refused). For a cash order, tick **cash
   received** first. The customer sees *Collected* and a full access receipt.
10. Optional: **Settings** → **Add printer**, **Printers** (switch one off), **Pricing** (change A4
    B&W, then see the customer's shop page update), **Settings** → pause orders.

11. **Review:** back in the customer tab, tap a star under the collected order (My orders or the
    order page), pick what went well and post. The review appears on the shop's dashboard and page.

Reset any time: Profile (customer) or Settings (shop) → **Reset demo data**.

## How it was simplified (2026-11-20)

| Before | Now |
|---|---|
| FastAPI API, Postgres, S3 storage, Mailpit, Docker Compose | Removed from the running project; archived in `archive/2026-11-20-full-stack/` |
| Email one-time-code sign-in, sessions, CSRF | Demo entry pages |
| Server-side encryption, retention sweeps, pickup lockouts | Out of scope for the prototype (designs and tests archived) |
| `/api` proxy in Next.js, sign-in/profile/shop-settings pages | Removed (archived under `web-removed/`) |
| Design system, components, `/design` gallery | **Kept**, with small wording fixes so nothing claims protection the prototype doesn't provide |

## Code map

- `apps/web/src/lib/demo/`: shops, prices (`pricing.ts`, tested), seed data, the store (`store.ts`),
  file handling (`files.ts`).
- `apps/web/src/components/demo/`: customer and shop frames, document previews, order actions.
- `apps/web/src/app/`: landing, `start/*`, customer pages (`home`, `shops`, `order`, `orders`,
  `profile`), shop workspace (`shop/*`), `design`. The Protected Printing explainer is archived
  under `archive/2026-11-20-full-stack/web-removed/`.
- `apps/web/src/components/demo/illustrated-icons.tsx`: the two-tone icons on the landing cards,
  home call-to-action and shop-finder tiles.
- `apps/web/src/components/demo/shop-icons.tsx`: the shop workspace icons (sidebar, stat tiles,
  action buttons). Each has one small hover movement; styles are `.shop-ic` in `globals.css`.
- `apps/web/src/components/demo/add-printer.tsx`: the add-printer dialog and Settings printer list.
- `apps/web/src/components/demo/review.tsx`: star input, review dialog, the My orders prompt and
  review quotes. `count-up.tsx`: animated numbers on the shop dashboard.
- `apps/web/src/components/demo/printer-hero.tsx`: the landing animation (Web Animations API:
  emerge, swing from the top edge, drop with a little spin; a still frame with reduced motion).

## Limits

- Data is per browser: another browser or a private window starts fresh.
- Two people can't use the same demo from different devices; there's no server.
- Uploaded files over 20 MB are refused. Very large PDFs make previews slower.
- Clearing site data resets the demo.
