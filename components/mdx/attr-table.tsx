import type { CSSProperties } from 'react';
import Link from '@/components/site-link';
import { SupportBadge, type SupportStatus } from './support-badge';
import { getIdmlElement, getRefElement, type RefAttribute } from '@/lib/generated';

/**
 * A consistent element-reference table. Two modes:
 *
 *  - Hand-authored: `<AttrTable element="…" rows={[…]} />` — the reference page
 *    declares the rows (names/value domains are facts; `support` is honest status).
 *  - Generated: `<AttrTable element="TextFrame" />` (no `rows`) — the element's
 *    most-used attributes from the element reference (.generated/idml-reference
 *    .json: the corpus census, the engine's typed properties, Paged's importer
 *    and exporter), with a link to the element's full reference page. `limit`
 *    caps the rows (default 10); `attrs` picks specific attributes instead.
 *    Falls back to the engine catalog's curated rows for an element the
 *    reference lacks.
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

export function AttrTable({
  element,
  rows,
  limit = 10,
  attrs,
}: {
  element?: string;
  rows?: AttrRow[];
  limit?: number;
  attrs?: string[];
}) {
  // Generated mode: no rows + a known element → render from the element
  // reference, linking to the full page.
  if (!rows && element) {
    const ref = getRefElement(element);
    if (ref) return <ReferenceAttrTable element={element} slug={ref.slug} attributes={ref.attributes} limit={limit} attrs={attrs} />;
    return <GeneratedAttrTable element={element} />;
  }
  const list = rows ?? [];
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
          {list.map((r) => (
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

function valuesOf(a: RefAttribute): string {
  const members = a.typed?.type?.members;
  if (members?.length) return members.join(' | ');
  if (a.values) return Object.keys(a.values).join(' | ');
  if (a.refKinds?.length) return `${a.refKinds.join(' / ')} reference`;
  const t = a.typed?.type;
  if (t?.kind) return t.unit ? `${t.kind} (${t.unit})` : t.kind;
  return a.types.filter((x) => x !== 'nil' && x !== 'empty').join(' / ') || '—';
}

/** Rows from the element reference: what real documents use, typed, with
 *  Paged's support, linking to the element's full page. */
function ReferenceAttrTable({
  element,
  slug,
  attributes,
  limit,
  attrs,
}: {
  element: string;
  slug: string;
  attributes: RefAttribute[];
  limit: number;
  attrs?: string[];
}) {
  const shown = attrs ? attrs.map((n) => attributes.find((a) => a.name === n)).filter((a): a is RefAttribute => !!a) : attributes.slice(0, limit);
  const showPaged = shown.some((a) => a.paged);
  return (
    <figure className="not-prose" style={{ margin: 'var(--space-5) 0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr>
            <th style={th}>
              Attribute<span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> · {element}</span>
            </th>
            <th style={th}>Values</th>
            {showPaged ? <th style={th}>Paged</th> : null}
            <th style={th}>paged.set</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((a) => (
            <tr key={a.name}>
              <td style={{ ...tdMono, color: 'var(--code-tag)' }}>
                {a.name}
                {a.kind === 'properties-child' ? <div style={{ color: 'var(--color-muted)', fontSize: 11 }}>in Properties</div> : null}
              </td>
              <td style={{ ...tdMono, color: 'var(--color-ink-soft)' }}>{valuesOf(a)}</td>
              {showPaged ? (
                <td style={td}>
                  {a.paged ? [a.paged.imported && 'read', a.paged.exported && 'written'].filter(Boolean).join(' · ') || 'not read' : '—'}
                </td>
              ) : null}
              <td style={td}>
                {a.typed?.path ? (
                  <Link href="/docs/paged/scripting/settable-paths" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {a.typed.path}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 6 }}>
        {attrs ? 'Selected attributes.' : `The ${shown.length} attributes real documents use most.`}{' '}
        <Link href={`/docs/idml/reference/${slug}`}>All {attributes.length} attributes of {element} →</Link>
      </figcaption>
    </figure>
  );
}

/** Generated element table — attributes from the engine catalog, with a live
 *  "Script it" column linking settable attributes to their paged.set path. */
function GeneratedAttrTable({ element }: { element: string }) {
  const el = getIdmlElement(element);
  if (!el) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No generated attribute data for <code>{element}</code>. Run <code>pnpm generate:docs</code> (needs the engine catalog).
      </p>
    );
  }
  return (
    <figure className="not-prose" style={{ margin: 'var(--space-5) 0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr>
            <th style={th}>
              Attribute<span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> · {el.name}</span>
            </th>
            <th style={th}>Type / values</th>
            <th style={th}>Script it</th>
            <th style={th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {el.attributes.map((a) => (
            <tr key={a.name}>
              <td style={{ ...tdMono, color: 'var(--code-tag)' }}>{a.name}</td>
              <td style={{ ...tdMono, color: 'var(--color-ink-soft)' }}>{a.typeHint}</td>
              <td style={td}>
                {a.settablePath ? (
                  <Link href="/docs/paged/scripting/settable-paths" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {a.settablePath}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--color-muted)' }}>read-only</span>
                )}
              </td>
              <td style={td}>{a.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
