/**
 * <Fact id="sheet.functions" /> — a number or licence about the platform, read
 * from `.generated/facts.json` (gen-facts.mjs evaluates data/facts.json against
 * the pulled sources). Pages never type these by hand; check:facts enforces it.
 * An unknown id renders a visible marker rather than a plausible-looking number.
 *
 * Each fact carries its provenance (scripts/generate/facts-schema.md): the
 * authority and revision it was read from and when that authority produced
 * it. The figure shows them as its title and, for screen readers, as text; a
 * fact past its `stale_after` date when the page was built says when it was
 * true ("as of …"). <FactLedger /> lists every fact with its provenance.
 */
import { formatDay } from '@/lib/evidence';
import { getFacts, type Fact as FactRecord } from '@/lib/generated';

/** "engine release v0.77.0, 28 Oct 2026" — where the figure comes from, in a phrase. */
export function provenance(f: FactRecord): string {
  const src = f.source ? [f.source.authority, f.source.revision].filter(Boolean).join(' ') : f.from;
  const when = f.observed_at ? formatDay(f.observed_at) : null;
  return [src, when].filter(Boolean).join(', ');
}

/** Past its stale_after date at `now` (the build, for a static page). */
export function isStale(f: FactRecord, now: number = Date.now()): boolean {
  return !!f.stale_after && Date.parse(f.stale_after) < now;
}

export function Fact({ id }: { id: string }) {
  const f = getFacts().facts[id];
  if (!f) {
    return (
      <span title={`unknown fact ${id} — run pnpm generate:docs`} style={{ color: 'var(--warn)' }}>
        [{id}]
      </span>
    );
  }
  const from = provenance(f);
  const stale = isStale(f);
  return (
    <span className="paged-fact" title={`${f.label}${from ? ` — ${from}` : ''}`}>
      {f.display}
      {from ? <span className="sr-only"> ({`${f.label}: ${from}`})</span> : null}
      {stale && f.observed_at ? <span className="paged-fact-asof"> (as of {formatDay(f.observed_at)})</span> : null}
    </span>
  );
}
