#!/usr/bin/env node
/**
 * check-tokens — app/brand.css is a vendored copy of the brand's token source,
 * brand/docs/colors_and_type.css (docs/adr/810-next-edition-chrome.md). This
 * compares every custom property the vendored :root declares with the brand
 * file's :root: a token that is missing, has another value, is not a brand
 * token, or is declared twice fails the check.
 *
 * The brand checkout is looked for beside this repository (<repo>/../brand) or
 * at PAGED_BRAND_DIR. Without one the script says "brand checkout unavailable"
 * and compares nothing; PAGED_REQUIRE_BRAND=1 turns that into a failure. It
 * never passes silently.
 *
 * The one allowed difference is the font roles: the site names its next/font
 * variable first (app/layout.tsx), followed by the brand's stack unchanged. The
 * mono is the brand's system stack, with no variable in front.
 *
 * The same contract as paged-media/website's apps/site/scripts/check-tokens.mjs.
 *
 *   node scripts/check-tokens.mjs
 *   PAGED_BRAND_DIR=../brand PAGED_REQUIRE_BRAND=1 node scripts/check-tokens.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = process.env.PAGED_BRAND_DIR ? resolve(process.env.PAGED_BRAND_DIR) : resolve(REPO, '..', 'brand');
const BRAND = join(BRAND_DIR, 'docs', 'colors_and_type.css');
const VENDORED = join(REPO, 'app', 'brand.css');

/** Each font role and the next/font variable the site puts in front of it. */
const FONT_ROLES = {
  '--font-text-serif': '--font-newsreader',
  '--font-display-serif': '--font-newsreader',
  '--font-sans': '--font-dm-sans',
};

/** The custom properties of a stylesheet's first :root block, comments removed. */
function rootTokens(css, file) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const block = /:root\s*\{([^}]*)\}/.exec(src);
  if (!block) throw new Error(`${file}: no :root block`);
  const tokens = new Map();
  const twice = [];
  // A data: URI holds ';' inside quotes; split on the declarations' own semicolons.
  for (const decl of block[1].match(/(?:[^;"']|"[^"]*"|'[^']*')+/g) ?? []) {
    const colon = decl.indexOf(':');
    const name = decl.slice(0, colon).trim();
    if (colon < 0 || !name.startsWith('--')) continue;
    if (tokens.has(name)) twice.push(name);
    tokens.set(name, decl.slice(colon + 1).trim().replace(/\s+/g, ' '));
  }
  return { tokens, twice };
}

/** The brand commit the vendored header names ("brand acea435"). */
const headerCommit = (css) => /brand ([0-9a-f]{7,40})\b/.exec(css)?.[1] ?? null;

/** The last brand commit that changed the token file, if git can say. */
function brandFileCommit() {
  try {
    return execFileSync('git', ['-C', BRAND_DIR, 'log', '-1', '--format=%h', '--', 'docs/colors_and_type.css'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const vendoredCss = readFileSync(VENDORED, 'utf8');
const { tokens: vendored, twice } = rootTokens(vendoredCss, VENDORED);
const problems = twice.map((name) => `${name} is declared twice in app/brand.css`);

// What can be checked without the brand: the font roles point at next/font.
for (const [role, fontVar] of Object.entries(FONT_ROLES)) {
  if (!vendored.get(role)?.startsWith(`var(${fontVar}), `)) problems.push(`${role} does not start with var(${fontVar})`);
}
const commit = headerCommit(vendoredCss);
if (!commit) problems.push('the header of app/brand.css names no brand commit ("brand <sha>")');

if (!existsSync(BRAND)) {
  if (problems.length) {
    for (const p of problems) console.error(`check-tokens: ${p}`);
    process.exit(1);
  }
  const msg = `check-tokens: brand checkout unavailable (${BRAND}); the ${vendored.size} vendored tokens (brand ${commit}) were not compared. Set PAGED_BRAND_DIR to a brand checkout.`;
  if (process.env.PAGED_REQUIRE_BRAND === '1') {
    console.error(msg);
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}

const brand = rootTokens(readFileSync(BRAND, 'utf8'), BRAND);
for (const name of brand.twice) problems.push(`${name} is declared twice in the brand file`);
for (const [name, value] of brand.tokens) {
  if (!vendored.has(name)) {
    problems.push(`${name} is missing (brand: ${value})`);
    continue;
  }
  const want = FONT_ROLES[name] ? `var(${FONT_ROLES[name]}), ${value}` : value;
  const got = vendored.get(name);
  if (got !== want) problems.push(`${name}: vendored "${got}", brand "${want}"`);
}
for (const name of vendored.keys()) if (!brand.tokens.has(name)) problems.push(`${name} is not a brand token`);

if (problems.length) {
  for (const p of problems) console.error(`check-tokens: ${p}`);
  console.error(`check-tokens: ${problems.length} difference(s) between app/brand.css and ${BRAND}`);
  process.exit(1);
}
const last = brandFileCommit();
const since = last && commit && !last.startsWith(commit) && !commit.startsWith(last) ? `; the brand file has changed since (${last}) without changing a token` : '';
console.log(`check-tokens: ${vendored.size} tokens match ${BRAND} (vendored from brand ${commit}${since})`);
