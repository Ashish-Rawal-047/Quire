import type { NextConfig } from "next";

// The prototype is front-end only: no API, no proxy. Demo data lives in the browser, so the
// whole site is exported as static files (`out/`) and hosted on GitHub Pages.
//
// NEXT_PUBLIC_BASE_PATH is "/Quire" in the Pages build (the site lives at
// https://<user>.github.io/Quire/) and empty locally.
//
// Security headers that used to be set here (nosniff, Referrer-Policy, X-Frame-Options,
// Permissions-Policy) are not supported by static export, and GitHub Pages can't set custom
// headers. The camera (QR scanning) still works: it needs a secure, same-origin page, which
// Pages provides over HTTPS.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // /shops/QX7K2P -> /shops/QX7K2P/index.html, which every static host serves reliably.
  trailingSlash: true,
  images: { unoptimized: true },
  // cacheComponents / partialPrefetching were on before the move to GitHub Pages. They rely on
  // partial prerendering, which a static export can't do ("PPR cannot be enabled in export
  // mode"). Nothing in the app used their APIs ("use cache", cacheLife, connection()).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
