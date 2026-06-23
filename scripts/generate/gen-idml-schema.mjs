#!/usr/bin/env node
/**
 * gen-idml-schema — projects the engine catalog's `elements` section
 * (core/crates/paged-introspect/catalog.json, pulled as core-catalog) into
 * `.generated/idml-schema.json` for the <AttrTable element="…"/> generated mode.
 *
 * Each element carries its IDML attributes with a type hint and, where the
 * attribute is mutable, the `paged.set` path that writes it — so the IDML
 * reference's attribute tables both grow with the parser AND cross-link straight
 * to the scripting surface. Hand-authored <AttrTable rows={…}/> tables are
 * unaffected; this only feeds the rows-less generated mode.
 *
 * Degrades to an empty stub when the catalog has no `elements` section (older
 * core), so the docs build before that lands.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GEN = join(ROOT, '.generated');
const SRC = join(GEN, 'sources', 'core-catalog', 'catalog.json');
const lock = readJSON(join(GEN, 'sources.lock.json')) ?? {};

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const cat = existsSync(SRC) ? readJSON(SRC) : null;
const elements = cat?.elements ?? [];
const byName = {};
for (const el of elements) byName[el.name] = el;

mkdirSync(GEN, { recursive: true });
writeFileSync(
  join(GEN, 'idml-schema.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['core-catalog']?.sha ?? null,
      elementCount: elements.length,
      attributeCount: elements.reduce((n, el) => n + (el.attributes?.length ?? 0), 0),
      elements,
      byName,
    },
    null,
    2,
  ),
);

console.log(`gen-idml-schema: ${elements.length} elements → idml-schema.json`);
