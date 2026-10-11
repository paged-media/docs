#!/usr/bin/env node
/**
 * stage-downloads — copies the assembled example packages
 * (dist/examples/<id>.idml, written by `pnpm examples:assemble`) to
 * public/downloads/<id>.idml so pages can offer them as downloads at
 * /downloads/<id>.idml. public/downloads/ is generated and gitignored; run by
 * `pnpm build` and `pnpm dev` after the examples are assembled.
 *
 * Examples whose manifest expects them NOT to open (deliberately broken
 * packages such as dangling-story) are skipped: a download is a working file.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'dist', 'examples');
const OUT = join(ROOT, 'public', 'downloads');

if (!existsSync(SRC)) {
  console.error('stage-downloads: dist/examples/ is missing — run `pnpm examples:assemble` first.');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of readdirSync(SRC)) {
  if (!f.endsWith('.idml')) continue;
  const id = f.slice(0, -'.idml'.length);
  const manifest = join(ROOT, 'examples', id, 'example.json');
  if (!existsSync(manifest)) continue;
  const { expect } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (expect && expect.opens === false) continue;
  copyFileSync(join(SRC, f), join(OUT, f));
  n++;
}
console.log(`stage-downloads: ${n} example package(s) → public/downloads/`);
