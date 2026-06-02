import type { CSSProperties } from 'react';
import { SupportBadge, type SupportStatus } from './support-badge';

/**
 * A consistent element-reference table. A reference page declares an element's
 * attributes once as `rows`; names and value domains are facts (verified against
 * the spec's element reference), and `support` is the renderer's honest status.
 *
 * Editorial styling (brand ReferenceTable): a 2px ink header rule, uppercase
 * IBM Plex Sans column labels, hairline row dividers, and a mono first column in
 * the code-tag color — no heavy borders, no zebra fill.
 */
export interface AttrRow {
  /** Attribute name, exactly as it appears in IDML (a fact). */
  attr: string;
  /** Type / allowed values (a fact). */
  type: string;
  /** Renderer support for this attribute (omit if not meaningful per-attribute). */
  support?: SupportStatus;
  /** Short clean-room note: what it means / how we treat it. */
  note?: string;
}

const th: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
  textAlign: 'left',
  borderBottom: '2px solid var(--color-ink)',
  padding: '10px 8px',
  color: 'var(--color-ink)',
};
const td: CSSProperties = {
  borderBottom: '1px solid var(--color-rule)',
  padding: '11px 8px',
  verticalAlign: 'top',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--color-ink-soft)',
};
const tdMono: CSSProperties = {
  ...td,
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  letterSpacing: '-0.01em',
};

export function AttrTable({ element, rows }: { element?: string; rows: AttrRow[] }) {
  return (
    <figure className="not-prose" style={{ margin: 'var(--space-5) 0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr>
            <th style={th}>
              Attribute
              {element ? <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> · {element}</span> : null}
            </th>
            <th style={th}>Type / values</th>
            <th style={th}>Support</th>
            <th style={th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.attr}>
              <td style={{ ...tdMono, color: 'var(--code-tag)' }}>{r.attr}</td>
              <td style={{ ...tdMono, color: 'var(--color-ink-soft)' }}>{r.type}</td>
              <td style={td}>{r.support ? <SupportBadge status={r.support} compact /> : '—'}</td>
              <td style={td}>{r.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
