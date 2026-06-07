#!/usr/bin/env node
/**
 * Support-badge ↔ renderer-gaps drift check (CI gate).
 *
 * WHY THIS EXISTS
 * ---------------
 * Every IDML feature this site documents carries a <SupportBadge> stating how
 * far the Paged renderer handles it (`supported` / `parsed-not-rendered` /
 * `not-yet-parsed`). Those badges are the public honesty signal; internally the
 * same truth lives in the engine's renderer-gaps list. The two used to drift —
 * a feature would land in the engine, the gaps list would be updated, but a
 * public badge would keep claiming a stale level (or, worse, overclaim support).
 * Nothing mechanical kept them aligned. This script is that mechanism.
 *
 * THE INVARIANT (kept deliberately simple so it actually catches drift)
 * ---------------------------------------------------------------------
 * The canonical machine-readable feature table is the capabilities matrix
 * (`content/docs/the-renderer/capabilities-matrix.mdx`) — the one page that is
 * already a structured feature→status grid and the public summary readers cite.
 * We enforce three things:
 *
 *   (a) MATRIX ⇔ MANIFEST. Every row of the capabilities matrix must appear in
 *       `badge-manifest.json` with the SAME status, and every manifest entry
 *       must appear in the matrix. So a badge flipped on the matrix without
 *       updating the manifest (or vice-versa) fails the build. The manifest is
 *       the reviewed checkpoint; the matrix is the rendered claim.
 *
 *   (b) MANIFEST ⇔ GAPS SNAPSHOT (freshness gate). `gaps-snapshot.json` is a
 *       hand-distilled mirror of the engine's renderer-gaps "Landed" list
 *       (feature-id → level), vendored here so the public repo stands alone.
 *       Whenever a manifest status DISAGREES with the snapshot, the manifest's
 *       top-level `reviewed` date must be no older than MAX_REVIEW_AGE_DAYS —
 *       forcing a human to re-check the public claim against the internal truth
 *       before the disagreement is allowed to ship. (Agreement needs no recent
 *       review; only a divergence starts the clock.)
 *
 *   (c) STATUS SANITY. Every <SupportBadge status="…"> anywhere in the MDX
 *       content must use a known status value — a cheap typo guard across all
 *       ~160 inline badges, not just the matrix.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not try to machine-verify every free-prose inline badge note against
 * the engine — that is the human's job in the truth pass. The matrix is the
 * contract surface; the inline badges are prose that the matrix summarises.
 *
 * Run: `node scripts/check-support-badges.mjs` (or `pnpm check:badges`).
 * Exit non-zero on any violation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'docs');
const MATRIX = join(CONTENT, 'the-renderer', 'capabilities-matrix.mdx');
const MANIFEST = join(ROOT, 'badge-manifest.json');
const SNAPSHOT = join(ROOT, 'gaps-snapshot.json');

const STATUSES = new Set(['supported', 'parsed-not-rendered', 'not-yet-parsed']);
const MAX_REVIEW_AGE_DAYS = 45;

const problems = [];
const fail = (m) => problems.push(m);

/** Recursively list every .mdx under a directory. */
function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    out = out.concat(statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : []);
  }
  return out;
}

/** (c) STATUS SANITY — every badge in every page uses a known status. */
function checkStatusSanity() {
  const re = /<SupportBadge\s+([^>]*?)\/?>/g;
  const stRe = /status=["']([a-z-]+)["']/;
  let count = 0;
  for (const f of walk(CONTENT)) {
    const text = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(text))) {
      count++;
      const st = (m[1].match(stRe) || [])[1];
      if (!st) fail(`${rel(f)}: a <SupportBadge> is missing a status`);
      else if (!STATUSES.has(st)) fail(`${rel(f)}: unknown badge status "${st}"`);
    }
  }
  return count;
}

/** Parse the capabilities matrix into [{ feature, status }]. */
function parseMatrix() {
  const text = readFileSync(MATRIX, 'utf8');
  const rowRe = /^\|\s*(.+?)\s*\|\s*<SupportBadge status="([a-z-]+)" compact \/>.*?\|/gm;
  const rows = [];
  let m;
  while ((m = rowRe.exec(text))) rows.push({ feature: m[1].trim(), status: m[2] });
  return rows;
}

/** (a) MATRIX ⇔ MANIFEST. */
function checkMatrixManifest(manifest) {
  const matrix = parseMatrix();
  const byFeature = new Map(manifest.features.map((e) => [e.feature, e]));
  const seen = new Set();

  for (const row of matrix) {
    const entry = byFeature.get(row.feature);
    if (!entry) {
      fail(`matrix row "${row.feature}" has no badge-manifest entry — add it to badge-manifest.json`);
      continue;
    }
    seen.add(row.feature);
    if (entry.status !== row.status) {
      fail(
        `status drift for "${row.feature}": matrix says "${row.status}", ` +
          `manifest says "${entry.status}" — flip one to match (and re-review the claim)`,
      );
    }
  }
  for (const entry of manifest.features) {
    if (!seen.has(entry.feature)) {
      fail(`manifest feature "${entry.feature}" is not present in the capabilities matrix`);
    }
    if (!STATUSES.has(entry.status)) fail(`manifest feature "${entry.feature}" has unknown status "${entry.status}"`);
    if (!entry.id) fail(`manifest feature "${entry.feature}" is missing a stable id`);
  }
  return matrix.length;
}

/** (b) MANIFEST ⇔ GAPS SNAPSHOT freshness gate. */
function checkSnapshotFreshness(manifest, snapshot) {
  const reviewed = Date.parse(manifest.reviewed);
  if (Number.isNaN(reviewed)) {
    fail(`badge-manifest.json: "reviewed" is not a valid ISO date ("${manifest.reviewed}")`);
    return;
  }
  const ageDays = (Date.now() - reviewed) / 86_400_000;
  const snap = new Map(Object.entries(snapshot.levels));
  const disagreements = [];

  for (const entry of manifest.features) {
    const expected = snap.get(entry.id);
    if (expected === undefined) continue; // not every public feature is tracked in the gaps list
    if (expected !== entry.status) disagreements.push(`${entry.id}: manifest "${entry.status}" vs gaps "${expected}"`);
  }

  if (disagreements.length > 0 && ageDays > MAX_REVIEW_AGE_DAYS) {
    fail(
      `badge-manifest.json disagrees with gaps-snapshot.json on ${disagreements.length} ` +
        `feature(s) and "reviewed" (${manifest.reviewed}) is ${Math.round(ageDays)}d old ` +
        `(> ${MAX_REVIEW_AGE_DAYS}d). Re-check the public badges against the engine, then ` +
        `bump "reviewed". Disagreements:\n    - ${disagreements.join('\n    - ')}`,
    );
  } else if (disagreements.length > 0) {
    // Within the review window: surfaced as a notice, not a failure.
    console.log(
      `note: ${disagreements.length} manifest/gaps disagreement(s) within the review window ` +
        `(reviewed ${manifest.reviewed}):`,
    );
    for (const d of disagreements) console.log(`  · ${d}`);
  }
}

const rel = (f) => f.replace(ROOT + '/', '');

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));

  const badgeCount = checkStatusSanity();
  const matrixCount = checkMatrixManifest(manifest);
  checkSnapshotFreshness(manifest, snapshot);

  if (problems.length > 0) {
    console.error(`\nSupport-badge drift check FAILED (${problems.length} problem(s)):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(
    `Support-badge drift check OK — ${matrixCount} matrix rows match the manifest; ` +
      `${badgeCount} inline badge(s) carry a valid status.`,
  );
}

main();
