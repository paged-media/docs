/**
 * <ConformanceTable /> — the per-feature conformance ladder, generated from the
 * state registry's public conformance projection (`.generated/conformance.json`).
 * Each feature shows how far the corpus harness verifies it: parsed → rendered →
 * mutatable → round-trips. "claimed vs verified" is the registry's honesty axis
 * (outlined = claimed-not-verified; solid = verified).
 *
 *   <ConformanceTable />                  all conformance features, grouped by chapter
 *   <ConformanceTable chapter="tables" /> one chapter
 */
import { getConformance, type ConformanceFeature } from '@/lib/generated';

const LADDER = ['parsed', 'rendered', 'mutatable', 'round-trips'] as const;
const LADDER_TITLE: Record<string, string> = {
  parsed: 'Parsed',
  rendered: 'Rendered',
  mutatable: 'Mutatable',
  'round-trips': 'Round-trips',
};

function mark(f: ConformanceFeature, level: string): { glyph: string; color: string; title: string } {
  const l = f.levels.find((x) => x.level === level);
  if (!l) return { glyph: '', color: 'transparent', title: 'n/a' };
  if (l.verified) return { glyph: '●', color: 'var(--valid)', title: 'verified' };
  if (l.claimed) return { glyph: '○', color: 'var(--warn)', title: 'claimed, not verified' };
  return { glyph: '·', color: 'var(--color-muted)', title: 'not claimed' };
}

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 640,
  letterSpacing: '0.04em',
  color: 'var(--color-muted)',
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-rule)',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)' };

export function ConformanceTable({ chapter }: { chapter?: string }) {
  const { features, sourceCommit } = getConformance();
  const rows = chapter ? features.filter((f) => f.chapter === chapter) : features;
  if (!rows.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No conformance data{chapter ? ` for “${chapter}”` : ''}. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }

  const byChapter = new Map<string, ConformanceFeature[]>();
  for (const f of rows) {
    if (!byChapter.has(f.chapter)) byChapter.set(f.chapter, []);
    byChapter.get(f.chapter)!.push(f);
  }

  return (
    <div className="not-prose">
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>
        <span style={{ color: 'var(--valid)' }}>●</span> verified · <span style={{ color: 'var(--warn)' }}>○</span> claimed, not verified ·{' '}
        <span style={{ color: 'var(--color-muted)' }}>·</span> not claimed · {rows.length} features
        {sourceCommit ? ` · @ ${sourceCommit.slice(0, 8)}` : ''}
      </p>
      {[...byChapter.entries()].map(([ch, feats]) => (
        <div key={ch} style={{ margin: '1rem 0' }}>
          <h3 style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 15, margin: '0 0 2px' }}>{feats[0].chapter}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr>
                  <th style={TH}>Feature</th>
                  {LADDER.map((l) => (
                    <th key={l} style={{ ...TH, textAlign: 'center' }}>
                      {LADDER_TITLE[l]}
                    </th>
                  ))}
                  <th style={{ ...TH, textAlign: 'right' }}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {feats.map((f) => (
                  <tr key={f.id}>
                    <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>{f.title}</td>
                    {LADDER.map((l) => {
                      const m = mark(f, l);
                      return (
                        <td key={l} style={{ ...TD, textAlign: 'center', color: m.color, fontSize: 14 }} title={`${LADDER_TITLE[l]}: ${m.title}`}>
                          {m.glyph}
                        </td>
                      );
                    })}
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>{f.corpusDocs || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
