#!/usr/bin/env node
/**
 * check-feature-refs — the replacement for the old badge-manifest/gaps-snapshot
 * drift gate. Far simpler, because the registry is now the single source of
 * truth: every `feature="…"` / `chapter="…"` referenced in the MDX must resolve
 * to a real registry id. A typo or a renamed/removed feature fails the build.
 *
 * Validates the attrs on <SupportBadge>, <StageRow>, <CapabilityMatrix>,
 * <ConformanceTable>. Legacy `<SupportBadge status="…">` is allowed (transitional
 * fallback for constructs the registry does not track yet) and is reported as a
 * count, not an error.
 *
 * Run: node scripts/check-feature-refs.mjs  (needs `pnpm generate:docs` first).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'docs');
const GEN = join(ROOT, '.generated');

const support = readJSON(join(GEN, 'support-map.json'));
const matrix = readJSON(join(GEN, 'matrix.json'));
if (!support || !matrix) {
  console.error('check-feature-refs: missing .generated data — run `pnpm generate:docs` first.');
  process.exit(1);
}
const featureIds = new Set(Object.keys(support.features ?? {}));
const chapterIds = new Set((matrix.chapters ?? []).map((c) => c.chapter));

// No registry data (e.g. a PR/fork build without the cross-repo source token):
// we can't validate ids, so skip rather than fail spuriously. The token-equipped
// main/nightly build does the real gating.
if (featureIds.size === 0) {
  console.warn('check-feature-refs: no registry data pulled (no source token?) — skipping id validation.');
  process.exit(0);
}

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

// attr extractors
const attr = (tag, name) => new RegExp(`<${tag}\\b[^>]*?\\b${name}=["']([^"']+)["']`, 'g');

const errors = [];
let legacyBadges = 0;
let featureRefs = 0;

for (const file of existsSync(CONTENT) ? walk(CONTENT) : []) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  for (const [tag, attrName, valid] of [
    ['SupportBadge', 'feature', featureIds],
    ['StageRow', 'feature', featureIds],
    ['CapabilityMatrix', 'chapter', chapterIds],
    ['ConformanceTable', 'chapter', chapterIds],
  ]) {
    for (const m of src.matchAll(attr(tag, attrName))) {
      featureRefs++;
      if (!valid.has(m[1])) errors.push(`${rel}: <${tag} ${attrName}="${m[1]}"> — not a known ${attrName === 'chapter' ? 'chapter' : 'registry feature id'}`);
    }
  }

  // legacy status= badges (allowed, counted)
  for (const _ of src.matchAll(/<SupportBadge\b(?![^>]*\bfeature=)[^>]*\bstatus=/g)) legacyBadges++;
}

console.log(`check-feature-refs: ${featureRefs} live refs validated · ${legacyBadges} legacy status= badge(s) remaining`);
if (errors.length) {
  console.error(`\n${errors.length} bad reference(s):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('check-feature-refs: OK');
