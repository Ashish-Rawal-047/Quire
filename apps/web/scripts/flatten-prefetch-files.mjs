// Post-build step for the static export (GitHub Pages).
//
// `next build` with `output: "export"` writes per-segment prefetch data as nested folders,
// e.g. out/sign-in/customer/__next.sign-in/customer/__PAGE__.txt, but the client router asks
// for the same data under a flat name: out/sign-in/customer/__next.sign-in.customer.__PAGE__.txt.
// On a plain static host those requests 404 (pages still work, but every link prefetch fails and
// navigation is slower). This copies each nested file to its flat name. The nested originals are
// kept, so both spellings resolve.
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "out"));
if (!existsSync(out)) {
  console.error(`No export found at ${out}. Run "next build" first.`);
  process.exit(1);
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

let copied = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      for (const file of files(p)) {
        const flat = join(dir, [name, ...relative(p, file).split(sep)].join("."));
        if (!existsSync(flat)) {
          copyFileSync(file, flat);
          copied++;
        }
      }
    } else {
      walk(p);
    }
  }
}

walk(out);
console.log(`Prefetch files: ${copied} flat copies written in ${out}`);
