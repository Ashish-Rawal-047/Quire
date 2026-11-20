// Builds the site exactly as GitHub Pages serves it (under /Quire/), on any OS.
// Same as `NEXT_PUBLIC_BASE_PATH=/Quire npm run build`, without needing a POSIX shell.
// Then preview it with `npm run preview`.
import { execSync } from "node:child_process";

const env = { ...process.env, NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || "/Quire" };
console.log(`Building for GitHub Pages with base path ${env.NEXT_PUBLIC_BASE_PATH}`);
execSync("npm run build", { stdio: "inherit", env });
