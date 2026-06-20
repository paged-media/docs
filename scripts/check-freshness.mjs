#!/usr/bin/env node
/**
 * check-freshness — the guard on AUTHORED prose (the part of the docs a human
 * writes, which can go stale). Generated pages can't stall; authored pages can,
 * so a page that *describes* a moving source must declare what it describes and
 * when it was last checked:
 *
 *   ---
 *   describes: [scripting.headless-run, server.automation]
 *   reviewed: 2026-06-20
 *   ---
 *
 * If any described feature's newest evidence is NEWER than the page's `reviewed`
 * date, the page is stale and this gate flags it — forcing a human to re-read the
 * prose against the changed reality and bump `reviewed`. Pages without
 * `describes` are not checked (not every page needs the guard).
 *
 * `describes` entries that aren't known registry feature ids are reported as
 * informational (e.g. a source path — a future enhancement), never a hard fail.
 *
 * Run: node scripts/check-freshness.mjs [--warn]   (needs `pnpm generate:docs`)
 *   --warn  report only (exit 0); default fails the build on a stale page.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'docs');
const WARN_ONLY = process.argv.includes('--warn');

const support = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.generated', 'support-map.json'), 'utf8')).features ?? {};
  } catch {
    console.error('check-freshness: missing .generated/support-map.json — run `pnpm generate:docs` first.');
    process.exit(1);
  }
})();

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** Minimal frontmatter reader: the block between the first pair of --- lines. */
function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}
function field(fm, name) {
  const m = fm.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
/** `describes: [a, b]` (inline array) or `describes: a` (single). */
function listField(fm, name) {
  const raw = field(fm, name);
  if (!raw) return [];
  const inner = raw.replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const stale = [];
const missingReviewed = [];
const info = [];
let checked = 0;

for (const file of existsSync(CONTENT) ? walk(CONTENT) : []) {
  const fm = frontmatter(readFileSync(file, 'utf8'));
  const describes = listField(fm, 'describes');
  if (!describes.length) continue;
  const rel = relative(ROOT, file);
  const reviewed = field(fm, 'reviewed');
  if (!reviewed) {
    missingReviewed.push(rel);
    continue;
  }
  checked++;
  const reviewedT = Date.parse(reviewed);
  for (const id of describes) {
    const f = support[id];
    if (!f) {
      info.push(`${rel}: describes "${id}" (not a registry feature id — not freshness-checked)`);
      continue;
    }
    if (f.updatedAt && Date.parse(f.updatedAt) > reviewedT) {
      stale.push(`${rel}: "${id}" changed ${f.updatedAt.slice(0, 10)} > reviewed ${reviewed} — re-review and bump \`reviewed\``);
    }
  }
}

for (const i of info) console.log('  · ' + i);
console.log(`check-freshness: ${checked} guarded page(s) checked`);

if (missingReviewed.length) {
  console.error('\nPages with `describes:` but no `reviewed:` date:');
  for (const p of missingReviewed) console.error('  ✗ ' + p);
}
if (stale.length) {
  console.error('\nStale page(s) — a described source moved past `reviewed`:');
  for (const s of stale) console.error('  ✗ ' + s);
}

const failed = missingReviewed.length + stale.length;
if (failed && !WARN_ONLY) process.exit(1);
if (!failed) console.log('check-freshness: OK');
