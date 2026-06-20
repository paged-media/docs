#!/usr/bin/env node
/**
 * gen-matrix — projects the state registry (`state.json` + `meta.json` +
 * `conformance.public.json`, pulled by pull-sources) into the compact JSON the
 * docs components read:
 *
 *   .generated/matrix.json       full capability grid (chapters × stages) + headline
 *   .generated/support-map.json  per-feature badge (claim + evidence) for <SupportBadge>
 *   .generated/conformance.json  per-document conformance levels
 *
 * The registry is the single source of truth; nothing here is hand-maintained.
 * A source change → re-pull → re-gen → the pages re-render. No human in the loop.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'state');
const GEN = join(ROOT, '.generated');

/**
 * The 18 matrix columns — mirror of state/registry/stages.yaml (a frozen
 * taxonomy; the state dashboard hardcodes the same list). gen-matrix VALIDATES
 * that every stage present in the live data appears here, so a new column added
 * upstream fails this build loudly instead of being silently dropped.
 */
const STAGES = [
  { id: 'core.parser', title: 'Parser', group: 'Core' },
  { id: 'core.renderer', title: 'Renderer', group: 'Core' },
  { id: 'core.mutation', title: 'Mutation', group: 'Core' },
  { id: 'core.canvas-wasm', title: 'Canvas/WASM', group: 'Core' },
  { id: 'core.sdk', title: 'SDK', group: 'Core' },
  { id: 'editor.canvas', title: 'WASM Canvas', group: 'Editor' },
  { id: 'editor.shell', title: 'Shell', group: 'Editor' },
  { id: 'editor.panel', title: 'Panel', group: 'Editor' },
  { id: 'editor.gesture', title: 'Gesture', group: 'Editor' },
  { id: 'editor.script', title: 'Script', group: 'Editor' },
  { id: 'editor.styleguide', title: 'Styleguide', group: 'Editor' },
  { id: 'server.api', title: 'API', group: 'Server' },
  { id: 'plugin.api', title: 'API', group: 'Plugins' },
  { id: 'plugin.draw', title: 'Draw', group: 'Plugins' },
  { id: 'plugin.web', title: 'Web', group: 'Plugins' },
  { id: 'plugin.image', title: 'Image', group: 'Plugins' },
  { id: 'plugin.data', title: 'Data', group: 'Plugins' },
  { id: 'plugin.sheet', title: 'Sheet', group: 'Plugins' },
];
const STAGE_IDS = new Set(STAGES.map((s) => s.id));

function readJSON(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const state = readJSON(join(SRC, 'state.json'), null);
if (!state) {
  console.error(
    'gen-matrix: no state.json under .generated/sources/state — run pull-sources first. Writing empty stubs.',
  );
}
const meta = readJSON(join(SRC, 'meta.json'), {});
const conf = readJSON(join(SRC, 'conformance.json'), null);
const lock = readJSON(join(ROOT, '.generated', 'sources.lock.json'), {});
const sourceCommit = lock?.sources?.state?.sha ?? null;

mkdirSync(GEN, { recursive: true });

const features = state?.features ?? [];
const chapters = state?.chapters ?? [];
const headline = state?.meta?.headline ?? meta?.headline ?? {};

// Validate the stage taxonomy against the live data (drift → hard fail).
if (features.length) {
  const seen = new Set();
  for (const f of features) for (const k of Object.keys(f.cells ?? {})) seen.add(k);
  const unknown = [...seen].filter((s) => !STAGE_IDS.has(s));
  if (unknown.length) {
    console.error(
      `gen-matrix: state.json has stage(s) not in the embedded taxonomy: ${unknown.join(', ')}.\n` +
        '  Update STAGES in scripts/generate/gen-matrix.mjs to match state/registry/stages.yaml.',
    );
    process.exit(1);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
const normImpl = (cell) => {
  const v = cell?.impl ?? null;
  if (v === 'shipped' || v === 'partial' || v === 'planned' || v === 'deferred') return v;
  return 'na';
};
const normEv = (cell) => {
  const v = cell?.evidence ?? null;
  if (v === 'green' || v === 'red' || v === 'flaky') return v;
  return 'none';
};

/**
 * Renderer-centric, claim+evidence badge for a feature — the public honesty
 * signal on IDML reference pages. Inverse of state's import-docs mapping:
 *   renderer shipped + green → Supported · verified
 *   renderer shipped + red   → Supported · failing
 *   renderer shipped (else)  → Supported · untested
 *   renderer partial         → Parsed, partly rendered
 *   parser shipped only      → Parsed, not rendered
 *   else                     → Planned
 */
function badgeFor(cells) {
  const parser = cells['core.parser'] ?? {};
  const renderer = cells['core.renderer'] ?? {};
  const ri = normImpl(renderer);
  const re = normEv(renderer);
  const pi = normImpl(parser);

  if (ri === 'shipped') {
    if (re === 'green') return { key: 'supported-verified', label: 'Supported · verified', tone: 'valid' };
    if (re === 'red') return { key: 'supported-failing', label: 'Supported · failing', tone: 'warn' };
    return { key: 'supported-untested', label: 'Supported · untested', tone: 'valid-muted' };
  }
  if (ri === 'partial') return { key: 'partial', label: 'Parsed, partly rendered', tone: 'warn' };
  if (pi === 'shipped' || pi === 'partial') return { key: 'parsed-not-rendered', label: 'Parsed, not rendered', tone: 'warn' };
  if (pi === 'planned' || ri === 'planned') return { key: 'planned', label: 'Planned', tone: 'muted' };
  return { key: 'tracked', label: 'Tracked', tone: 'muted' };
}

// ── support-map.json (per-feature badge for <SupportBadge feature=…>) ────────
const supportFeatures = {};
for (const f of features) {
  const cells = f.cells ?? {};
  const pick = (id) => {
    const c = cells[id] ?? {};
    return { impl: normImpl(c), evidence: normEv(c), present: !!c.present, note: c.note ?? null };
  };
  // Newest evidence timestamp across all cells — the "last changed" signal the
  // freshness gate compares against an authored page's `reviewed` date.
  let updatedAt = null;
  for (const c of Object.values(cells)) {
    const t = c?.freshness?.finished_at;
    if (t && (!updatedAt || t > updatedAt)) updatedAt = t;
  }
  supportFeatures[f.id] = {
    id: f.id,
    title: f.title,
    chapter: f.chapter,
    status: f.status ?? null,
    achievedLevel: f.achieved_level ?? null,
    updatedAt,
    badge: badgeFor(cells),
    parser: pick('core.parser'),
    renderer: pick('core.renderer'),
    mutation: pick('core.mutation'),
  };
}

writeFileSync(
  join(GEN, 'support-map.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit, count: Object.keys(supportFeatures).length, features: supportFeatures }, null, 2),
);

// ── matrix.json (full grid) ──────────────────────────────────────────────────
const byChapter = new Map();
for (const f of features) {
  if (!byChapter.has(f.chapter)) byChapter.set(f.chapter, []);
  const cells = {};
  for (const s of STAGES) {
    const c = f.cells?.[s.id];
    if (!c) continue;
    const impl = normImpl(c);
    const ev = normEv(c);
    if (impl === 'na' && ev === 'none') continue; // skip empty cells to keep it compact
    cells[s.id] = { impl, evidence: ev };
  }
  byChapter.get(f.chapter).push({
    id: f.id,
    title: f.title,
    status: f.status ?? null,
    achievedLevel: f.achieved_level ?? null,
    isRed: !!f.is_red,
    isShippedUntested: !!f.is_shipped_untested,
    cells,
  });
}

const chapterMeta = new Map(chapters.map((c) => [c.chapter, c]));
const matrixChapters = [...byChapter.entries()].map(([chapter, feats]) => {
  const cm = chapterMeta.get(chapter) ?? {};
  return {
    chapter,
    title: cm.title ?? chapter,
    group: cm.group ?? 'format',
    total: cm.total ?? feats.length,
    shippedPct: cm.shipped_pct ?? null,
    greenPct: cm.green_pct ?? null,
    trend: cm.trend ?? null,
    features: feats,
  };
});

writeFileSync(
  join(GEN, 'matrix.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit,
      generatedFromRegistryCount: state?.meta?.registry_count ?? features.length,
      headline,
      stages: STAGES,
      chapters: matrixChapters,
    },
    null,
    2,
  ),
);

// ── conformance.json (passthrough/normalize) ─────────────────────────────────
writeFileSync(
  join(GEN, 'conformance.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit, data: conf }, null, 2),
);

console.log(
  `gen-matrix: ${features.length} features, ${matrixChapters.length} chapters → support-map.json, matrix.json, conformance.json`,
);
