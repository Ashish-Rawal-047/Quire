# Quire

A product case study: print ordering for neighbourhood print shops in India, with a customer app and
a shop-owner workspace. This repository is an **interactive prototype**: realistic sample shops,
INR prices, simulated payments and simulated printing. No backend, accounts, email or printers.

**Live prototype:** https://ashish-rawal-047.github.io/Quire/

Open it and choose **Continue as Customer** or **Continue as Shop Owner**. Sign-in is pre-filled.
All demo data stays in your browser, and **Reset demo data** (Profile or shop Settings) restores it.

## Run it

Prerequisite: **Node 20+**.

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000 and choose **Continue as Customer** or **Continue as Shop Owner**.
Nothing else needs configuring: no email service, no payment keys, no Docker, no printer.

**Tip for demos:** open the customer app and the shop workspace in two tabs of the same browser.
Orders, status changes, prices and printer availability update between them live.

## What's in the prototype

| Customer | Shop owner |
|---|---|
| Landing with an animated printer (each page swings, then drops onto the stack); pre-filled sign-in | Pre-filled shop sign-in, with all 6 shop accounts listed |
| Find a shop by name, by shop code, or by scanning its QR code (camera or photo) | Dashboard: brand banner with shop QR, animated live counts, earnings chart, printer status, **customer reviews** |
| Shop page: address card with map, directions, hours, prices, printers | Orders: queue, progress tracker, next-step card, previews, receipt |
| Upload your own PDF/JPG/PNG, or a sample | Accept or reject (with a reason and simulated refund); a sheet of paper flies to the next step on the progress bar |
| Colour/B&W, sides, copies, paper size, stapling, with a live price | Print on a chosen printer (simulated progress), mark ready |
| Review your order and add a note for the shop | Hand over by scanning the customer's pickup QR or typing their code; collect cash first for cash orders |
| Simulated UPI/card payment (with a failure path), or **cash at pickup** | Printing queue, printer availability, editable prices |
| Live tracking; pickup QR and code in My orders; access receipt; history; **rate collected orders** (stars, tags, a note) | Settings: open/closed, **add or remove printers**, QR counter poster (PNG), switch shop, reset data |

Details, what's simulated, and a demo script: [docs/prototype.md](docs/prototype.md).
Design system: [docs/02-design-system.md](docs/02-design-system.md) and `/design` in the app.

## Checks

```bash
cd apps/web
npm test && npm run lint && npx tsc --noEmit && npm run build
```

## Deployment (GitHub Pages)

The app is a static export (`output: "export"` in `apps/web/next.config.ts`): `npm run build` writes
plain HTML, CSS and JS to `apps/web/out/`. [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
lints, tests, builds and publishes it on every push to `main`.

- The site lives under `/Quire/`. The workflow sets `NEXT_PUBLIC_BASE_PATH` from the repository
  name. Links and bundled assets get the prefix from Next.js; plain asset URLs (PDF worker, sample
  files, QR links) go through `withBase()` in `apps/web/src/lib/base-path.ts`.
- Order pages are `/orders/track/?id=…`: order ids are created in the browser, so they can't be
  pre-built as `/orders/<id>` pages.
- Preview the exact Pages build locally: `npm run build:pages && npm run preview`, then open
  http://localhost:4173/Quire/.
- There are no secrets. `apps/web/.env.example` lists the only variable, and `.env*` files are
  never committed.

## History

An earlier phase built production infrastructure (FastAPI API, Postgres, S3 storage, email sign-in,
envelope encryption). It isn't needed for the prototype and is kept, unused, in
[archive/2026-11-20-full-stack/](archive/2026-11-20-full-stack/README.md).
