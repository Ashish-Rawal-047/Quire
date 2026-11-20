// Copies pdf.js's worker and font data next to the app so PDF previews work offline, from the same origin.
// Runs after `npm install` (postinstall), so the worker always matches the installed pdfjs-dist.
import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(resolve(root, "public"), { recursive: true });
copyFileSync(
  resolve(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  resolve(root, "public/pdf.worker.min.mjs"),
);
// Metrics for the 14 standard PDF fonts, so text in PDFs without embedded fonts renders accurately.
cpSync(resolve(root, "node_modules/pdfjs-dist/standard_fonts"), resolve(root, "public/pdfjs/standard_fonts"), {
  recursive: true,
});
console.log("pdf.js worker and standard fonts copied to public/");
