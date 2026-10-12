#!/usr/bin/env node
/**
 * check:comparison — keeps data/comparison.json honest against the platform.
 *
 * Paged's scores are an editorial judgement (how Paged compares with the field
 * is not something its own registry can measure), but each row names the
 * registry chapters, features or facts the score rests on. This fails when:
 *
 *   - a backing chapter, feature or fact does not exist;
 *   - a score of 2 or more rests on a failing capability, or on shipped
 *     capabilities fewer than half of which tests verify today (planned ones
 *     are reported and left out of that ratio: a roadmap item in a chapter does
 *     not unmake what shipped);
 *   - a competitor's `researched` date is more than MAX_AGE_DAYS old.
 *
 * Reads .generated/support-map.json and .generated/facts.json (run
 * `pnpm generate:docs` first).
 *
 *   node scripts/check-comparison.mjs [--warn]
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WARN = process.argv.includes('--warn');
const MAX_AGE_DAYS = 120;
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const cmp = read('data/comparison.json');
const support = Object.values(read('.generated/support-map.json').features);
const facts = read('.generated/facts.json').facts;
const chapters = new Set(support.map((f) => f.chapter));
const ids = new Set(support.map((f) => f.id));

const problems = [];
const lines = [];
for (const domain of cmp.domains) {
  for (const row of domain.rows) {
    const b = row.paged ?? {};
    const label = `${domain.key} · ${row.dimension}`;
    if (!b.chapters?.length && !b.features?.length && !b.facts?.length) {
      problems.push(`${label}: Paged's score names nothing it rests on (add paged.chapters, paged.features or paged.facts)`);
      continue;
    }
    for (const c of b.chapters ?? []) if (!chapters.has(c)) problems.push(`${label}: chapter ${c} is not in the registry`);
    for (const f of b.features ?? []) if (!ids.has(f)) problems.push(`${label}: feature ${f} is not in the registry`);
    for (const f of b.facts ?? []) if (!facts[f]) problems.push(`${label}: fact ${f} is not in data/facts.json`);

    const picked = support.filter((f) => (b.chapters ?? []).includes(f.chapter) || (b.features ?? []).includes(f.id));
    if (!picked.length) {
      lines.push(`  ${label}: score ${row.scores.paged} — facts only (${(b.facts ?? []).join(', ')})`);
      continue;
    }
    const shipped = picked.filter((f) => f.status !== 'planned');
    const verified = shipped.filter((f) => f.health?.state === 'healthy').length;
    const failing = picked.filter((f) => (f.health?.tests?.failed ?? 0) > 0 || f.health?.state === 'broken');
    const planned = picked.filter((f) => f.status === 'planned');
    const score = row.scores.paged;
    lines.push(`  ${label}: score ${score} — ${verified}/${shipped.length} verified, ${planned.length} planned, ${failing.length} failing`);
    if (score >= 2) {
      if (failing.length) problems.push(`${label}: score ${score} rests on failing capabilities: ${failing.map((f) => f.id).join(', ')}`);
      if (verified * 2 < shipped.length) problems.push(`${label}: score ${score} but only ${verified} of ${shipped.length} shipped capabilities are verified`);
    }
  }
}

const now = Date.now();
for (const t of cmp.tools) {
  if (t.key === 'paged') continue;
  if (!t.researched) {
    problems.push(`${t.name}: no researched date`);
    continue;
  }
  const days = Math.floor((now - Date.parse(t.researched)) / 86_400_000);
  lines.push(`  ${t.name}: researched ${t.researched} (${days} days ago)`);
  if (days > MAX_AGE_DAYS) problems.push(`${t.name}: researched ${days} days ago (limit ${MAX_AGE_DAYS}) — run the comparison research (update-comparison workflow) and review its PR`);
}

console.log('check:comparison');
for (const l of lines) console.log(l);
if (problems.length) {
  const say = WARN ? console.warn : console.error;
  say(`check:comparison: ${problems.length} problem(s):`);
  for (const p of problems) say(`  ✗ ${p}`);
  if (!WARN) process.exit(1);
} else {
  console.log('check:comparison: OK');
}
