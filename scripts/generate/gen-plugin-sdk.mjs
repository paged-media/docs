#!/usr/bin/env node
/**
 * gen-plugin-sdk — projects the plugin manifest JSON Schema
 * (plugin-sdk/packages/plugin-api/src/manifest.schema.json, pulled by
 * pull-sources) into `.generated/plugin-capabilities.json` for the
 * <PluginCapabilities> component.
 *
 * The schema is the single source of truth (ADR-019) for the closed capability
 * vocabularies and the contribution kinds a plugin manifest may declare. So the
 * Plugin SDK capability reference is generated, not hand-kept: a new capability
 * enum value or contribution kind shows up here on the next build.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'plugin-sdk', 'manifest.schema.json');
const GEN = join(ROOT, '.generated');
const lock = readJSON(join(ROOT, '.generated', 'sources.lock.json')) ?? {};

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Summarize a sub-schema into a human-readable "shape" string + any enum values. */
function describe(schema) {
  if (!schema || typeof schema !== 'object') return { shape: 'any', values: [] };
  if (schema.enum) return { shape: 'enum', values: schema.enum };
  if (schema.type === 'array') {
    const items = schema.items ?? {};
    if (items.enum) return { shape: 'array of enum', values: items.enum };
    return { shape: `array of ${items.type ?? 'value'}`, values: [] };
  }
  if (schema.type === 'boolean') return { shape: 'boolean', values: [] };
  if (schema.oneOf) {
    const vals = [];
    for (const s of schema.oneOf) {
      const d = describe(s);
      vals.push(...d.values);
    }
    return { shape: schema.oneOf.map((s) => describe(s).shape).join(' | '), values: vals };
  }
  if (schema.type === 'object') {
    const props = Object.keys(schema.properties ?? {});
    return { shape: props.length ? `object { ${props.join(', ')} }` : 'object', values: [] };
  }
  return { shape: schema.type ?? 'value', values: [] };
}

const schema = readJSON(SRC);
mkdirSync(GEN, { recursive: true });

if (!schema) {
  console.warn('gen-plugin-sdk: no manifest.schema.json pulled — writing empty stub.');
  writeFileSync(join(GEN, 'plugin-capabilities.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: null, manifestFields: [], capabilities: [], contributions: [] }, null, 2));
  process.exit(0);
}

const props = schema.properties ?? {};
const required = new Set(schema.required ?? []);

const manifestFields = Object.entries(props)
  .filter(([k]) => k !== 'capabilities' && k !== 'contributes')
  .map(([name, s]) => ({ name, required: required.has(name), description: s.description ?? null, ...describe(s) }));

const capsSchema = props.capabilities?.properties ?? {};
const capabilities = Object.entries(capsSchema).map(([name, s]) => ({
  name,
  description: s.description ?? null,
  ...describe(s),
}));

const contrSchema = props.contributes?.properties ?? {};
const contributions = Object.entries(contrSchema).map(([name, s]) => ({
  name,
  description: s.description ?? (s.items?.description ?? null),
  shape: describe(s).shape,
}));

writeFileSync(
  join(GEN, 'plugin-capabilities.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['plugin-sdk']?.sha ?? null,
      title: schema.title ?? 'Plugin manifest',
      manifestFields,
      capabilities,
      contributions,
    },
    null,
    2,
  ),
);

console.log(`gen-plugin-sdk: ${capabilities.length} capabilities, ${contributions.length} contribution kinds → plugin-capabilities.json`);
