/**
 * The freshness policies, in one place: the build gates fail on them
 * (scripts/check-freshness.mjs, scripts/check-record-age.mjs), gen-facts dates
 * each fact by them, and the pages show readers the same verdict
 * (components/record-strip.tsx, components/review-line.tsx), so a gate and a
 * page cannot disagree.
 *
 * Plain JavaScript so the Node scripts can import it without a build step.
 */

/** The capability record is not current after this many days (check:record-age, the record strip). */
export const RECORD_MAX_DAYS = 7;
/** A fact read from the record, or from paged's main, goes stale this long after it was observed. */
export const RECORD_FACT_DAYS = 14;
/** A fact from the IDML corpus census goes stale this long after the census ran. */
export const CENSUS_FACT_DAYS = 120;
/** Milliseconds in a day. */
export const DAY_MS = 86_400_000;

/**
 * The review policy for authored pages.
 *
 * A page that declares `describes:` and `reviewed:` is out of date when a
 * feature it describes changed on a later calendar day than `reviewed`. An
 * entry names a registry feature or a whole chapter, which stands for every
 * feature in it. A feature "changed" when its implementation last changed
 * (cockpit's `changed_at`, the support map's `updatedAt`), not when its tests
 * last ran.
 */

/**
 * @typedef {{ id: string, title?: string, chapter: string, updatedAt: string | null }} ReviewFeature
 * @typedef {{ entry: string, featureId: string, title: string | null, changed: string }} StaleEntry
 */

/** `2026-10-11`, a quoted string or a parsed date → the day, `YYYY-MM-DD`. */
export function reviewDay(value) {
  if (value == null || value === '') return null;
  const s = value instanceof Date ? value.toISOString() : String(value);
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

/**
 * Features by chapter, for entries that name a chapter.
 * @param {Record<string, ReviewFeature>} features
 * @returns {Map<string, ReviewFeature[]>}
 */
export function featuresByChapter(features) {
  const byChapter = new Map();
  for (const f of Object.values(features)) {
    if (!byChapter.has(f.chapter)) byChapter.set(f.chapter, []);
    byChapter.get(f.chapter).push(f);
  }
  return byChapter;
}

/**
 * What changed after a page's review.
 * @param {string[]} describes
 * @param {string} reviewed a day, `YYYY-MM-DD`
 * @param {Record<string, ReviewFeature>} features
 * @param {Map<string, ReviewFeature[]>} [byChapter]
 * @returns {{ stale: StaleEntry[], unknown: string[] }}
 *   `stale`: one entry per described id whose newest change is later than the
 *   review; `unknown`: ids that are neither a feature nor a chapter (not checked).
 */
export function reviewState(describes, reviewed, features, byChapter = featuresByChapter(features)) {
  const stale = [];
  const unknown = [];
  const day = reviewDay(reviewed);
  for (const id of describes) {
    const feats = features[id] ? [features[id]] : (byChapter.get(id) ?? []);
    if (!feats.length) {
      unknown.push(id);
      continue;
    }
    // `reviewed` is a day: a change later that same day does not make the page
    // stale, so compare calendar days (ISO dates sort as strings).
    const newest = feats.filter((f) => f.updatedAt).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
    if (newest && day && newest.updatedAt.slice(0, 10) > day) {
      stale.push({ entry: id, featureId: newest.id, title: newest.title ?? null, changed: newest.updatedAt.slice(0, 10) });
    }
  }
  return { stale, unknown };
}
