/**
 * The review line under a page title: when the page's prose was last checked
 * (`reviewed:` in the front matter) and the engine release current that day.
 * When a feature the page `describes:` changed after that review — the policy
 * check:freshness fails the build on (lib/freshness.mjs) — the reader sees a
 * "may be out of date" note naming what changed. The gate stays a gate; this
 * only makes its verdict visible on the page.
 */
import Link from '@/components/site-link';
import { formatDay, releaseOn, releaseUrl } from '@/lib/evidence';
import { reviewDay, reviewState } from '@/lib/freshness.mjs';
import { getSupportMap } from '@/lib/generated';
import { SITE_ID } from '@/lib/site';

/** How many changed features the note names before it summarises the rest. */
const NAMED = 3;

export function ReviewLine({ reviewed, describes }: { reviewed?: unknown; describes?: string[] }) {
  const day = reviewDay(reviewed);
  if (!day) return null;
  const release = releaseOn(day);
  const { stale } = describes?.length ? reviewState(describes, day, getSupportMap().features) : { stale: [] };
  const changes = [...stale].sort((a, b) => (a.changed < b.changed ? 1 : -1));
  const latest = changes[0];
  const named = changes.slice(0, NAMED);
  const more = changes.length - named.length;
  return (
    <div className="not-prose paged-review">
      <p className="paged-review-line">
        Reviewed <time dateTime={day}>{formatDay(day)}</time>
        {release ? (
          <>
            {' '}against engine <a href={releaseUrl(release.tag)}>{release.tag}</a>
          </>
        ) : null}
      </p>
      {latest ? (
        <div className="paged-review-stale" role="note" aria-label="This page may be out of date">
          <p>
            <strong>May be out of date.</strong>{' '}
            {SITE_ID === 'idml' ? "Paged's support for what this page covers" : 'What this page describes'} changed on{' '}
            <time dateTime={latest.changed}>{formatDay(latest.changed)}</time>, after this review:{' '}
            {named.map((c, i) => (
              <span key={c.featureId}>
                {i > 0 ? (i === named.length - 1 && !more ? ' and ' : ', ') : null}
                {c.title ?? c.featureId}
              </span>
            ))}
            {more ? ` and ${more} more` : null}. The{' '}
            <Link href="/docs/paged/state">capability state</Link> shows the current record.
          </p>
        </div>
      ) : null}
    </div>
  );
}
