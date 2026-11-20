# Quire web app

The whole Quire prototype: a landing page, the customer app and the shop-owner workspace.
Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind CSS v4. No backend.

- `npm install` then `npm run dev` → http://localhost:3000
- `npm test` · `npm run lint` · `npx tsc --noEmit` · `npx next build`

| Path | What |
|---|---|
| `src/app/page.tsx` | Landing: Continue as Customer / Shop Owner |
| `src/app/start/*` | Demo entry pages (no password, no code) |
| `src/app/{home,shops,order,orders,profile}` | Customer app |
| `src/app/shop/*` | Shop-owner workspace |
| `src/app/design` | Design system and component gallery |
| `src/lib/demo/*` | Demo data: sample shops, seed orders, prices, the browser store, file handling |
| `src/components/{ui,patterns,shell}` | Design system |
| `src/components/demo/*` | Prototype-only building blocks (frames, previews, order actions) |
| `public/samples/*` | Sample PDFs and images (fictional) |

`npm install` copies pdf.js's worker and font data into `public/` (see `scripts/copy-pdf-worker.mjs`).
See [../../README.md](../../README.md) and [../../docs/prototype.md](../../docs/prototype.md).
