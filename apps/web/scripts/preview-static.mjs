// Serves the static export (out/) the way GitHub Pages serves a project site, so the Pages build
// can be checked locally before pushing:
//   npm run build:pages && npm run preview   ->  http://localhost:4173/Quire/
// /Quire/... maps to out/..., folders redirect to a trailing slash, unknown paths get 404.html.
// No dependencies: Node's built-in http server only.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");
const prefix = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/Quire").replace(/\/$/, "");
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

if (!existsSync(root)) {
  console.error('No out/ folder. Run "npm run build:pages" first.');
  process.exit(1);
}

function notFound(res) {
  const page = join(root, "404.html");
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(existsSync(page) ? readFileSync(page) : "Not found");
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  if (prefix && (pathname === "/" || pathname === "")) {
    res.writeHead(302, { Location: `${prefix}/` });
    return res.end();
  }
  if (prefix && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return notFound(res);
  let file = normalize(join(root, pathname.slice(prefix.length) || "/"));
  if (!file.startsWith(root)) return notFound(res);
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    file = join(file, "index.html");
  }
  if (!existsSync(file)) return notFound(res);
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Previewing the GitHub Pages build at http://localhost:${port}${prefix}/`));
