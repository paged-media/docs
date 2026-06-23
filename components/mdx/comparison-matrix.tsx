/**
 * Comparison cluster components — the matrix, the TL;DR verdicts, and the
 * methodology box. The matrix is a REAL semantic <table> (engines parse and
 * re-serialise tables; never ship it as an image or CSS-grid fake-table). Data
 * comes from lib/comparison-data.ts.
 */
import { DOMAINS, SCALE, SNAPSHOT, TOOLS, VERDICTS, type ToolKey } from '@/lib/comparison-data';

const TOOL_ORDER: ToolKey[] = ['paged', 'indesign', 'quark', 'affinity', 'scribus'];
const NAME: Record<ToolKey, string> = Object.fromEntries(TOOLS.map((t) => [t.key, t.name])) as Record<ToolKey, string>;

const th: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 680,
  padding: '8px 10px',
  borderBottom: '2px solid var(--color-rule)',
  textAlign: 'center',
  verticalAlign: 'bottom',
};
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', textAlign: 'center', verticalAlign: 'top' };
const pagedCol: React.CSSProperties = { background: 'color-mix(in srgb, var(--valid, #2a7) 9%, transparent)' };

/** A 0–3 ordinal shown as a filled dot meter + the number, so it survives greyscale. */
function Meter({ score }: { score: number }) {
  return (
    <span title={`${score} / 3 — ${SCALE[score]?.label ?? ''}`} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
      {'●'.repeat(score)}
      <span style={{ opacity: 0.25 }}>{'●'.repeat(3 - score)}</span>
    </span>
  );
}

export function ComparisonMatrix({ only, differentiatorsOnly }: { only?: ToolKey[]; differentiatorsOnly?: boolean }) {
  const cols = only && only.length ? TOOL_ORDER.filter((k) => only.includes(k)) : TOOL_ORDER;
  const domains = differentiatorsOnly ? DOMAINS.filter((d) => d.kind === 'differentiator') : DOMAINS;
  return (
    <div className="not-prose" style={{ margin: '1.25rem 0' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: cols.length > 3 ? 720 : 460 }}>
          <caption style={{ captionSide: 'top', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 6 }}>
            {differentiatorsOnly ? 'Differentiators' : 'Capability matrix'} · ordinal 0–3 · snapshot {SNAPSHOT}. Rows tagged <strong>baseline</strong> (every serious tool clears it) or <strong>differentiator</strong> (where the field separates).
          </caption>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Capability</th>
              {cols.map((k) => (
                <th key={k} style={{ ...th, ...(k === 'paged' ? pagedCol : {}) }}>{NAME[k]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <DomainRows key={domain.key} domain={domain} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--color-muted)', marginTop: 8 }}>
        Legend: {SCALE.map((s) => `${'●'.repeat(s.score) || '○'} ${s.label}`).join(' · ')}. “planned” = on Paged’s roadmap, not yet shipped (scored honestly, not as present).
      </p>
    </div>
  );
}

function DomainRows({ domain, cols }: { domain: (typeof DOMAINS)[number]; cols: ToolKey[] }) {
  const isDiff = domain.kind === 'differentiator';
  return (
    <>
      <tr>
        <td colSpan={cols.length + 1} style={{ padding: '12px 10px 4px', borderBottom: 'none' }}>
          <span style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 14, fontWeight: 600 }}>{domain.title}</span>{' '}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 9.5,
              fontWeight: 680,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isDiff ? 'var(--valid, #2a7)' : 'var(--color-muted)',
              border: `1px solid ${isDiff ? 'color-mix(in srgb, var(--valid, #2a7) 45%, var(--color-rule))' : 'var(--color-rule)'}`,
              borderRadius: 2,
              padding: '0 5px',
              marginLeft: 6,
              verticalAlign: 'middle',
            }}
          >
            {isDiff ? 'differentiator' : 'baseline'}
          </span>
        </td>
      </tr>
      {domain.rows.map((row) => (
        <tr key={row.dimension}>
          <td style={{ ...td, textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
            {row.dimension}
            {row.note ? <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{row.note}</div> : null}
          </td>
          {cols.map((k) => (
            <td key={k} style={{ ...td, ...(k === 'paged' ? pagedCol : {}) }}>
              <Meter score={row.scores[k]} />
              {k === 'paged' && row.pagedPlanned ? (
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 680, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--warn, #c80)', marginTop: 2 }}>planned</div>
              ) : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** The TL;DR verdict box — one honest sentence per tool. */
export function ComparisonVerdicts() {
  return (
    <aside className="not-prose" style={{ margin: '1.25rem 0', padding: '0.9rem 1.1rem', border: '1px solid var(--color-rule)', borderRadius: 6, background: 'color-mix(in srgb, var(--color-rule) 8%, transparent)' }}>
      <p style={{ margin: '0 0 0.6rem', fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 680, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>TL;DR</p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6 }}>
        {VERDICTS.map((v) => (
          <li key={v.key} style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5 }}>{v.choose}</li>
        ))}
      </ul>
    </aside>
  );
}

/** Methodology + corrections box — transparency materially increases GEO trust. */
export function ComparisonMethodology() {
  return (
    <aside className="not-prose" style={{ margin: '1.25rem 0', padding: '0.8rem 1rem', border: '1px dashed var(--color-rule)', borderRadius: 6, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)' }}>
      <strong style={{ color: 'var(--color-ink, inherit)' }}>Methodology.</strong> Scores are an ordinal 0–3 editorial judgement, not vendor benchmarks — snapshot {SNAPSHOT}.
      “Baseline” rows are capabilities every serious tool clears; “differentiator” rows are where the field actually separates. Paged capabilities that are on the
      roadmap but not yet shipped are marked <em>planned</em> rather than scored as present. Some facts move (Affinity is now free and unified under Canva with a
      proprietary <code>.af</code> format that imports but cannot export IDML; Microsoft Publisher retires in October 2026). Corrections are welcome — open an issue
      on the docs repo.
    </aside>
  );
}
