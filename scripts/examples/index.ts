import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { listExamples, exampleDir, readManifest } from './common';

/**
 * Manifest integrity check (run in build.yml, no renderer needed). Validates the
 * cheap invariants the JSON Schema encodes, before the heavier renderer gate:
 *   - id matches the directory name and the slug pattern
 *   - the editable part actually exists on disk
 *   - tier / views are in range
 * `pnpm examples:index --check` exits non-zero on any problem.
 */
const ID_RE = /^[a-z0-9-]+$/;
const TIERS = new Set(['beginner', 'intermediate', 'pro']);
const VIEWS = new Set(['raw', 'annotated', 'tree', 'live']);

function main() {
  const ids = listExamples();
  const problems: string[] = [];

  for (const id of ids) {
    const m = readManifest(id);
    const where = `examples/${id}/example.json`;
    if (m.id !== id) problems.push(`${where}: id "${m.id}" must equal directory name "${id}"`);
    if (!ID_RE.test(m.id)) problems.push(`${where}: id "${m.id}" must match ${ID_RE}`);
    if (!TIERS.has(m.tier)) problems.push(`${where}: invalid tier "${m.tier}"`);
    if (!m.views?.length) problems.push(`${where}: views must be non-empty`);
    for (const v of m.views ?? []) {
      if (!VIEWS.has(v)) problems.push(`${where}: invalid view "${v}"`);
    }
    const part = join(exampleDir(id), m.packageDir, m.editable.part);
    if (!existsSync(part)) problems.push(`${where}: editable part not found: ${m.packageDir}/${m.editable.part}`);
  }

  if (problems.length > 0) {
    console.error(`Manifest problems (${problems.length}):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(`${ids.length} example manifest(s) OK`);
}

main();
