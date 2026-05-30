import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assembleIdml } from './assemble';
import { listExamples, exampleDir, readManifest } from './common';

/**
 * `pnpm examples:assemble [id]` — write assembled `.idml`(s) to dist/examples/
 * for local manual inspection (e.g. unzip, or feed to paged-inspect by hand).
 * dist/ is gitignored.
 */
const only = process.argv[2];
const ids = only ? [only] : listExamples();

mkdirSync('dist/examples', { recursive: true });
for (const id of ids) {
  const manifest = readManifest(id);
  const bytes = assembleIdml(join(exampleDir(id), manifest.packageDir));
  const out = join('dist/examples', `${id}.idml`);
  writeFileSync(out, bytes);
  console.log(`wrote ${out} (${bytes.length} bytes)`);
}
