'use client';

import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react';
import Link from '@/components/site-link';

/**
 * The element index as a lookup: one table per package part (the part an
 * element most often lives in), a jump list to the parts, and a filter over
 * element AND attribute names — typing `StrokeWeight` lists every element that
 * carries it. Rows come from the server (<ElementIndex />, element-reference.tsx).
 */
export interface IndexRow {
  name: string;
  href: string;
  part: string;
  attributes: string[];
  docCount: number;
  share: number;
}

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '-0.01em' };
// The format reference's own table chrome: sentence-case headers over an ink
// rule, fine rules between rows. Paged's support is not a column here; each
// entry carries it in its own panel (ADR 809).
const th: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12.5,
  fontWeight: 640,
  textAlign: 'left',
  borderBottom: '1px solid var(--color-ink)',
  padding: '10px 8px 8px',
  color: 'var(--color-ink)',
  whiteSpace: 'nowrap',
};
const td: CSSProperties = {
  borderBottom: '1px solid var(--color-rule)',
  padding: '9px 8px',
  verticalAlign: 'top',
  fontFamily: 'var(--font-sans)',
  fontSize: 13.5,
  color: 'var(--color-ink-soft)',
};
const partId = (part: string) => `part-${part.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function ElementIndexTable({ rows }: { rows: IndexRow[] }) {
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim().toLowerCase());

  const groups = useMemo(() => {
    const byPart = new Map<string, { row: IndexRow; via: string | null }[]>();
    for (const row of rows) {
      let via: string | null = null;
      if (q) {
        if (!row.name.toLowerCase().includes(q)) {
          via = row.attributes.find((a) => a.toLowerCase().includes(q)) ?? null;
          if (!via) continue;
        }
      }
      if (!byPart.has(row.part)) byPart.set(row.part, []);
      byPart.get(row.part)!.push({ row, via });
    }
    // Largest part first, as the sidebar groups them; rows by how common they are.
    const all = new Map<string, number>();
    for (const r of rows) all.set(r.part, (all.get(r.part) ?? 0) + 1);
    return [...byPart]
      .sort((a, b) => (all.get(b[0]) ?? 0) - (all.get(a[0]) ?? 0) || a[0].localeCompare(b[0]))
      .map(([part, items]) => ({ part, items: items.sort((a, b) => b.row.docCount - a.row.docCount) }));
  }, [rows, q]);

  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="not-prose">
      <div className="paged-index-filter">
        <label htmlFor="element-filter" className="section-label" style={{ display: 'block', marginBottom: 8 }}>
          Find an element or attribute
        </label>
        <input
          id="element-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. TextFrame, Swatch, StrokeWeight"
          autoComplete="off"
          spellCheck={false}
        />
        <p role="status" style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-muted)' }}>
          {q ? `${count} of ${rows.length} elements match “${query.trim()}”` : `${rows.length} elements in ${groups.length} parts`}
        </p>
        {!q ? (
          <nav aria-label="Package parts" className="paged-index-jump">
            {groups.map((g) => (
              <a key={g.part} href={`#${partId(g.part)}`}>
                {g.part} <span>{g.items.length}</span>
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {groups.map((g) => (
        <section key={g.part} id={partId(g.part)} style={{ scrollMarginTop: 24 }}>
          <h2 className="paged-index-part">{g.part}</h2>
          <figure className="paged-ref-table-wrap" style={{ margin: 'var(--space-3) 0' }}>
            <table className="paged-ref-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '64%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={th}>Element</th>
                  <th style={th}>Attributes</th>
                  <th style={th} title="Share of the census's documents that contain the element">
                    Seen in
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.items.map(({ row, via }) => (
                  <tr key={row.name}>
                    <td style={td}>
                      <Link href={row.href} className="paged-element-link">
                        <code style={mono}>{row.name}</code>
                      </Link>
                      {via ? (
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                          has <code style={{ ...mono, fontSize: 11.5 }}>{via}</code>
                        </div>
                      ) : null}
                    </td>
                    <td style={td}>{row.attributes.length}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{row.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        </section>
      ))}
      {q && count === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-ink-soft)' }}>
          No element or attribute in the reference has that name. Search the whole reference with ⌘K.
        </p>
      ) : null}
    </div>
  );
}
