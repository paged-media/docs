#!/usr/bin/env node
/**
 * check:facts — a page under content/docs/paged may not type a platform number
 * by hand. "263 functions", "protocol 71", "36 examples" go stale the day the
 * platform moves; <Fact id="…" /> renders the current value from
 * data/facts.json instead.
 *
 * It flags a number directly followed by a counted noun (functions, kernels,
 * operations, settable paths, host functions, commands, wire kinds, examples,
 * capabilities, features), and `protocol <n>` / `v0.<n>.<n>` engine versions.
 * Code blocks are skipped (an example's literal output is not a claim), and so
 * are lines in data/facts-allow.json: a number that is about something else
 * (a fixture's 3 frames, a 12-column grid) is allowed by naming the line.
 *
 *   node scripts/check-facts.mjs [--warn]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content', 'docs', 'paged');
const WARN = process.argv.includes('--warn');
const allow = JSON.parse(readFileSync(join(ROOT, 'data', 'facts-allow.json'), 'utf8')).allow;

const NOUNS =
  '(?:registered |built-in |spreadsheet |expression |scriptable |settable |host |wire |verified |reference |tracked |shipped )?' +
  '(?:functions?|kernels?|operations?|ops|(?:property )?paths|host functions|commands|wire kinds|kinds|examples|capabilities|capability rows|features|plugins)';
const PATTERNS = [
  new RegExp(`\\b\\d{2,}(?:[,\\u202f ]\\d{3})*\\+?\\s+${NOUNS}\\b`, 'i'),
  /\bprotocol(?: version)? \d{2,}\b/i,
  /\bv0\.\d{2,}\.\d+\b/,
];

function* walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.mdx')) yield p;
  }
}

const hits = [];
for (const file of walk(DIR)) {
  const rel = relative(ROOT, file);
  let inCode = false;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*```/.test(line)) inCode = !inCode;
      if (inCode) return;
      const text = line.replace(/`[^`]*`/g, '').replace(/<Fact[^>]*\/>/g, '');
      for (const re of PATTERNS) {
        const m = text.match(re);
        if (m && !allow.some((a) => a.file === rel && line.includes(a.text))) {
          hits.push(`${rel}:${i + 1}: "${m[0]}"`);
          break;
        }
      }
    });
}

if (hits.length) {
  const say = WARN ? console.warn : console.error;
  say(`check:facts: ${hits.length} hand-typed platform number(s) — use <Fact id="…" /> (data/facts.json), or allow the line in data/facts-allow.json:`);
  for (const h of hits) say(`  ${h}`);
  if (!WARN) process.exit(1);
} else {
  console.log('check:facts: OK — no hand-typed platform numbers');
}
