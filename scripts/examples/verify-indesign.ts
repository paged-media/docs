import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assembleIdml } from './assemble';
import { exampleDir, listExamples, readManifest, type ExampleManifest } from './common';
import { partsHash } from '../../lib/parts-hash';

/**
 * `pnpm examples:verify-indesign [id…]` — open each example in the real
 * InDesign, record what it makes of the file, and commit the evidence
 * (macOS, maintainer-only; InDesign takes over its window while it runs).
 *
 * Per example:
 *   1. assemble the package and hand it to InDesign (indesign/verify-example.jsx)
 *   2. require: it opened, no font or link is missing, and it re-saved the
 *      file as IDML; record the PDF's fonts (the preview has only Open Sans)
 *   3. rasterise InDesign's PDF (FOGRA39, 96 dpi) to lossless WebP — the
 *      record the ΔE is measured on — and again at 288 dpi for display
 *      (p<N>@3x.webp: the comparison enlarges a crop of the page)
 *   4. render the same package with paged-inspect and ΔE-diff each page
 *   5. write examples/<id>/_verified/ and the manifest's `verified` block,
 *      whose partsHash ties the stamp to these exact parts
 *
 * `--rasters [id…]` redoes only the display images, from the PDF the last
 * verification kept in _verified/ (gitignored, so on the machine that ran it).
 *
 * Env: INDESIGN_APP (default "Adobe InDesign 2025"), PAGED_INSPECT and
 * PAGED_DIFF (default ../core/target/release/…), FOGRA39_ICC.
 */
const APP = process.env.INDESIGN_APP ?? 'Adobe InDesign 2025';
const CORE_RELEASE = resolve('..', 'core', 'target', 'release');
const INSPECT = process.env.PAGED_INSPECT ?? join(CORE_RELEASE, 'paged-inspect');
const DIFF = process.env.PAGED_DIFF ?? join(CORE_RELEASE, 'paged-diff');
const ICC = process.env.FOGRA39_ICC ?? '/Library/Application Support/Adobe/Color/Profiles/Recommended/CoatedFOGRA39.icc';
const FONT = resolve('public/fonts/OpenSans.ttf');
const JSX = resolve('scripts/examples/indesign/verify-example.jsx');
const DPI = '96';
const DISPLAY_DPI = '288';
const PAGE_BUDGET = 60 * 1024;

interface InDesignResult {
  ok: boolean;
  version: string;
  errors: string[];
  pages?: number;
  stories?: number;
  paragraphs?: number;
  overset?: string[];
  missingFonts?: string[];
  missingLinks?: string[];
  roundTrip?: boolean;
  preset?: string;
}

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

function runInDesign(idml: string, out: string): InDesignResult {
  const shim = join(out, 'shim.jsx');
  writeFileSync(shim, `var VERIFY_IDML = ${JSON.stringify(idml)};\nvar VERIFY_OUT = ${JSON.stringify(out)};\n$.evalFile(File(${JSON.stringify(JSX)}));\n`);
  // `do script` by its raw event code: InDesign's terminology is fetched
  // while compiling, which a sandboxed shell refuses (-2741). A cold launch
  // plus an open runs past AppleScript's default 120 s timeout.
  sh('osascript', [
    '-e', 'with timeout of 900 seconds',
    '-e', `tell application "${APP}"`,
    '-e', `«event K2  dosc» (POSIX file "${shim}") given «class doLg»:«constant ****JSLg»`,
    '-e', 'end tell',
    '-e', 'end timeout',
  ]);
  const resultFile = join(out, 'result.json');
  if (!existsSync(resultFile)) throw new Error('InDesign wrote no result.json');
  return JSON.parse(readFileSync(resultFile, 'utf8')) as InDesignResult;
}

/** Font names embedded in the PDF (pdffonts' first column). */
function pdfFonts(pdf: string): string[] {
  return sh('pdffonts', [pdf])
    .split('\n')
    .slice(2)
    .map((l) => l.trim().split(/\s+/)[0])
    .filter(Boolean)
    .map((n) => n.replace(/^[A-Z]{6}\+/, ''));
}

function pagePngs(dir: string, prefix: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.png'))
    .sort()
    .map((f) => join(dir, f));
}

/** InDesign's pages at display resolution, as `p<N>@3x.webp` beside the 96 dpi record. */
function writeDisplayRasters(pdf: string, dest: string): number {
  const work = mkdtempSync(join(tmpdir(), 'verify-display-'));
  try {
    sh('pdftoppm', ['-r', DISPLAY_DPI, '-png', '-defaultcmykprofile', ICC, pdf, join(work, 'hi')]);
    const pngs = pagePngs(work, 'hi');
    pngs.forEach((png, i) => sh('cwebp', ['-quiet', '-lossless', '-z', '9', png, '-o', join(dest, `p${i + 1}@3x.webp`)]));
    return pngs.length;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function verify(id: string, m: ExampleManifest): void {
  const pkg = join(exampleDir(id), m.packageDir);
  const work = mkdtempSync(join(tmpdir(), `verify-${id}-`));
  const idml = join(work, `${id}.idml`);
  writeFileSync(idml, assembleIdml(pkg));

  const r = runInDesign(idml, work);
  const problems = [...r.errors];
  if (!r.ok) problems.push('InDesign could not open or export the file');
  if (r.missingFonts?.length) problems.push(`missing fonts: ${r.missingFonts.join(', ')}`);
  if (r.missingLinks?.length) problems.push(`missing links: ${r.missingLinks.join(', ')}`);
  if (!r.roundTrip) problems.push('InDesign did not re-save the file as IDML');
  const pdf = join(work, 'indesign.pdf');
  // A font InDesign could not find is a failure (missingFonts above). A font
  // it HAS but the browser preview lacks (an example that names no font is
  // set in InDesign's default face) is recorded, and the stamp says so.
  const fonts = existsSync(pdf) ? [...new Set(pdfFonts(pdf))] : [];
  const fontsMatched = fonts.every((f) => /^OpenSans/i.test(f));
  if (m.expect?.pages !== undefined && r.pages !== m.expect.pages) {
    problems.push(`InDesign reports ${r.pages} page(s), the manifest expects ${m.expect.pages}`);
  }
  if (problems.length) {
    throw new Error(problems.join('; '));
  }

  // InDesign's pages, rasterised the way the fidelity gate does it.
  sh('pdftoppm', ['-r', DPI, '-png', '-defaultcmykprofile', ICC, pdf, join(work, 'ref')]);
  const refs = pagePngs(work, 'ref');

  // The same package through Paged's renderer, then ΔE per page.
  sh(INSPECT, [idml, '--render', join(work, 'cand.png'), '--dpi', DPI, '--snap-glyph-origins',
    '--font-family', `Open Sans=${FONT}`, '--default-font', FONT]);
  if (existsSync(join(work, 'cand.png'))) copyFileSync(join(work, 'cand.png'), join(work, 'cand-1.png'));
  const cands = pagePngs(work, 'cand-');
  const pages: { meanDE: number; p99DE: number; ssim: number }[] = [];
  refs.forEach((ref, i) => {
    const cand = cands[i];
    if (!cand) return;
    // paged-diff exits 1 when a page misses its own pass thresholds; the
    // measurement on stdout is what we record either way.
    const run = spawnSync(DIFF, [ref, cand, '--json'], { encoding: 'utf8' });
    if (!run.stdout?.trim().startsWith('{')) throw new Error(`paged-diff failed: ${run.stderr || run.status}`);
    const line = JSON.parse(run.stdout) as { mean_de: number; p99_de: number; ssim: number };
    pages.push({ meanDE: line.mean_de, p99DE: line.p99_de, ssim: line.ssim });
  });
  const worst = pages.reduce(
    (w, p) => ({ meanDE: Math.max(w.meanDE, p.meanDE), p99DE: Math.max(w.p99DE, p.p99DE), ssim: Math.min(w.ssim, p.ssim) }),
    { meanDE: 0, p99DE: 0, ssim: 1 },
  );
  const round = (n: number) => Math.round(n * 1000) / 1000;

  const dest = join(exampleDir(id), '_verified');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  copyFileSync(pdf, join(dest, 'indesign.pdf'));
  refs.forEach((ref, i) => {
    const webp = join(dest, `p${i + 1}.webp`);
    sh('cwebp', ['-quiet', '-lossless', '-z', '9', ref, '-o', webp]);
    const size = readFileSync(webp).length;
    if (size > PAGE_BUDGET) console.warn(`  ! ${id} p${i + 1}.webp is ${Math.round(size / 1024)} KB (budget ${PAGE_BUDGET / 1024} KB)`);
  });
  writeDisplayRasters(pdf, dest);

  const verifiedAt = new Date().toISOString().slice(0, 10);
  const record = {
    status: 'verified' as const,
    indesignVersion: r.version,
    verifiedAt,
    partsHash: partsHash(pkg),
    pages: r.pages ?? refs.length,
    roundTrip: true,
    fidelity: { meanDE: round(worst.meanDE), p99DE: round(worst.p99DE), ssim: round(worst.ssim), fontsMatched },
  };
  writeFileSync(
    join(dest, 'verify.json'),
    JSON.stringify({ ...record, pdfFonts: fonts, preset: r.preset, stories: r.stories, paragraphs: r.paragraphs, overset: r.overset, perPage: pages.map((p) => ({ meanDE: round(p.meanDE), p99DE: round(p.p99DE), ssim: round(p.ssim) })) }, null, 2) + '\n',
  );
  const manifestPath = join(exampleDir(id), 'example.json');
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  raw.verified = record;
  writeFileSync(manifestPath, JSON.stringify(raw, null, 2) + '\n');
  rmSync(work, { recursive: true, force: true });
  console.log(`  ✓ ${id}: InDesign ${r.version}, ${record.pages} page(s), ΔE mean ${record.fidelity.meanDE} / p99 ${record.fidelity.p99DE}`);
}

function rasters(requested: string[]) {
  const ids = requested.length ? requested : listExamples();
  let n = 0;
  for (const id of ids) {
    const dest = join(exampleDir(id), '_verified');
    const pdf = join(dest, 'indesign.pdf');
    if (readManifest(id).verified?.status !== 'verified') continue;
    if (!existsSync(pdf)) {
      console.error(`  ✗ ${id}: no ${pdf} — run the full verification on this machine`);
      process.exitCode = 1;
      continue;
    }
    n += writeDisplayRasters(pdf, dest);
  }
  console.log(`${n} display page image(s) written at ${DISPLAY_DPI} dpi`);
}

function main() {
  if (!existsSync(ICC)) throw new Error(`FOGRA39 profile not found: ${ICC} (set FOGRA39_ICC)`);
  if (process.argv[2] === '--rasters') return rasters(process.argv.slice(3));
  for (const tool of [INSPECT, DIFF]) if (!existsSync(tool)) throw new Error(`not found: ${tool} (set PAGED_INSPECT / PAGED_DIFF)`);
  const requested = process.argv.slice(2);
  const ids = (requested.length ? requested : listExamples()).filter((id) => {
    const m = readManifest(id);
    if (m.verified?.status === 'not-applicable') {
      if (requested.length) console.log(`  · ${id}: not applicable (${m.verified.reason})`);
      return false;
    }
    return true;
  });
  let failed = 0;
  for (const id of ids) {
    try {
      verify(id, readManifest(id));
    } catch (e) {
      failed++;
      console.error(`  ✗ ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`${ids.length - failed}/${ids.length} example(s) verified`);
  if (failed) process.exit(1);
}

main();
