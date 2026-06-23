#!/usr/bin/env node
/**
 * gen-crosslinks — derives the cross-pillar link graph that makes the two
 * references (IDML format ⇄ Paged platform) navigate into each other.
 *
 * The state registry is ALREADY cross-pillar: every feature carries `cells`
 * spanning IDML-side stages (core.parser, core.renderer) AND Paged-side stages
 * (core.sdk, editor.script, plugin.*). And 24 of the IDML section slugs are
 * exactly registry chapter ids (stories-text, styles, …). So the cross-link is
 * latent in matrix.json — this projects it into `.generated/crosslinks.json`:
 *
 *   chapters[<chapter>] = { title, group, idmlUrl, featureCount, shipped{…},
 *                           pagedSurfaces[{key,label,url,note}] }
 *   surfaces[<key>]     = { url, chapters[ <idml chapter ids acting here> ] }
 *
 * Reads ONLY .generated/matrix.json (itself generated from the registry), so the
 * whole thing is offline + deterministic and grows when the registry grows. No
 * human in the loop. Degrades to empty when matrix.json is absent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GEN = join(ROOT, '.generated');
const IDML_DIR = join(ROOT, 'content', 'docs', 'idml');

function readJSON(p, fallback) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

const matrix = readJSON(join(GEN, 'matrix.json'), { chapters: [], sourceCommit: null });

// IDML reference section folders that exist on disk — a chapter only earns an
// `idmlUrl` if there is a real section page for it (24 of the chapters).
const idmlSections = new Set(
  existsSync(IDML_DIR)
    ? readdirSync(IDML_DIR).filter((f) => statSync(join(IDML_DIR, f)).isDirectory())
    : [],
);

// Aggregate the strongest impl across a chapter's features for one stage.
const RANK = { shipped: 3, partial: 2, planned: 1, deferred: 0, na: -1 };
function chapterStage(features, stageId) {
  let best = 'na';
  for (const f of features) {
    const impl = f.cells?.[stageId]?.impl ?? 'na';
    if ((RANK[impl] ?? -1) > (RANK[best] ?? -1)) best = impl;
  }
  return best;
}
const isLive = (impl) => impl === 'shipped' || impl === 'partial';

// Plugin chapter → its plugin page slug under /docs/paged/plugins.
const PLUGIN_PAGE = {
  'plugin-draw': 'draw',
  'plugin-web': 'web',
  image: 'image',
  sheet: 'sheets',
  data: 'data',
};

const chapters = {};
// Reverse index: surface key → idml chapters where that surface is live.
const surfaces = {
  sdk: { url: '/docs/paged/sdk', label: 'Viewer SDK', chapters: [] },
  script: { url: '/docs/paged/scripting', label: 'Scripting', chapters: [] },
  state: { url: '/docs/paged/state', label: 'Capability state', chapters: [] },
};

for (const ch of matrix.chapters ?? []) {
  const feats = ch.features ?? [];
  const shipped = {
    parser: chapterStage(feats, 'core.parser'),
    renderer: chapterStage(feats, 'core.renderer'),
    mutation: chapterStage(feats, 'core.mutation'),
    sdk: chapterStage(feats, 'core.sdk'),
    script: chapterStage(feats, 'editor.script'),
  };
  const idmlUrl = idmlSections.has(ch.chapter) ? `/docs/idml/${ch.chapter}` : null;

  // The Paged surfaces that act on this chapter, in reader-priority order.
  const pagedSurfaces = [];
  if (isLive(shipped.script)) pagedSurfaces.push({ key: 'script', label: 'Script it with paged.*', url: '/docs/paged/scripting' });
  if (isLive(shipped.sdk) || isLive(shipped.renderer)) pagedSurfaces.push({ key: 'sdk', label: 'Render it with the Viewer SDK', url: '/docs/paged/sdk' });
  if (isLive(shipped.mutation)) pagedSurfaces.push({ key: 'edit', label: 'Edit it in the editor', url: '/docs/paged' });
  for (const [chId, slug] of Object.entries(PLUGIN_PAGE)) {
    if (ch.chapter === chId) pagedSurfaces.push({ key: 'plugin', label: `The ${slug} plugin`, url: `/docs/paged/plugins/${slug}` });
  }
  // Always: the live capability state, deep-linked to this chapter's group.
  pagedSurfaces.push({ key: 'state', label: 'Live capability state', url: '/docs/paged/state' });

  chapters[ch.chapter] = {
    title: ch.title ?? ch.chapter,
    group: ch.group ?? 'format',
    idmlUrl,
    featureCount: feats.length,
    shippedPct: ch.shippedPct ?? null,
    shipped,
    pagedSurfaces,
  };

  // Build the reverse index: which IDML chapters does each Paged surface act on?
  if (idmlUrl) {
    if (isLive(shipped.sdk) || isLive(shipped.renderer)) surfaces.sdk.chapters.push(ch.chapter);
    if (isLive(shipped.script)) surfaces.script.chapters.push(ch.chapter);
    surfaces.state.chapters.push(ch.chapter);
  }
}

mkdirSync(GEN, { recursive: true });
writeFileSync(
  join(GEN, 'crosslinks.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: matrix.sourceCommit ?? null,
      chapterCount: Object.keys(chapters).length,
      chapters,
      surfaces,
    },
    null,
    2,
  ),
);

console.log(
  `gen-crosslinks: ${Object.keys(chapters).length} chapters → crosslinks.json ` +
    `(sdk⇄${surfaces.sdk.chapters.length} idml chapters, script⇄${surfaces.script.chapters.length})`,
);
