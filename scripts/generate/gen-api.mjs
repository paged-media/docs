#!/usr/bin/env node
/**
 * gen-api — projects the editor-server OpenAPI spec
 * (editor-server/generated/openapi.json, pulled by pull-sources) into
 * `.generated/rest-api.json` for the <RestApiReference> component.
 *
 * The OpenAPI document is itself generated from the server's Zod contracts, so
 * the REST reference here is generated-from-generated: it can't drift from the
 * running API.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'editor-server', 'openapi.json');
const GEN = join(ROOT, '.generated');
const lock = readJSON(join(ROOT, '.generated', 'sources.lock.json')) ?? {};

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const spec = readJSON(SRC);
mkdirSync(GEN, { recursive: true });

if (!spec) {
  console.warn('gen-api: no openapi.json pulled — writing empty stub.');
  writeFileSync(join(GEN, 'rest-api.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: null, info: {}, groups: [] }, null, 2));
  process.exit(0);
}

// Group endpoints by their first tag (fall back to the path's first segment).
const byTag = new Map();
let count = 0;
for (const [path, methods] of Object.entries(spec.paths ?? {})) {
  for (const m of METHODS) {
    const op = methods[m];
    if (!op) continue;
    count++;
    const tag = (op.tags && op.tags[0]) || path.split('/').filter(Boolean)[0] || 'misc';
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push({
      method: m.toUpperCase(),
      path,
      operationId: op.operationId ?? null,
      summary: op.summary ?? null,
      description: op.description ?? null,
      deprecated: !!op.deprecated,
    });
  }
}

// Order by declared tag order when available.
const tagOrder = (spec.tags ?? []).map((t) => t.name);
const tagMeta = new Map((spec.tags ?? []).map((t) => [t.name, t.description ?? null]));
const groups = [...byTag.entries()]
  .sort((a, b) => {
    const ia = tagOrder.indexOf(a[0]);
    const ib = tagOrder.indexOf(b[0]);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  })
  .map(([tag, endpoints]) => ({ tag, description: tagMeta.get(tag) ?? null, endpoints }));

writeFileSync(
  join(GEN, 'rest-api.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['editor-server']?.sha ?? null,
      info: { title: spec.info?.title ?? null, version: spec.info?.version ?? null, openapi: spec.openapi ?? null },
      endpointCount: count,
      groups,
    },
    null,
    2,
  ),
);

console.log(`gen-api: ${count} endpoints across ${groups.length} tags → rest-api.json`);
