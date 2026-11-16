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
 * An entry may name a registry feature id or a whole chapter (`plugin-sheets`'s
 * chapter is `sheet`), which stands for every feature in it. A feature "changed"
 * when its implementation last changed (cockpit's changed_at), not when its tests
 * last ran. Entries that are neither are reported as informational.
 *
 * Pages under REQUIRED (plugins/, compare/) state capabilities in prose and must
 * declare `describes` and `reviewed`.
 *
 * Run: node scripts/check-freshness.mjs [--warn]   (needs `pnpm generate:docs`)
 *   --warn  report only (exit 0); default fails the build on a stale page.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { featuresByChapter, reviewState } from '../lib/freshness.mjs';

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
  const m = fm.match(new RegExp(`^${name}:[ \\t]*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
/** `describes: [a, b]` (inline array), `describes: a` (single), or a YAML block list. */
function listField(fm, name) {
  const block = fm.match(new RegExp(`^${name}:[ \\t]*\\n((?:[ \\t]+-[ \\t]*.+\\n?)+)`, 'm'));
  if (block) {
    return block[1]
      .split('\n')
      .map((l) => l.replace(/^[ \t]+-[ \t]*/, '').trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  const raw = field(fm, name);
  if (!raw) return [];
  const inner = raw.replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const REQUIRED = ['content/docs/paged/plugins/', 'content/docs/paged/compare/'];
// The policy itself is lib/freshness.mjs, which the pages use to tell readers
// the same verdict (components/review-line.tsx).
const byChapter = featuresByChapter(support);
const missingDescribes = [];
const stale = [];
const missingReviewed = [];
const info = [];
let checked = 0;

for (const file of existsSync(CONTENT) ? walk(CONTENT) : []) {
  const fm = frontmatter(readFileSync(file, 'utf8'));
  const describes = listField(fm, 'describes');
  const rel = relative(ROOT, file);
  if (!describes.length) {
    if (REQUIRED.some((d) => rel.startsWith(d))) missingDescribes.push(rel);
    continue;
  }
  const reviewed = field(fm, 'reviewed');
  if (!reviewed) {
    missingReviewed.push(rel);
    continue;
  }
  checked++;
  const verdict = reviewState(describes, reviewed, support, byChapter);
  for (const id of verdict.unknown) {
    info.push(`${rel}: describes "${id}" (neither a registry feature nor a chapter — not freshness-checked)`);
  }
  for (const s of verdict.stale) {
    stale.push(`${rel}: "${s.entry}" changed ${s.changed} (${s.featureId}) > reviewed ${reviewed} — re-review and bump \`reviewed\``);
  }
}

for (const i of info) console.log('  · ' + i);
console.log(`check-freshness: ${checked} guarded page(s) checked`);

if (missingDescribes.length) {
  console.error('\nPages that state capabilities but declare no `describes:` (plugins/, compare/):');
  for (const p of missingDescribes) console.error('  ✗ ' + p);
}
if (missingReviewed.length) {
  console.error('\nPages with `describes:` but no `reviewed:` date:');
  for (const p of missingReviewed) console.error('  ✗ ' + p);
}
if (stale.length) {
  console.error('\nStale page(s) — a described source moved past `reviewed`:');
  for (const s of stale) console.error('  ✗ ' + s);
}

const failed = missingDescribes.length + missingReviewed.length + stale.length;
if (failed && !WARN_ONLY) process.exit(1);
if (!failed) console.log('check-freshness: OK');
