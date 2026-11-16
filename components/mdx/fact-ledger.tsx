/**
 * <FactLedger /> — every figure the docs state about the platform, with where
 * it was read, when its authority produced it, and when it goes stale
 * (`/facts.json`, scripts/generate/facts-schema.md). The status page carries
 * it, so a reader can check any number on either site against its source.
 */
import { formatDay } from '@/lib/evidence';
import { getFacts } from '@/lib/generated';
import { isStale } from './fact';

const CLASS_ORDER = ['record', 'engine', 'source', 'census', 'repo'];
const ISO = /^\d{4}-\d{2}-\d{2}T/;

/** A commit SHA shortened for reading (the link and /facts.json keep it whole); a timestamp as a day. */
function shortRevision(rev: string): string {
  if (/^[0-9a-f]{40}$/.test(rev)) return rev.slice(0, 9);
  return ISO.test(rev) ? formatDay(rev) : rev;
}

export function FactLedger() {
  const { facts, generatedAt } = getFacts();
  const rows = Object.entries(facts).sort(
    ([a, fa], [b, fb]) =>
      CLASS_ORDER.indexOf(fa.class ?? 'repo') - CLASS_ORDER.indexOf(fb.class ?? 'repo') || a.localeCompare(b),
  );
  if (!rows.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No facts in this build. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  const now = Date.now();
  return (
    <>
      <div className="paged-ledger-wrap">
        <table className="paged-ledger">
          <thead>
            <tr>
              <th scope="col">Figure</th>
              <th scope="col">Value</th>
              <th scope="col">Read from</th>
              <th scope="col">Observed</th>
              <th scope="col">Stale after</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([id, f]) => {
              const stale = isStale(f, now);
              return (
                <tr key={id} id={`fact-${id}`}>
                  <td>{f.label}</td>
                  <td className="paged-ledger-value">{ISO.test(f.display) ? formatDay(f.display) : f.display}</td>
                  <td className="paged-ledger-meta">
                    {f.evidence_url ? <a href={f.evidence_url}>{f.source?.authority ?? f.from}</a> : (f.source?.authority ?? f.from ?? '—')}
                    {f.source?.revision ? (
                      <>
                        {' '}
                        <code title={f.source.revision}>{shortRevision(f.source.revision)}</code>
                      </>
                    ) : null}
                  </td>
                  <td>{f.observed_at ? <time dateTime={f.observed_at}>{formatDay(f.observed_at)}</time> : '—'}</td>
                  <td className={stale ? 'is-stale' : undefined}>
                    {f.stale_after ? (
                      <>
                        <time dateTime={f.stale_after}>{formatDay(f.stale_after)}</time>
                        {stale ? ' (passed)' : null}
                      </>
                    ) : f.class === 'engine' ? (
                      'the next release'
                    ) : (
                      'this build'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {generatedAt ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Evaluated when this site was built, {formatDay(generatedAt)}. The same figures, with their sources, are at{' '}
          <a href="/facts.json">/facts.json</a>.
        </p>
      ) : null}
    </>
  );
}
