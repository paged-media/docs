#!/usr/bin/env node
/**
 * gen-activity — normalizes the per-repo commit lists pulled by pull-sources
 * (.generated/sources/activity.json) into `.generated/activity.json`: an
 * interleaved cross-repo timeline plus a per-repo index, for the <ActivityFeed>
 * and <RepoActivity> components.
 *
 * This is the "current state of the app" feed — what changed, where, recently,
 * across all repos. Refreshed every build/nightly, so it's always live.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'activity.json');
const GEN = join(ROOT, '.generated');
const TIMELINE_MAX = 80;

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const perRepo = readJSON(SRC) ?? {};
mkdirSync(GEN, { recursive: true });

const timeline = [];
const summary = [];
for (const [repo, commits] of Object.entries(perRepo)) {
  for (const c of commits) timeline.push({ repo, ...c });
  summary.push({ repo, count: commits.length, latest: commits[0]?.date ?? null, latestMessage: commits[0]?.message ?? null });
}
// Sort by ISO date desc (string compare works for ISO 8601).
timeline.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
summary.sort((a, b) => ((a.latest ?? '') < (b.latest ?? '') ? 1 : -1));

writeFileSync(
  join(GEN, 'activity.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repoCount: Object.keys(perRepo).length,
      timeline: timeline.slice(0, TIMELINE_MAX),
      perRepo,
      summary,
    },
    null,
    2,
  ),
);

console.log(`gen-activity: ${timeline.length} commits across ${Object.keys(perRepo).length} repos → activity.json (timeline capped ${TIMELINE_MAX})`);
