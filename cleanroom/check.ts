import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint, NORMALIZER_VERSION } from './normalize';

/**
 * Compare each content page's masked connective prose against the private spec
 * baseline fingerprint, reporting containment (share of a page's n-grams that
 * also appear in the spec). A backstop for human discipline — it flags suspicious
 * overlap; it does NOT prove originality, and it cannot catch structural mirroring
 * (that stays a reviewer judgment). Thresholds are tuned in Phase 0 against a
 * deliberately-paraphrased decoy page.
 */
const WARN = 0.1;
const FAIL = 0.2;

interface Baseline {
  normalizerVersion: number;
  shingles: string[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.mdx') || full.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  const baselinePath = arg('--baseline');
  if (!baselinePath) {
    console.log('::notice::no --baseline provided; skipping similarity check.');
    return;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
  if (baseline.normalizerVersion !== NORMALIZER_VERSION) {
    console.error(
      `baseline normalizer v${baseline.normalizerVersion} != current v${NORMALIZER_VERSION}; regenerate the baseline.`,
    );
    process.exit(1);
  }
  const spec = new Set(baseline.shingles);

  let failed = 0;
  for (const file of walk('content')) {
    const fp = fingerprint(readFileSync(file, 'utf8'));
    if (fp.size === 0) continue;
    let hits = 0;
    for (const h of fp) if (spec.has(h)) hits++;
    const containment = hits / fp.size;
    const pct = (containment * 100).toFixed(1);
    if (containment >= FAIL) {
      console.error(`✗ ${file}: ${pct}% connective-prose overlap with the spec`);
      failed++;
    } else if (containment >= WARN) {
      console.warn(`⚠ ${file}: ${pct}% overlap (under fail threshold — review)`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} page(s) over the similarity threshold.`);
    process.exit(1);
  }
  console.log('clean-room similarity check passed');
}

main();
