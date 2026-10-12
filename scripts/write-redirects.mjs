#!/usr/bin/env node
/**
 * write-redirects — writes public/_redirects for the site this build produces
 * (SITE=idml | paged, lib/site.ts). Cloudflare Pages reads it from the export.
 *
 * Every rule is a 301 that lands on the FINAL URL in one hop: old
 * docs.paged.media/docs/idml/<page>/ goes straight to idml.paged.media/<page>/,
 * never via an intermediate. Rules are derived from the content tree, so a new
 * chapter is covered without editing this file.
 *
 * URL history this file answers for:
 *   - until 2026-06-23   docs.paged.media/docs/<chapter>/…  (one tree)
 *   - until 2026-10-11   docs.paged.media/docs/{idml,paged}/…  (two pillars)
 *   - since              idml.paged.media/<chapter>/… and docs.paged.media/<chapter>/…
 *
 * Cloudflare limits: 2000 static + 100 dynamic (splat) rules, where any rule
 * after the first splat counts as dynamic; static rules are therefore written
 * first, and the script fails loudly if either limit is ever reached.
 *
 * Usage: SITE=idml node scripts/write-redirects.mjs
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SITE ?? 'paged';
if (SITE !== 'idml' && SITE !== 'paged') throw new Error(`SITE must be idml or paged, got ${SITE}`);

const IDML = 'https://idml.paged.media';
const PAGED = 'https://docs.paged.media';
// Keep in step with ENGINE_CHAPTERS in lib/site.ts.
const ENGINE = ['the-renderer', 'parser-internals', 'test-corpus'];

// Pages moved or merged inside the IDML reference: old path → new path.
const MOVED_IDML_PAGES = {
  'stories-text/why-ranges-not-spans': 'stories-text/the-paragraph-model',
  'stories-text/text-variables': 'sections-numbering-variables/text-variables',
  'layout-model/override-resolution': 'master-spreads-overrides/override-resolution',
  'tagged-xml/why-its-not-parsed-yet': 'tagged-xml/reading-and-preserving',
};

// IDML pages that described Paged rather than the format, now on
// docs.paged.media: old IDML path → path on the Paged site.
const MOVED_TO_PAGED = {
  'foundations/how-the-renderer-reads-it': 'engine/how-paged-reads-idml',
  'edge-cases/the-error-model': 'engine/edge-cases/the-error-model',
  'edge-cases/graceful-degradation': 'engine/edge-cases/graceful-degradation',
};

// docs.paged.media pages that were retired: old path → the page that replaces it.
const RETIRED_PAGED = {
  'state/conformance': 'state/matrix',
  'repos/state': 'repos/cockpit',
};

const chapters = (dir) =>
  readdirSync(join(ROOT, 'content/docs', dir)).filter((n) => statSync(join(ROOT, 'content/docs', dir, n)).isDirectory());
const idmlChapters = chapters('idml');

const rules = [];
/** A chapter (or prefix) moved: its index and everything under it. */
function moved(from, to) {
  rules.push([from, `${to}/`]);
  rules.push([`${from}/`, `${to}/`]);
  rules.push([`${from}/*`, `${to}/:splat`]);
}

if (SITE === 'paged') {
  // The engine chapters left the IDML pillar for docs.paged.media/engine/.
  for (const ch of ENGINE) {
    moved(`/docs/idml/${ch}`, `/engine/${ch}`);
    moved(`/docs/${ch}`, `/engine/${ch}`);
  }
  // Moved IDML pages go straight to their new home, ahead of the pillar splat.
  for (const [from, to] of Object.entries(MOVED_IDML_PAGES)) {
    rules.push([`/docs/idml/${from}`, `${IDML}/${to}/`], [`/docs/idml/${from}/`, `${IDML}/${to}/`]);
  }
  // IDML pages that moved to this site, from both former trees.
  for (const [from, to] of Object.entries(MOVED_TO_PAGED)) {
    for (const old of [`/docs/idml/${from}`, `/docs/${from}`]) rules.push([old, `/${to}/`], [`${old}/`, `/${to}/`]);
  }
  // Pages retired on this site: old path → the page that now answers the question.
  // The conformance ladder lived only in the retired state registry; per-feature
  // verification is now the test health on the capability matrix (2026-10-12).
  for (const [from, to] of Object.entries(RETIRED_PAGED)) rules.push([`/${from}`, `/${to}/`], [`/${from}/`, `/${to}/`]);
  // The IDML pillar is now its own site.
  rules.push(['/docs/idml', `${IDML}/`], ['/docs/idml/', `${IDML}/`]);
  rules.push(['/docs/idml/index.html', `${IDML}/`]);
  rules.push(['/docs/idml/*', `${IDML}/:splat`]);
  // The Paged pillar moved to the root; its index page is now /overview/.
  rules.push(['/docs/paged', '/overview/'], ['/docs/paged/', '/overview/']);
  rules.push(['/docs/paged/*', '/:splat']);
  // The pre-June single tree.
  rules.push(['/docs/platform', '/overview/'], ['/docs/platform/', '/overview/'], ['/docs/platform/*', '/:splat']);
  moved('/docs/plugin-sdk', '/plugin-sdk');
  for (const ch of idmlChapters) moved(`/docs/${ch}`, `${IDML}/${ch}`);
  // The old "choose a reference" root.
  rules.push(['/docs', '/'], ['/docs/', '/']);
} else {
  // A docs.paged.media-style path typed against the new host.
  for (const ch of ENGINE) {
    moved(`/docs/idml/${ch}`, `${PAGED}/engine/${ch}`);
    moved(`/${ch}`, `${PAGED}/engine/${ch}`);
  }
  for (const [from, to] of Object.entries(MOVED_IDML_PAGES)) {
    rules.push([`/${from}`, `/${to}/`], [`/${from}/`, `/${to}/`]);
    rules.push([`/docs/idml/${from}`, `/${to}/`], [`/docs/idml/${from}/`, `/${to}/`]);
  }
  for (const [from, to] of Object.entries(MOVED_TO_PAGED)) {
    for (const old of [`/${from}`, `/docs/idml/${from}`]) rules.push([old, `${PAGED}/${to}/`], [`${old}/`, `${PAGED}/${to}/`]);
  }
  rules.push(['/docs/idml', '/'], ['/docs/idml/', '/']);
  rules.push(['/docs/idml/*', '/:splat']);
}

// Static rules go first. Cloudflare counts every rule that FOLLOWS a splat as
// dynamic (limit 100), and a static rule is an exact match, so hoisting them
// changes no outcome. The sort is stable, so the splat order is kept.
const isDynamic = ([from]) => from.includes('*') || from.includes(':');
rules.sort((a, b) => Number(isDynamic(a)) - Number(isDynamic(b)));
const dynamic = rules.filter(isDynamic).length;
const statics = rules.length - dynamic;
if (dynamic > 100 || statics > 2000) {
  throw new Error(`write-redirects: ${statics} static / ${dynamic} dynamic rules exceed Cloudflare's 2000 / 100`);
}

const body = [
  `# Generated by scripts/write-redirects.mjs for SITE=${SITE} — do not edit.`,
  '# Cloudflare Pages _redirects: first match wins, :splat = the wildcard.',
  ...rules.map(([from, to]) => `${from} ${to} 301`),
  '',
].join('\n');
writeFileSync(join(ROOT, 'public', '_redirects'), body);
console.log(`write-redirects (${SITE}): ${statics} static + ${dynamic} dynamic rules → public/_redirects`);
