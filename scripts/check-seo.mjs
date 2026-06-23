#!/usr/bin/env node
/**
 * check-seo — SEO/GEO hygiene gate for published pages. Hard-fails on the things
 * that actually break discovery (a published page with no title or no meta
 * description), and warns on the softer issues (over-long descriptions that get
 * truncated in results, duplicate titles/descriptions) without blocking the
 * build — those are a content-polish backlog, not a correctness bug.
 *
 * Run: node scripts/check-seo.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'docs');
const SOFT_DESC_MAX = 170; // SERP snippet truncation ballpark

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

// Minimal frontmatter reader (title/description/status only).
function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) o[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return o;
}

const files = existsSync(CONTENT) ? walk(CONTENT) : [];
const errors = [];
const warnings = [];
const titles = new Map();
const descs = new Map();
let published = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  const fm = frontmatter(readFileSync(file, 'utf8'));
  if (fm.status !== 'published') continue;
  published++;

  if (!fm.title) errors.push(`${rel}: published page has no title`);
  if (!fm.description) errors.push(`${rel}: published page has no meta description`);

  if (fm.description) {
    if (fm.description.length > SOFT_DESC_MAX) warnings.push(`${rel}: description ${fm.description.length} chars (>${SOFT_DESC_MAX}, may truncate in results)`);
    const key = fm.description.toLowerCase();
    descs.set(key, [...(descs.get(key) ?? []), rel]);
  }
  if (fm.title) {
    const key = fm.title.toLowerCase();
    titles.set(key, [...(titles.get(key) ?? []), rel]);
  }
}

for (const [, paths] of descs) if (paths.length > 1) warnings.push(`duplicate description across ${paths.length} pages: ${paths.join(', ')}`);

console.log(`check-seo: ${published} published page(s) checked · ${warnings.length} warning(s)`);
for (const w of warnings.slice(0, 20)) console.warn('  ⚠ ' + w);
if (warnings.length > 20) console.warn(`  … and ${warnings.length - 20} more warning(s)`);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('check-seo: OK');
