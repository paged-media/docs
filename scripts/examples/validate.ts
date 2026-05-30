import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleIdml } from './assemble';
import { listExamples, exampleDir, readManifest, type ExampleManifest } from './common';

/**
 * The example-CI gate (briefing §6.2, "the whole point"). Every example is
 * assembled into a `.idml` and validated against the REAL renderer via
 * `paged-inspect --json` (built from the pinned core commit). This is structural
 * validation — Document::open + pipeline::build_document — not a render, so it
 * needs no GPU and no font. If the renderer stops accepting an example, this
 * fails and the docs build is visibly broken.
 *
 * The paged-inspect binary is resolved from $PAGED_INSPECT, else a sibling
 * ~/paged/core checkout (mirrors sync-wasm.sh's sibling convention).
 */
interface InspectReport {
  totals: {
    pages: number;
    frames: number;
    stories: number;
    paragraphs: number;
    runs: number;
  };
  stories: { self_id: string }[];
}

function resolveInspect(): string {
  if (process.env.PAGED_INSPECT && existsSync(process.env.PAGED_INSPECT)) {
    return process.env.PAGED_INSPECT;
  }
  for (const profile of ['release', 'debug']) {
    const guess = join(process.cwd(), '..', 'core', 'target', profile, 'paged-inspect');
    if (existsSync(guess)) return guess;
  }
  throw new Error(
    'paged-inspect not found. Set $PAGED_INSPECT, or build it from core:\n' +
      '  (cd ../core && cargo build --release -p paged-renderer --bin paged-inspect)',
  );
}

function check(label: string, expected: number | undefined, actual: number, errs: string[]) {
  if (expected !== undefined && expected !== actual) {
    errs.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

function validateOne(id: string, inspect: string): string[] {
  const manifest: ExampleManifest = readManifest(id);
  const bytes = assembleIdml(join(exampleDir(id), manifest.packageDir));
  const tmp = join(tmpdir(), `paged-example-${id}.idml`);
  writeFileSync(tmp, bytes);

  let stdout: string;
  try {
    stdout = execFileSync(inspect, ['--json', tmp], { encoding: 'utf8' });
  } catch (e) {
    // A non-zero exit means open/build failed.
    if (manifest.pathological) return []; // expected to surface a problem
    return [`paged-inspect failed: ${(e as Error).message.split('\n')[0]}`];
  }

  if (manifest.pathological) {
    return ['expected a diagnostic (pathological), but paged-inspect succeeded'];
  }

  const report = JSON.parse(stdout) as InspectReport;
  const errs: string[] = [];
  const e = manifest.expect ?? {};
  check('pages', e.pages, report.totals.pages, errs);
  check('stories', e.stories, report.stories.length, errs);
  check('frames', e.frames, report.totals.frames, errs);
  check('paragraphs', e.paragraphs, report.totals.paragraphs, errs);
  check('runs', e.runs, report.totals.runs, errs);
  return errs;
}

function main() {
  const inspect = resolveInspect();
  const ids = listExamples();
  let failed = 0;
  for (const id of ids) {
    const errs = validateOne(id, inspect);
    if (errs.length === 0) {
      console.log(`  ✓ ${id}`);
    } else {
      failed++;
      console.error(`  ✗ ${id}`);
      for (const err of errs) console.error(`      ${err}`);
    }
  }
  console.log(`\n${ids.length - failed}/${ids.length} examples valid (paged-inspect: ${inspect})`);
  if (failed > 0) process.exit(1);
}

main();
