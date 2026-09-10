#!/usr/bin/env node
/**
 * gen-surfaces — projects the capability x surface matrix
 * (state/data/capability-matrix.json, pulled by pull-sources) into
 * `.generated/surfaces.json` for the <SurfaceReach> component.
 *
 * WHY THIS EXISTS. The API index names the programmable surfaces and
 * describes each one, and a reader arrives with a question it could not
 * answer: which of them can actually do the thing I want? "Scripting",
 * "command line" and "SDK" all sound complete, and they are not equal —
 * the CLI reaches half the engine's message kinds and says why for the
 * rest, the viewer SDK writes nothing by design, and the programmable
 * SDK reaches everything but names a typed method for only some of it.
 *
 * That comparison is not editorial here. It is derived upstream: every
 * cell of the matrix comes from the gate that owns that surface —
 * core's cli_surface.rs and script_surface.rs, the editor's probed
 * capability table, the client's own generated catalog — and every cell
 * that is not reachable by name carries a written reason. This stage
 * only counts and reshapes.
 *
 * The four cell values, kept verbatim from upstream because the
 * distinction between the last three is the whole point:
 *
 *   named    a dedicated entry point spells this capability
 *   generic  reachable through the surface's general door
 *   blocked  not reachable, with a reason
 *   n/a      structurally not applicable to this surface
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'capability-matrix', 'capability-matrix.json');
const GEN = join(ROOT, '.generated');

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const lock = readJSON(join(GEN, 'sources.lock.json')) ?? {};
const matrix = readJSON(SRC);
mkdirSync(GEN, { recursive: true });

/**
 * Where a reader goes for each surface. A surface with no page yet is
 * still listed — omitting it would make the comparison a smaller claim
 * than the matrix makes, which is the one thing this page must not do.
 */
const HREF = {
  boa: '/docs/paged/scripting',
  cli: '/docs/paged/cli',
  session: '/docs/paged/cli',
  client: null,
  editor: null,
  plugin: '/docs/paged/plugin-sdk',
  viewer: '/docs/paged/sdk',
};

const EMPTY = {
  generatedAt: new Date().toISOString(),
  sourceCommit: null,
  protocol: null,
  opCount: 0,
  kindCount: 0,
  surfaces: [],
};

if (!matrix || !Array.isArray(matrix.rows) || matrix.rows.length === 0) {
  console.warn('gen-surfaces: no capability-matrix.json pulled — writing empty stub.');
  writeFileSync(join(GEN, 'surfaces.json'), JSON.stringify(EMPTY, null, 2));
  process.exit(0);
}

const keys = Object.keys(matrix.surfaces ?? {});
if (keys.length === 0) {
  console.warn('gen-surfaces: the matrix names no surfaces — writing empty stub.');
  writeFileSync(join(GEN, 'surfaces.json'), JSON.stringify(EMPTY, null, 2));
  process.exit(0);
}

const surfaces = keys.map((key) => {
  const counts = matrix.counts?.[key] ?? { ops: {}, kinds: {} };
  const pick = (bucket, status) => counts[bucket]?.[status] ?? 0;
  // One representative reason per surface: the sentence a reader most
  // needs is the one attached to whatever this surface can't do. Take
  // the first non-named cell's `why` rather than inventing a summary.
  const firstWhy = matrix.rows
    .map((r) => r.surfaces?.[key])
    .find((c) => c && c.status !== 'named' && c.why)?.why ?? null;
  return {
    key,
    title: matrix.surfaces[key],
    href: HREF[key] ?? null,
    ops: {
      named: pick('ops', 'named'),
      generic: pick('ops', 'generic'),
      blocked: pick('ops', 'blocked'),
      na: pick('ops', 'n/a'),
    },
    kinds: {
      named: pick('kinds', 'named'),
      generic: pick('kinds', 'generic'),
      blocked: pick('kinds', 'blocked'),
      na: pick('kinds', 'n/a'),
    },
    note: firstWhy,
  };
});

writeFileSync(
  join(GEN, 'surfaces.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['capability-matrix']?.sha ?? null,
      protocol: matrix.generatedFrom?.protocol ?? null,
      opCount: matrix.rows.filter((r) => r.population === 'op').length,
      kindCount: matrix.rows.filter((r) => r.population === 'kind').length,
      surfaces,
    },
    null,
    2,
  ),
);
console.log(
  `gen-surfaces: ${surfaces.length} surfaces over ${matrix.rows.length} capabilities → .generated/surfaces.json`,
);
