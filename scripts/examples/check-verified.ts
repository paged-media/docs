import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { exampleDir, listExamples, readManifest } from './common';
import { partsHash } from '../../lib/parts-hash';

/**
 * `pnpm examples:verify --check` — the CI half of InDesign verification (no
 * InDesign needed). A `verified` stamp is evidence about exact bytes, so:
 *   - its partsHash must match the package as committed
 *   - its page images must exist, one per verified page
 *   - its page count must agree with the manifest's `expect.pages`
 * An example with no `verified` block only warns while verification rolls out.
 */
const problems: string[] = [];
const unverified: string[] = [];

for (const id of listExamples()) {
  const m = readManifest(id);
  const v = m.verified;
  if (!v) {
    unverified.push(id);
    continue;
  }
  if (v.status !== 'verified') continue;
  const where = `examples/${id}`;
  const now = partsHash(join(exampleDir(id), m.packageDir));
  if (v.partsHash !== now) {
    problems.push(`${where}: the package changed since InDesign verified it — re-verify: pnpm examples:verify-indesign ${id}`);
  }
  const dir = join(exampleDir(id), '_verified');
  const images = existsSync(dir) ? readdirSync(dir).filter((f) => /^p\d+\.webp$/.test(f)) : [];
  if (v.pages !== undefined && images.length !== v.pages) {
    problems.push(`${where}: ${images.length} page image(s) in _verified/, ${v.pages} verified page(s)`);
  }
  if (m.expect?.pages !== undefined && v.pages !== undefined && v.pages !== m.expect.pages) {
    problems.push(`${where}: InDesign verified ${v.pages} page(s), expect.pages is ${m.expect.pages}`);
  }
}

if (unverified.length) console.warn(`examples:verify: ${unverified.length} example(s) not yet verified in InDesign: ${unverified.join(', ')}`);
if (problems.length) {
  console.error(`examples:verify: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('examples:verify: every stamp matches its package');
