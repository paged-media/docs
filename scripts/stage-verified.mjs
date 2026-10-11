#!/usr/bin/env node
/**
 * stage-verified — copies each example's InDesign page images
 * (examples/<id>/_verified/p*.webp, committed by verify-indesign.ts) to
 * public/examples/<id>/ so the static export serves them. public/examples/ is
 * generated and gitignored; run by `pnpm build` and `pnpm dev`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'examples');
const OUT = join(ROOT, 'public', 'examples');

rmSync(OUT, { recursive: true, force: true });
let n = 0;
for (const id of readdirSync(SRC)) {
  const dir = join(SRC, id, '_verified');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!/^p\d+\.webp$/.test(f)) continue;
    mkdirSync(join(OUT, id), { recursive: true });
    copyFileSync(join(dir, f), join(OUT, id, f));
    n++;
  }
}
console.log(`stage-verified: ${n} InDesign page image(s) → public/examples/`);
