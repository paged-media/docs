import type { CSSProperties, ReactNode } from 'react';
import Link from '@/components/site-link';
import { JsonLd } from '@/components/json-ld';
import { getIdmlReference, getRefElement, type RefAttribute, type RefCount, type RefElement } from '@/lib/generated';
import { absoluteUrl } from '@/lib/site';
import { ElementIndexTable, type IndexRow } from './element-index-table';

/**
 * <ElementReference name="TextFrame" /> — one IDML element, entirely from data
 * (scripts/generate/gen-idml-reference.mjs): where it appears in the package,
 * its parents and children, every attribute real documents use with its value
 * vocabulary, what Paged's importer reads and exporter writes, the typed
 * property behind an attribute, and the pages and examples that cover it.
 *
 * <ElementIndex /> lists every element, grouped by the package part it lives in,
 * with a filter over element and attribute names (ElementIndexTable).
 *
 * The tables are `paged-ref-table`: the header row stays in view while a long
 * table scrolls, and on a narrow screen the first column stays put while the
 * rest scrolls sideways (global.css).
 */
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
const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '-0.01em' };
const chip: CSSProperties = {
  ...mono,
  display: 'inline-block',
  margin: '0 4px 4px 0',
  padding: '1px 6px',
  border: '1px solid var(--color-rule)',
  borderRadius: 3,
  fontSize: 11.5,
  background: 'var(--color-paper-soft)',
};
const muted: CSSProperties = { color: 'var(--color-muted)' };

const refHref = (slug: string) => `/docs/idml/reference/${slug}`;

function ElementLink({ c }: { c: RefCount }) {
  const label = <code style={mono}>{c.name}</code>;
  return c.slug ? <Link href={refHref(c.slug)}>{label}</Link> : label;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ margin: 'var(--space-6) 0 0' }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function valueCell(a: RefAttribute): ReactNode {
  const t = a.typed?.type;
  if (t?.members?.length) {
    return (
      <>
        {t.members.map((m) => (
          <span key={m} style={chip}>
            {m}
            {a.values?.[m] ? <span style={muted}> ·{a.values[m]}</span> : null}
          </span>
        ))}
        {t.open ? <span style={muted}> or a named value</span> : null}
      </>
    );
  }
  if (a.values && Object.keys(a.values).length) {
    return Object.entries(a.values)
      .sort((x, y) => y[1] - x[1])
      .map(([v, n]) => (
        <span key={v} style={chip}>
          {v}
          <span style={muted}> ·{n}</span>
        </span>
      ));
  }
  if (a.refKinds?.length) return <span>reference to {a.refKinds.map((k) => <code key={k} style={{ ...mono, marginRight: 6 }}>{k}</code>)}</span>;
  if (t?.kind) return <span style={mono}>{t.kind}{t.unit ? ` (${t.unit})` : ''}</span>;
  if (a.propertyTypes?.length) return <span style={mono}>{a.propertyTypes.join(', ')}</span>;
  const types = a.types.filter((x) => x !== 'nil' && x !== 'empty');
  return types.length ? <span style={mono}>{types.join(' / ')}</span> : <span style={muted}>—</span>;
}

/** Plain text with `code` spans, as the generator keeps them. */
function inlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
      <code key={i} style={{ ...mono, fontSize: 11.5 }}>
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/** Paged's importer / exporter as two marks: read, write — or "not read". */
function pagedCell(a: RefAttribute): ReactNode {
  if (!a.paged) return <span style={muted}>—</span>;
  const { imported, exported } = a.paged;
  if (!imported && !exported) return <span className="paged-io-mark is-none">not read</span>;
  // Read, but from a part documents never keep it in: in InDesign's files the
  // read finds nothing.
  const wrongPart = a.paged.misplaced ? (
    <span
      className="paged-io-mark is-none"
      title={`Paged reads it from ${(a.paged.readParts ?? []).join(', ')}; documents keep it in ${(a.parts ?? []).map((p) => p.part).join(', ')}`}
    >
      wrong part
    </span>
  ) : null;
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {imported ? <span className="paged-io-mark" title="Paged's importer reads it">read</span> : null}
      {wrongPart}
      {exported ? <span className="paged-io-mark" title="Paged's exporter writes it">write</span> : null}
    </span>
  );
}

function AttributeName({ a }: { a: RefAttribute }) {
  const name = (
    <>
      {a.name}
      {a.kind === 'properties-child' ? <div style={{ ...muted, fontSize: 11 }}>in Properties</div> : null}
    </>
  );
  const ex = a.explained;
  if (!ex) return name;
  return (
    <Link
      href={ex.href}
      title={`Explained in ${ex.page}${ex.section ? ` › ${ex.section}` : ''}`}
      style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'var(--color-rule-strong)', textUnderlineOffset: 3 }}
    >
      {name}
    </Link>
  );
}

function AttributeTable({ el, documents }: { el: RefElement; documents: number }) {
  const showPaged = el.attributes.some((a) => a.paged);
  const showPath = el.attributes.some((a) => a.typed?.path);
  return (
    <figure className="not-prose paged-ref-table-wrap" style={{ margin: 'var(--space-4) 0' }}>
      <table className="paged-ref-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={th}>Attribute</th>
            <th style={th}>Values</th>
            <th style={th} title={`Share of the ${documents} documents that use ${el.name} at all`}>
              Seen in
            </th>
            {showPaged ? (
              <th style={th} className="paged-col-paged" title="What Paged's IDML importer reads and its exporter writes">
                Paged
              </th>
            ) : null}
            {showPath ? (
              <th style={th} className="paged-col-paged" title="The typed property a paged.set script call changes">
                paged.set
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {el.attributes.map((a) => (
            <tr key={a.name} id={`attr-${a.name}`}>
              <td style={{ ...td, ...mono, color: 'var(--code-tag)', minWidth: 170 }}>
                <AttributeName a={a} />
                {a.explained?.description ? (
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.45, letterSpacing: 0, color: 'var(--color-ink-soft)', marginTop: 4, maxWidth: '44ch' }}>
                    {inlineCode(a.explained.description)}
                  </div>
                ) : null}
                {a.note ? <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-ink-soft)', marginTop: 4 }}>{a.note}</div> : null}
              </td>
              <td style={td}>{valueCell(a)}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>{Math.round((a.docCount / Math.max(el.docCount, 1)) * 100)}%</td>
              {showPaged ? (
                <td style={{ ...td, whiteSpace: 'nowrap' }} className="paged-col-paged">
                  {pagedCell(a)}
                </td>
              ) : null}
              {showPath ? (
                <td style={td} className="paged-col-paged">
                  {a.typed?.path ? (
                    <Link href="/docs/paged/scripting/settable-paths" style={mono}>
                      {a.typed.path}
                    </Link>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function ElementReference({ name }: { name: string }) {
  const ref = getIdmlReference();
  const el = getRefElement(name);
  if (!el) {
    return (
      <p className="not-prose" style={muted}>
        No reference data for <code>{name}</code>. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  const primary = el.parts[0]?.part;
  const url = absoluteUrl(`/reference/${el.slug}/`);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    name: el.name,
    termCode: el.name,
    url,
    description: el.summary ?? `The ${el.name} element of the IDML file format.`,
    inDefinedTermSet: absoluteUrl('/reference/'),
  };
  return (
    <>
      <JsonLd data={ld} />
      <p>
        {el.summary ? `${el.summary} ` : null}
        <code>{el.name}</code> appears in {el.docCount} of the {ref.documents} documents surveyed ({el.share}%)
        {primary ? (
          <>
            , most often in <code>{primary}</code>
          </>
        ) : null}
        .
        {el.paged ? (
          el.paged.reads ? (
            <> Paged reads {el.paged.attributesRead} of its {el.attributes.length} attributes and writes {el.paged.attributesWritten}.</>
          ) : (
            <> Paged does not read this element yet.</>
          )
        ) : null}
      </p>

      <Section title="Where it appears">
        <ul>
          {el.parts.map((p) => (
            <li key={p.part}>
              <code>{p.part}</code> <span style={muted}>· {p.docCount} documents</span>
            </li>
          ))}
        </ul>
        {el.parents.length ? (
          <p>
            Inside:{' '}
            {el.parents.slice(0, 8).map((c, i) => (
              <span key={c.name}>
                {i ? ', ' : ''}
                <ElementLink c={c} />
              </span>
            ))}
          </p>
        ) : null}
        {el.children.length ? (
          <p>
            Contains:{' '}
            {el.children.slice(0, 16).map((c, i) => (
              <span key={c.name}>
                {i ? ', ' : ''}
                <ElementLink c={c} />
              </span>
            ))}
          </p>
        ) : null}
      </Section>

      {el.pages.length ? (
        <Section title="Explained in">
          <ul>
            {el.pages.map((p) => (
              <li key={p.href}>
                <Link href={p.href}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {el.attributes.length ? (
        <Section title="Attributes">
          <AttributeTable el={el} documents={ref.documents} />
          <p style={{ ...muted, fontSize: 13 }}>
            Values are listed only where real documents use a small, closed set; the number after each is how many
            documents use it. &ldquo;Seen in&rdquo; is the share of documents containing <code>{el.name}</code> that set
            the attribute. An attribute name with a dotted underline links to the section of this reference that
            explains it.
          </p>
        </Section>
      ) : null}

      {el.examples.length ? (
        <Section title="Examples">
          <ul>
            {el.examples.map((x) => (
              <li key={x.id}>{x.title}</li>
            ))}
          </ul>
        </Section>
      ) : null}


      <p style={{ ...muted, fontSize: 12.5, marginTop: 'var(--space-6)' }}>
        Counts come from a survey of {ref.documents} IDML documents ({ref.censusDate}); only aggregate facts are
        published. Paged&rsquo;s support is read from its importer and exporter source, and the typed properties from
        the engine catalog.
      </p>
    </>
  );
}

export function ElementIndex() {
  const ref = getIdmlReference();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': absoluteUrl('/reference/'),
    name: 'IDML element reference',
    hasDefinedTerm: ref.elements.map((el) => ({
      '@type': 'DefinedTerm',
      name: el.name,
      url: absoluteUrl(`/reference/${el.slug}/`),
    })),
  };
  const rows: IndexRow[] = ref.elements.map((el) => ({
    name: el.name,
    href: refHref(el.slug),
    part: el.parts[0]?.part ?? 'Other',
    attributes: el.attributes.map((a) => a.name),
    docCount: el.docCount,
    share: el.share,
    reads: ref.coverage ? (el.paged?.reads ? el.paged.attributesRead : 0) : null,
  }));
  return (
    <>
      <JsonLd data={ld} />
      <p>
        {ref.elements.length} elements, each found in real documents (a survey of {ref.documents}), grouped by the
        package part they most often live in. Type to narrow the list by element or attribute name.
      </p>
      <ElementIndexTable rows={rows} th={th} td={td} />
    </>
  );
}
