#!/usr/bin/env node
/**
 * gen-sdk — projects the SDK API surface (@paged-media/idml-viewer + the
 * underlying paged-sdk ViewerSession and introspect-wasm Inspector) into
 * `.generated/sdk-catalog.json` for the <SdkCatalog> component.
 *
 * Source preference, in order:
 *   1. A typedoc/api-extractor pull at .generated/sources/sdk-catalog/api.json
 *      (pulled by pull-sources once core emits it) — fully LIVING.
 *   2. The committed seed at scripts/generate/sdk-catalog.seed.json — exhaustive
 *      today, kept in sync by hand until the typedoc pull lands.
 *
 * Either way the docs build, and the SDK reference is complete. When core starts
 * publishing the typedoc JSON, add it to sources.pin and this picks it up with
 * no other change.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GEN = join(ROOT, '.generated');
const PULLED = join(GEN, 'sources', 'sdk-catalog', 'api.json');
const SEED = join(ROOT, 'scripts', 'generate', 'sdk-catalog.seed.json');
const lock = readJSON(join(GEN, 'sources.lock.json')) ?? {};

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const pulled = existsSync(PULLED) ? readJSON(PULLED) : null;
const seed = readJSON(SEED);
const cat = pulled ?? seed;
const sourceMode = pulled ? 'typedoc' : 'seed';

mkdirSync(GEN, { recursive: true });

if (!cat) {
  console.warn('gen-sdk: no SDK catalog source — writing empty stub.');
  writeFileSync(join(GEN, 'sdk-catalog.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceMode: 'none', package: '@paged-media/idml-viewer', memberCount: 0, groups: [] }, null, 2));
  process.exit(0);
}

const memberCount = (cat.groups ?? []).reduce((n, g) => n + (g.members?.length ?? 0), 0);
writeFileSync(
  join(GEN, 'sdk-catalog.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceMode,
      sourceCommit: lock?.sources?.['sdk-catalog']?.sha ?? null,
      package: cat.package ?? '@paged-media/idml-viewer',
      memberCount,
      groups: cat.groups ?? [],
    },
    null,
    2,
  ),
);

console.log(`gen-sdk: ${memberCount} members across ${(cat.groups ?? []).length} groups (${sourceMode}) → sdk-catalog.json`);
