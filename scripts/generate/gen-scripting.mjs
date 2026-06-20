#!/usr/bin/env node
/**
 * gen-scripting — projects the engine's Boa scripting catalog
 * (core/crates/paged-introspect/catalog.json, pulled by pull-sources) into
 * `.generated/scripting.json` for the <ScriptingCatalog> component.
 *
 * The catalog is the single source of truth for the `paged.*` host surface
 * (host functions, the id grammar, the ~179 settable property paths, the runtime
 * constraints). Documenting the scripting layer is therefore zero-maintenance:
 * when the engine adds a host fn or a settable path, this page grows on the next
 * build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'core-catalog', 'catalog.json');
const GEN = join(ROOT, '.generated');
const lock = readJSON(join(ROOT, '.generated', 'sources.lock.json')) ?? {};

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const cat = readJSON(SRC);
mkdirSync(GEN, { recursive: true });

if (!cat) {
  console.warn('gen-scripting: no catalog.json pulled — writing empty stub.');
  writeFileSync(join(GEN, 'scripting.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: null, hostFunctions: [], idGrammar: [], settablePaths: [], constraints: [] }, null, 2));
  process.exit(0);
}

// Group host functions by kind, preserving catalog order within each group.
const KIND_ORDER = ['read', 'write', 'author', 'history', 'console'];
const groups = {};
for (const fn of cat.hostFunctions ?? []) {
  (groups[fn.kind] ??= []).push(fn);
}
const hostFunctionGroups = KIND_ORDER.filter((k) => groups[k]).map((kind) => ({ kind, functions: groups[kind] }));
for (const k of Object.keys(groups)) if (!KIND_ORDER.includes(k)) hostFunctionGroups.push({ kind: k, functions: groups[k] });

writeFileSync(
  join(GEN, 'scripting.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['core-catalog']?.sha ?? null,
      hostFunctionCount: (cat.hostFunctions ?? []).length,
      settablePathCount: (cat.settablePaths ?? []).length,
      hostFunctionGroups,
      idGrammar: cat.idGrammar ?? [],
      settablePaths: cat.settablePaths ?? [],
      constraints: cat.constraints ?? [],
    },
    null,
    2,
  ),
);

console.log(`gen-scripting: ${(cat.hostFunctions ?? []).length} host fns, ${(cat.settablePaths ?? []).length} settable paths → scripting.json`);
