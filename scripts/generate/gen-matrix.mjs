#!/usr/bin/env node
/**
 * gen-matrix — projects the capability record (cockpit's `exports/public.json`,
 * schema cockpit.export.v1, pulled by pull-sources) into the compact JSON the
 * docs components read:
 *
 *   .generated/matrix.json       full capability grid (chapters × stages) + headline
 *   .generated/support-map.json  per-feature badge (claim + evidence) for <SupportBadge>
 *   .generated/conformance.json  per-document conformance levels (none since state retired)
 *   public/capabilities.json     the record itself, served for paged.media and anyone else
 *
 * Cockpit derives each feature's health from the newest CI test runs of every
 * repo; a feature's claims say which components implement it. A cell is a
 * claim, coloured by the feature's health. Nothing here is hand-maintained.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'cockpit', 'public.json');
const GEN = join(ROOT, '.generated');

/** Component groups → the display groups the matrix renders. */
const GROUP_TITLES = { core: 'Core', editor: 'Editor', server: 'Server', plugin: 'Plugins' };

function readJSON(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const record = readJSON(SRC, null);
if (!record) {
  console.error('gen-matrix: no cockpit export under .generated/sources/cockpit — run pull-sources first. Writing empty stubs.');
} else if (record.schema !== 'cockpit.export.v1') {
  console.error(`gen-matrix: unexpected schema ${record.schema} (want cockpit.export.v1)`);
  process.exit(1);
}
const lock = readJSON(join(ROOT, '.generated', 'sources.lock.json'), {});
const sourceCommit = lock?.sources?.cockpit?.sha ?? null;

mkdirSync(GEN, { recursive: true });
if (record) {
  mkdirSync(join(ROOT, 'public'), { recursive: true });
  copyFileSync(SRC, join(ROOT, 'public', 'capabilities.json'));
}

const STAGES = (record?.components ?? [])
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((c) => ({ id: c.id, title: c.title, group: GROUP_TITLES[c.group] ?? c.group ?? 'Other' }));

/** A feature's health as the evidence vocabulary the components render. */
function evidenceOf(health) {
  const t = health?.tests ?? {};
  if (health?.state === 'broken' || (t.failed ?? 0) > 0) return 'red';
  if (health?.state === 'healthy') return 'green';
  if (health?.state === 'attention' && (t.linked ?? 0) > 0) return 'stale';
  return 'none';
}
/** Lifecycle → the status words the pages use. */
const STATUS = { stable: 'shipped', beta: 'shipped', experimental: 'experimental', planned: 'planned', deprecated: 'deprecated', retired: 'retired' };

// Reshape each feature into the cell form the rest of this file expects.
const features = (record?.features ?? []).map((f) => {
  const ev = evidenceOf(f.health);
  const cells = {};
  for (const c of f.claims ?? []) {
    cells[c.component] = { impl: c.status, evidence: ev, note: c.note ?? null, present: true, freshness: { finished_at: f.health?.evidence_at ?? null } };
  }
  return {
    id: f.id,
    title: f.title,
    chapter: f.chapter,
    status: STATUS[f.status] ?? f.status,
    health: f.health,
    is_red: ev === 'red',
    is_shipped_untested: f.status === 'stable' && ev === 'none',
    cells,
  };
});
const chapters = (record?.chapters ?? []).map((c) => ({ chapter: c.id, title: c.title, group: c.group ?? 'format', order: c.order ?? 999 }));

const shipped = features.filter((f) => f.status === 'shipped');
const greenShipped = shipped.filter((f) => f.cells && Object.values(f.cells)[0]?.evidence === 'green');
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const headline = {
  total: features.length,
  shipped: shipped.length,
  shipped_pct: pct(shipped.length, features.length),
  green_of_shipped: greenShipped.length,
  green_pct: pct(greenShipped.length, shipped.length),
  stale: features.filter((f) => evidenceOf(f.health) === 'stale').length,
  failing: features.filter((f) => f.is_red).length,
  shipped_untested: features.filter((f) => f.is_shipped_untested).length,
  experimental: features.filter((f) => f.status === 'experimental').length,
  planned: features.filter((f) => f.status === 'planned').length,
  record_generated_at: record?.generated_at ?? null,
};

const STAGE_IDS = new Set(STAGES.map((s) => s.id));
const unknownStages = [...new Set(features.flatMap((f) => Object.keys(f.cells)))].filter((s) => !STAGE_IDS.has(s));
if (unknownStages.length) {
  console.error(`gen-matrix: claims name component(s) the record does not list: ${unknownStages.join(', ')}`);
  process.exit(1);
}

// ── helpers ────────────────────────────────────────────────────────────────
const normImpl = (cell) => {
  const v = cell?.impl ?? null;
  if (v === 'shipped' || v === 'partial' || v === 'planned' || v === 'deferred') return v;
  return 'na';
};
const normEv = (cell) => {
  const v = cell?.evidence ?? null;
  if (v === 'green' || v === 'red' || v === 'flaky' || v === 'stale') return v;
  return 'none';
};

/**
 * Renderer-centric, claim+evidence badge for a feature — the public honesty
 * signal on IDML reference pages. Inverse of state's import-docs mapping:
 *   renderer shipped + green → Supported · verified
 *   renderer shipped + red   → Supported · failing
 *   renderer shipped + stale → Supported · re-test pending (tests passed before the latest change)
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
    if (re === 'stale') return { key: 'supported-stale', label: 'Supported · re-test pending', tone: 'valid-muted' };
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
  // When the feature's implementation last changed — the signal the freshness
  // gate compares against an authored page's `reviewed` date. (Evidence dates
  // move with every CI run and would make every guarded page stale daily.)
  const updatedAt = f.health?.changed_at ?? null;
  supportFeatures[f.id] = {
    id: f.id,
    title: f.title,
    chapter: f.chapter,
    status: f.status ?? null,
    achievedLevel: null,
    health: f.health ?? null,
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
    achievedLevel: null,
    isRed: !!f.is_red,
    isShippedUntested: !!f.is_shipped_untested,
    cells,
  });
}

const chapterMeta = new Map(chapters.map((c) => [c.chapter, c]));
const matrixChapters = [...byChapter.entries()]
  .map(([chapter, feats]) => {
    const cm = chapterMeta.get(chapter) ?? {};
    const sh = feats.filter((f) => f.status === 'shipped');
    const green = sh.filter((f) => Object.values(f.cells).some((c) => c.evidence === 'green'));
    return {
      chapter,
      title: cm.title ?? chapter,
      group: cm.group ?? 'format',
      order: cm.order ?? 999,
      total: feats.length,
      shippedPct: pct(sh.length, feats.length),
      greenPct: sh.length ? pct(green.length, sh.length) : null,
      trend: null,
      features: feats,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

writeFileSync(
  join(GEN, 'matrix.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit,
      generatedFromRegistryCount: features.length,
      recordGeneratedAt: record?.generated_at ?? null,
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
  JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit, data: null }, null, 2),
);

console.log(
  `gen-matrix: ${features.length} features, ${matrixChapters.length} chapters → support-map.json, matrix.json, conformance.json`,
);
