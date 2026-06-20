#!/usr/bin/env node
/**
 * migrate-badges — one-shot codemod that rewrites inline
 * `<SupportBadge status="…">` into the registry-driven
 * `<SupportBadge feature="chapter.feature">` form, so the badge's status is
 * resolved live from the capability registry instead of being hand-typed.
 *
 * PRECISION-FIRST: these badges are prose annotations (rich `note=` text), so a
 * wrong mapping would mislabel a feature on a public page. The matcher therefore
 * only converts when it is CONFIDENT — a distinctive token of exactly one
 * registry feature IN THE PAGE'S CHAPTER appears in the badge's line/heading
 * context, with a clear margin over the runner-up. Everything else is LEFT AS-IS
 * (legacy status= still renders) and listed for a human to map by hand.
 *
 * The `note=` is preserved (kept as human context); only the status attr is
 * swapped for feature. `compact` is preserved.
 *
 * Usage:
 *   node scripts/migrate-badges.mjs            # dry-run: print the mapping report
 *   node scripts/migrate-badges.mjs --apply    # rewrite confident matches in place
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'docs');
const APPLY = process.argv.includes('--apply');

const support = JSON.parse(readFileSync(join(ROOT, '.generated', 'support-map.json'), 'utf8')).features;

const STOP = new Set(
  'the a an of to in on and or for with without not yet still is are be it its as at by from into over under per via about across only also more most one two each both either any all some this that these those when where which what how its their not no nor but if then than so such can may might will would should must do does done has have had been being page model parser renderer not-yet read into out fall back side text feature features support supported status note core crates src rs'.split(
    /\s+/,
  ),
);

function tokens(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length >= 4 && !STOP.has(t));
}

// Registry index per chapter: id → distinctive token set (from id suffix + title).
const byChapter = new Map();
for (const f of Object.values(support)) {
  const suffix = f.id.split('.').slice(1).join(' ').replace(/[.-]/g, ' ');
  const toks = new Set([...tokens(suffix), ...tokens(f.title)]);
  if (!byChapter.has(f.chapter)) byChapter.set(f.chapter, []);
  byChapter.get(f.chapter).push({ id: f.id, title: f.title, toks });
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const BADGE = /<SupportBadge\b(?![^>]*\bfeature=)([^>]*?)\/?>/g;
const STATUS = /\bstatus=["']([^"']+)["']/;

function chapterOf(file) {
  return relative(CONTENT, file).split('/')[0];
}
function headingsBefore(lines, idx) {
  for (let i = idx; i >= 0; i--) {
    const m = lines[i].match(/^#{1,4}\s+(.*)$/);
    if (m) return m[1];
  }
  return '';
}

/** Score chapter features against a context string; return {best, score, margin}. */
function match(chapter, context) {
  const ctx = new Set(tokens(context));
  const cands = byChapter.get(chapter) ?? [];
  let best = null,
    bestScore = 0,
    second = 0;
  for (const c of cands) {
    let score = 0;
    for (const t of c.toks) if (ctx.has(t)) score += t.length >= 6 ? 2 : 1;
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      best = c;
    } else if (score > second) second = score;
  }
  return { best, score: bestScore, margin: bestScore - second };
}

const report = { converted: [], left: [] };

for (const file of existsSync(CONTENT) ? walk(CONTENT) : []) {
  const chapter = chapterOf(file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let changed = false;

  const out = src.replace(BADGE, (full, attrs, offset) => {
    const statusM = attrs.match(STATUS);
    if (!statusM) return full; // already feature= or malformed; leave
    const lineIdx = src.slice(0, offset).split('\n').length - 1;
    const context = `${lines[lineIdx]} ${headingsBefore(lines, lineIdx)}`.replace(full, '');
    const { best, score, margin } = match(chapter, context);
    const confident = best && score >= 3 && margin >= 2;
    const loc = `${relative(ROOT, file)}:${lineIdx + 1}`;

    if (!confident) {
      report.left.push({ loc, status: statusM[1], best: best?.id ?? null, score, margin });
      return full;
    }
    report.converted.push({ loc, status: statusM[1], feature: best.id, score, margin });
    changed = true;
    // swap status="…" → feature="id", keep the rest of the attrs (note, compact)
    const newAttrs = attrs.replace(STATUS, `feature="${best.id}"`);
    return `<SupportBadge${newAttrs}/>`.replace(/\s+\/>/, ' />');
  });

  if (changed && APPLY) writeFileSync(file, out);
}

console.log(`migrate-badges (${APPLY ? 'APPLY' : 'dry-run'}):`);
console.log(`  confident conversions: ${report.converted.length}`);
console.log(`  left for manual review: ${report.left.length}`);
console.log('\n── confident (chapter feature matched in context) ──');
for (const c of report.converted) console.log(`  ✓ ${c.loc}  ${c.status} → ${c.feature}  (score ${c.score}, margin ${c.margin})`);
console.log('\n── left as legacy status= (no confident match) ──');
for (const l of report.left) console.log(`  · ${l.loc}  status="${l.status}"  best guess: ${l.best ?? '—'} (score ${l.score})`);
if (!APPLY) console.log('\nRe-run with --apply to write the confident conversions.');
