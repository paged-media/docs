/**
 * The record strip at the top of every page of both sites: which engine
 * release the docs describe (`core.pin`), the date of the capability record the
 * pages were built from, and the way to the status page. A record older than
 * RECORD_MAX_DAYS when the page was built says so ("…, not current"), and
 * <RecordAge> repeats that check in the reader's browser, so a page served long
 * after its deploy never shows an old record as current. Without JavaScript the
 * strip still reads correctly as of the build.
 */
import { formatDay, recordState, releaseUrl } from '@/lib/evidence';
import { RECORD_MAX_DAYS } from '@/lib/freshness.mjs';
import { resolveHref, SITE_ID } from '@/lib/site';
import { RecordAge } from './record-age';

/** A label in full, and shortened for a phone (app/editorial.css shows one). */
function Label({ long, short }: { long: string; short: string }) {
  return (
    <span className="paged-strip-label">
      <span className="paged-strip-long">{long}</span>
      <span className="paged-strip-short">{short}</span>
    </span>
  );
}

const WORDS = {
  paged: {
    engine: ['Documents engine', 'Engine'],
    record: ['Capability record of', 'Record of'],
    status: ['Capability state', 'Status'],
  },
  idml: {
    engine: ['Examples validated with Paged engine', 'Paged engine'],
    record: ["Paged's capability record of", 'Record of'],
    status: ['Paged support status', 'Status'],
  },
} as const;

export function RecordStrip() {
  const { engine, recordAt, stale } = recordState();
  const w = WORDS[SITE_ID];
  return (
    <aside aria-label="Engine release and capability record" className="paged-strip">
      <div className="paged-strip-inner">
        {engine ? (
          <span className="paged-strip-item">
            <Label long={w.engine[0]} short={w.engine[1]} />{' '}
            <a className="paged-strip-value" href={releaseUrl(engine)}>
              {engine}
            </a>
          </span>
        ) : null}
        <span className="paged-strip-item">
          {recordAt ? (
            <RecordAge at={recordAt} maxDays={RECORD_MAX_DAYS} staleAtBuild={stale}>
              <Label long={w.record[0]} short={w.record[1]} />{' '}
              <time className="paged-strip-value" dateTime={recordAt}>
                {formatDay(recordAt)}
              </time>
            </RecordAge>
          ) : (
            <span className="paged-strip-stale">No capability record in this build</span>
          )}
        </span>
        <a className="paged-strip-item paged-strip-link" href={resolveHref('/docs/paged/state')}>
          <span className="paged-strip-long">{w.status[0]}</span>
          <span className="paged-strip-short">{w.status[1]}</span>
        </a>
        {SITE_ID === 'paged' ? (
          <span className="paged-strip-note">Written in the open, updated as the engine moves</span>
        ) : null}
      </div>
    </aside>
  );
}
