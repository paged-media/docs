import type { ReactNode } from 'react';
import Link from '@/components/site-link';
import { JsonLd } from '@/components/json-ld';
import {
  getIdmlReference,
  getRefElement,
  getSupportFeature,
  type IdmlReference,
  type RefAttribute,
  type RefCount,
  type RefElement,
  type RefExample,
  type RefSource,
} from '@/lib/generated';
import { absoluteUrl } from '@/lib/site';
import { ElementIndexTable, type IndexRow } from './element-index-table';
import s from './element-reference.module.css';

/**
 * <ElementReference name="TextFrame" section="…" /> — one IDML element as an
 * atlas entry, entirely from data (scripts/generate/gen-idml-reference.mjs).
 * The generated page writes the entry's headings (so each section has an
 * anchor, a permalink and a place in the page's contents) and one call per
 * section, in the entry's order:
 *
 *   definition     what the element is, where it lives, how common it is
 *   relationships  the elements that hold it and the ones it holds
 *   attributes     format facts only: type, values, default, frequency
 *   visualization  a verified example's page, as InDesign exports it
 *   behavior       the examples that show the element at work
 *   evidence       the census behind the counts, and the InDesign checks
 *   support        Paged support: parse, render, edit and write, apart from
 *                  the reference and dated by the records it reflects
 *
 * The reference above `support` says nothing about Paged (ADR 809).
 *
 * <ElementIndex /> lists every entry, grouped by the package part it lives
 * in, with a filter over element and attribute names (ElementIndexTable).
 * <CensusMethod /> states what the census measured and how the entries were
 * chosen, from the same data.
 */
export type EntrySection = 'definition' | 'relationships' | 'attributes' | 'visualization' | 'behavior' | 'evidence' | 'support';

const refHref = (slug: string) => `/docs/idml/reference/${slug}`;
const CENSUS_HREF = '/docs/idml/meta/census';
const MATRIX_HREF = '/docs/paged/state/matrix';
const PATHS_HREF = '/docs/paged/scripting/settable-paths';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);

function ElementLink({ c }: { c: RefCount }) {
  const label = <code>{c.name}</code>;
  return c.slug ? <Link href={refHref(c.slug)}>{label}</Link> : label;
}

/** Plain text with `code` spans, as the generator keeps them. */
function withCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

/** "A, B and C" */
function series(items: ReactNode[]): ReactNode {
  return items.map((item, i) => (
    <span key={i}>
      {i === 0 ? '' : i === items.length - 1 ? ' and ' : ', '}
      {item}
    </span>
  ));
}

function censusLine(book: IdmlReference): string {
  return `census of ${book.censusDate}, ${book.documents} documents`;
}

// ── Definition ──────────────────────────────────────────────────────────────

function Definition({ el, book }: { el: RefElement; book: IdmlReference }) {
  const url = absoluteUrl(`/reference/${el.slug}/`);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    name: el.name,
    termCode: el.name,
    url,
    description: el.summary?.replace(/`/g, '') ?? `The ${el.name} element of the IDML file format.`,
    inDefinedTermSet: absoluteUrl('/reference/'),
  };
  return (
    <div className="not-prose">
      <JsonLd data={ld} />
      <p className={s.lede}>
        {el.summary ? (
          withCode(el.summary)
        ) : (
          <>
            No reviewed definition yet. What follows is what real documents show of <code>{el.name}</code>.
          </>
        )}
      </p>
      <dl className={s.facts}>
        <dt>Lives in</dt>
        <dd>
          {series(
            el.parts.map((p) => (
              <>
                <code>{p.part}</code> <span className={s.count}>{p.docCount}</span>
              </>
            )),
          )}
        </dd>
        <dt>Frequency</dt>
        <dd>
          In {el.docCount} of the {book.documents} documents of the{' '}
          <Link href={CENSUS_HREF}>census</Link> ({el.share}%), {book.censusDate}
        </dd>
        <dt>Attributes</dt>
        <dd>
          {el.attributes.length ? (
            <>
              <a href="#attributes">{el.attributes.length} observed</a>
              {el.attributes.some((a) => (a.nonModalDocs ?? 0) > 0) ? (
                <>, {el.attributes.filter((a) => (a.nonModalDocs ?? 0) > 0).length} of them vary between documents</>
              ) : null}
            </>
          ) : (
            'None observed'
          )}
        </dd>
        {el.pages.length ? (
          <>
            <dt>Discussed in</dt>
            <dd>
              {series(
                el.pages.map((p) => (
                  <Link key={p.href} href={p.href}>
                    {p.title}
                  </Link>
                )),
              )}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

// ── Structure: relationships ──────────────────────────────────────────────────

const PLATE_IN = 8;
const PLATE_OUT = 12;

function PlateColumn({ items, max, className }: { items: RefCount[]; max: number; className?: string }) {
  return (
    <ul className={`${s.plateCol} ${className ?? ''}`}>
      {items.slice(0, max).map((c) => (
        <li key={c.name}>
          <ElementLink c={c} />
          <span className={s.count}>{c.docCount}</span>
        </li>
      ))}
      {items.length > max ? <li className={s.plateMore}>and {items.length - max} more</li> : null}
    </ul>
  );
}

function Relationships({ el, book }: { el: RefElement; book: IdmlReference }) {
  if (!el.parents.length && !el.children.length) {
    return <p>No element holds {el.name} in the census, and it holds none.</p>;
  }
  return (
    <figure className={`not-prose ${s.plate}`}>
      <div className={s.plateGrid}>
        <div>
          <p className={`${s.plateHead} ${s.plateIn}`}>Inside</p>
          {el.parents.length ? <PlateColumn items={el.parents} max={PLATE_IN} className={s.plateIn} /> : <p className={`${s.plateMore} ${s.plateIn}`}>a part&rsquo;s root</p>}
        </div>
        <div className={`${s.plateWord} ${el.parents.length ? '' : s.noIn} ${el.children.length ? '' : s.noOut}`}>{el.name}</div>
        <div>
          <p className={s.plateHead}>Contains</p>
          {el.children.length ? <PlateColumn items={el.children} max={PLATE_OUT} /> : <p className={s.plateMore}>no elements</p>}
        </div>
      </div>
      <figcaption className={s.caption}>
        Where <code>{el.name}</code> sits: the elements that hold it, and the elements it holds. Each number is the
        documents that show the pairing ({censusLine(book)}).
      </figcaption>
    </figure>
  );
}

// ── Structure: attributes (format facts only) ──────────────────────────────────

const TYPE_WORDS: Record<string, string> = {
  'number-list': 'list of numbers',
  enum: 'keyword',
  bool: 'boolean',
  boolean: 'boolean',
  number: 'number',
  integer: 'integer',
  string: 'text',
  reference: 'reference',
  'reference-list': 'list of references',
};

function typeCell(a: RefAttribute, slugs: Map<string, string>): ReactNode {
  if (a.refKinds?.length) {
    return (
      <>
        reference to{' '}
        {series(
          a.refKinds.map((k) => {
            const slug = slugs.get(k);
            return slug ? (
              <Link key={k} href={refHref(slug)} className={s.mono}>
                {k}
              </Link>
            ) : (
              <code key={k} className={s.mono}>
                {k}
              </code>
            );
          }),
        )}
      </>
    );
  }
  if (a.propertyTypes?.length) return <span className={s.mono}>{a.propertyTypes.join(', ')}</span>;
  const types = a.types.filter((x) => x !== 'nil' && x !== 'empty').map((t) => TYPE_WORDS[t] ?? t.replace(/-/g, ' '));
  const unit = a.typed?.type?.unit;
  if (!types.length) return <span className={s.muted}>&mdash;</span>;
  return (
    <>
      {types.join(' or ')}
      {unit ? <span className={s.muted}> ({unit})</span> : null}
    </>
  );
}

function valuesCell(a: RefAttribute): ReactNode {
  const members = a.typed?.type?.members;
  if (members?.length) {
    return (
      <>
        {members.map((m) => (
          <span key={m} className={s.value}>
            {m}
            {a.values?.[m] ? <span className={s.count}>{a.values[m]}</span> : null}
          </span>
        ))}
        {a.typed?.type?.open ? <span className={s.muted}> or a named value</span> : null}
      </>
    );
  }
  if (a.values && Object.keys(a.values).length) {
    return Object.entries(a.values)
      .sort((x, y) => y[1] - x[1])
      .map(([v, n]) => (
        <span key={v} className={s.value}>
          {v}
          <span className={s.count}>{n}</span>
        </span>
      ));
  }
  const r = a.typed?.range;
  if (r && (r.min != null || r.max != null)) {
    return (
      <span className={s.num}>
        {r.min != null && r.max != null ? `${r.min} to ${r.max}` : r.min != null ? `${r.min} or more` : `up to ${r.max}`}
      </span>
    );
  }
  return <span className={s.muted}>any</span>;
}

function defaultCell(a: RefAttribute): ReactNode {
  const d = a.typed?.default;
  if (d === null || d === undefined || typeof d === 'object') return <span className={s.muted}>&mdash;</span>;
  return <code className={s.mono}>{String(d)}</code>;
}

function AttributeName({ a }: { a: RefAttribute }) {
  const name = (
    <>
      {a.name}
      {a.kind === 'properties-child' ? <div className={s.gloss}>a child of Properties</div> : null}
    </>
  );
  const ex = a.explained;
  if (!ex) return name;
  return (
    <Link href={ex.href} className={s.explained} title={`Explained in ${ex.page}${ex.section ? `, ${ex.section}` : ''}`}>
      {name}
    </Link>
  );
}

function Attributes({ el, book }: { el: RefElement; book: IdmlReference }) {
  if (!el.attributes.length) return <p>Documents in the census set no attributes on {el.name}.</p>;
  const slugs = new Map(book.elements.map((e) => [e.name, e.slug]));
  const showDefault = el.attributes.some((a) => a.typed?.default != null && typeof a.typed.default !== 'object');
  return (
    <figure
      className="not-prose paged-ref-table-wrap"
      style={{ margin: 'var(--space-3) 0 var(--space-5)' }}
      // On a phone the table scrolls sideways (app/global.css): a named region a keyboard can reach.
      role="region"
      aria-label={`Attributes of ${el.name} (table)`}
      tabIndex={0}
    >
      <table className={`paged-ref-table ${s.table}`}>
        <thead>
          <tr>
            <th scope="col">Attribute</th>
            <th scope="col">Type</th>
            <th scope="col">Values</th>
            {showDefault ? <th scope="col">Default</th> : null}
            <th scope="col">Seen in</th>
          </tr>
        </thead>
        <tbody>
          {el.attributes.map((a) => (
            <tr key={a.name} id={`attr-${a.name}`}>
              <td className={s.name}>
                <AttributeName a={a} />
                <a href={`#attr-${a.name}`} className={s.permalink} aria-label={`Link to ${a.name}`}>
                  #
                </a>
                {/* Glosses stay in the cell beside their attribute: <Sidenote> is for running prose, not table rows. */}
                {a.explained?.description ? <div className={s.gloss}>{withCode(a.explained.description)}</div> : null}
                {a.note ? <div className={s.gloss}>{withCode(a.note)}</div> : null}
              </td>
              <td>{typeCell(a, slugs)}</td>
              <td>{valuesCell(a)}</td>
              {showDefault ? <td>{defaultCell(a)}</td> : null}
              <td className={s.num}>
                {pct(a.docCount, el.docCount)}%
                {a.nonModalDocs ? <div className={s.count}>varies in {a.nonModalDocs}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className={s.caption}>
        The attributes documents set on <code>{el.name}</code> ({censusLine(book)}). <em>Seen in</em> is the share of
        the {el.docCount} documents with a <code>{el.name}</code> that set the attribute; <em>varies in</em> counts
        those that hold a value other than the most common one. Values are listed, with the documents using each,
        only where documents use a small closed set. A name with a dotted underline links to the chapter that
        explains it. <Link href={CENSUS_HREF}>How the census counts</Link>.
      </figcaption>
    </figure>
  );
}

// ── Visualization ───────────────────────────────────────────────────────────

function Visualization({ el }: { el: RefElement }) {
  const x = el.examples.find((e) => e.raster);
  if (!x?.raster) return null;
  const v = x.verified;
  return (
    <figure className={`not-prose ${s.specimen}`}>
      <div className={s.stock}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export; the raster is the evidence, not a decoration */}
        <img
          className={s.sheet}
          src={x.raster.src}
          srcSet={x.raster.src3x ? `${x.raster.src} 1x, ${x.raster.src3x} 3x` : undefined}
          width={x.raster.width}
          height={x.raster.height}
          loading="lazy"
          decoding="async"
          alt={`Page 1 of the example “${x.title}”, as InDesign exports it.`}
        />
      </div>
      <figcaption className={s.caption}>
        <code>{el.name}</code> in the example &ldquo;{x.title}&rdquo;, page 1
        {v?.indesignVersion ? <>, as InDesign {v.indesignVersion} exports it (checked {v.verifiedAt})</> : null}.
        {x.href ? (
          <>
            {' '}
            The example, with its source, is in <Link href={x.href}>{x.page}</Link>.
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

// ── Behavior ────────────────────────────────────────────────────────────────

function Behavior({ el }: { el: RefElement }) {
  if (!el.examples.length) return null;
  return (
    <ul className={`not-prose ${s.entries}`}>
      {el.examples.map((x) => (
        <li key={x.id} id={`example-${x.id}`}>
          <div className={s.entryTitle}>{x.href ? <Link href={x.href}>{x.title}</Link> : x.title}</div>
          {x.concept ? <p className={s.entryText}>{withCode(x.concept)}</p> : null}
          {x.href && x.page ? <p className={s.stamp}>Shown, with its source and a live render, in {x.page}.</p> : null}
        </li>
      ))}
    </ul>
  );
}

// ── Evidence ────────────────────────────────────────────────────────────────

function stampText(x: RefExample): string | null {
  const v = x.verified;
  if (!v || v.status !== 'verified') return null;
  const pages = v.pages ? `${v.pages} page${v.pages === 1 ? '' : 's'}` : null;
  return `Opened by InDesign ${v.indesignVersion} with no missing font or link${v.roundTrip ? ', saved back as IDML' : ''} and exported to PDF${pages ? ` (${pages})` : ''}, ${v.verifiedAt}.`;
}

function Evidence({ el, book }: { el: RefElement; book: IdmlReference }) {
  const c = book.census;
  const checked = el.examples.filter((x) => stampText(x));
  return (
    <div className="not-prose">
      <dl className={s.facts}>
        <dt>Observed</dt>
        <dd>
          In {el.docCount} of {book.documents} documents ({el.share}%):{' '}
          {series(
            el.parts.map((p) => (
              <>
                <code>{p.part}</code> <span className={s.count}>{p.docCount}</span>
              </>
            )),
          )}
          .
        </dd>
        <dt>Census</dt>
        <dd>
          Taken {book.censusDate}
          {c ? (
            <>
              {' '}
              over {c.documents} documents ({c.byGroup.generated} written by test generators, {c.byGroup.packs} from
              template packs, {c.byGroup.samples} samples). It observed {c.elementsObserved} elements; this reference
              gives {book.elements.length} of them an entry.
            </>
          ) : null}{' '}
          <Link href={CENSUS_HREF}>How the census counts</Link>
        </dd>
        <dt>Counts are</dt>
        <dd>Documents, not occurrences. Values are published only for small closed sets; numbers only by kind.</dd>
        {checked.length ? (
          <>
            <dt>InDesign checks</dt>
            <dd>
              <ul className={s.plainList}>
                {checked.map((x) => (
                  <li key={x.id}>
                    {x.href ? <Link href={x.href}>{x.title}</Link> : x.title}: {stampText(x)}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

// ── Paged support (separate from the reference) ──────────────────────────────

function Src({ src, base, label }: { src?: RefSource | null; base: string | null; label: string }) {
  if (!src || !base) return null;
  const file = src.file.split('/').pop();
  return (
    <a className={s.src} href={`${base}${src.file}#L${src.line}`} aria-label={`${label}: ${src.file} line ${src.line}`}>
      {file}:{src.line}
    </a>
  );
}

function stageWord(impl?: string): string {
  return impl === 'shipped' ? 'yes' : impl === 'partial' ? 'partly' : impl === 'planned' ? 'planned' : impl === 'deferred' ? 'deferred' : '—';
}

function PagedSupport({ el, book }: { el: RefElement; book: IdmlReference }) {
  const sup = book.support;
  if (!el.paged || !sup) {
    return <p>No record of Paged&rsquo;s support was available when this page was built.</p>;
  }
  const n = el.attributes.length;
  const misplaced = el.attributes.filter((a) => a.paged?.misplaced);
  const edits = el.attributes.filter((a) => a.typed?.path);
  const features = (el.features ?? []).map((id) => getSupportFeature(id)).filter((f) => !!f);
  const fidelity = el.examples.filter((x) => x.verified?.fidelity);
  const base = sup.coverage?.sourceBase ?? null;
  return (
    <section className={`not-prose ${s.support}`} aria-label={`Paged support for ${el.name}`}>
      <p className={s.supportIntro}>
        What Paged, one implementation of the format, does with <code>{el.name}</code>. Nothing in this panel is part
        of the format; the reference above holds for any reader.
      </p>
      <p className={s.record}>
        As of: scriptable paths from engine release {sup.engineVersion ?? 'unrecorded'}; parse and write from the
        importer and exporter at{' '}
        {sup.coverage ? (
          <a href={sup.coverage.url}>paged {sup.coverage.sha ? sup.coverage.sha.slice(0, 7) : 'main'}</a>
        ) : (
          'an unrecorded revision'
        )}
        {sup.coverage?.pulledAt ? <>, read {sup.coverage.pulledAt}</> : null}; render from the{' '}
        <Link href={MATRIX_HREF}>capability record</Link>
        {sup.record?.generatedAt ? <> exported {sup.record.generatedAt}</> : null}.
      </p>
      <dl className={s.facts}>
        <dt>Parse</dt>
        <dd>
          {el.paged.reads ? (
            <>
              Reads {el.paged.attributesRead} of the {n} attributes
              {misplaced.length ? (
                <span className={s.issue}>
                  ; {misplaced.length} from a part documents do not keep {misplaced.length === 1 ? 'it' : 'them'} in
                </span>
              ) : null}
            </>
          ) : (
            'Does not read this element yet'
          )}
        </dd>
        <dt>Render</dt>
        <dd>
          {features.length
            ? `${features.length === 1 ? 'One feature' : `${features.length} features`} of the capability record ${features.length === 1 ? 'names' : 'name'} this element (below)`
            : 'No feature of the capability record names this element'}
          {fidelity.length ? '; examples compared with InDesign below' : ''}
        </dd>
        <dt>Edit</dt>
        <dd>
          {edits.length ? (
            <>
              {edits.length} attribute{edits.length === 1 ? '' : 's'} map to a <Link href={PATHS_HREF}>scriptable path</Link>{' '}
              for <code>paged.set</code>
            </>
          ) : (
            'No attribute maps to a scriptable path'
          )}
        </dd>
        <dt>Write</dt>
        <dd>
          {el.paged.attributesWritten
            ? `Writes ${el.paged.attributesWritten} of the ${n} attributes on IDML export`
            : 'Writes none of its attributes on IDML export'}
        </dd>
      </dl>

      {n ? (
        <>
          <h3 id="paged-attributes">By attribute</h3>
          <div className={s.wrap} role="region" aria-label={`${el.name} attributes as Paged reads, edits and writes them (table)`} tabIndex={0}>
            <table className={`${s.table} ${s.stack}`}>
              <thead>
                <tr>
                  <th scope="col">Attribute</th>
                  <th scope="col">Parse</th>
                  <th scope="col">Edit</th>
                  <th scope="col">Write</th>
                </tr>
              </thead>
              <tbody>
                {el.attributes.map((a) => (
                  <tr key={a.name} id={`paged-${a.name}`}>
                    <td className={s.name}>
                      <a href={`#attr-${a.name}`} className={s.plainLink}>
                        {a.name}
                      </a>
                    </td>
                    <td data-label="Parse">
                      {a.paged?.imported ? (
                        a.paged.misplaced ? (
                          <>
                            <span className={`${s.mark} ${s.bad}`}>wrong part</span>
                            <div className={s.gloss}>
                              Reads it from {(a.paged.readParts ?? []).join(', ')}; documents keep it in{' '}
                              {(a.parts ?? []).map((p) => p.part).join(', ')}.
                            </div>
                          </>
                        ) : (
                          <span className={s.mark}>reads</span>
                        )
                      ) : (
                        <span className={`${s.mark} ${s.none}`}>not read</span>
                      )}
                      <Src src={a.paged?.importSource} base={base} label="Importer source" />
                    </td>
                    <td data-label="Edit">
                      {a.typed?.path ? (
                        <>
                          <code className={s.mono}>{a.typed.path}</code>
                          {a.typed.access === 'read' ? <div className={s.count}>read only</div> : null}
                        </>
                      ) : (
                        <span className={s.muted}>&mdash;</span>
                      )}
                    </td>
                    <td data-label="Write">
                      {a.paged?.exported ? <span className={s.mark}>writes</span> : <span className={`${s.mark} ${s.none}`}>not written</span>}
                      <Src src={a.paged?.exportSource} base={base} label="Exporter source" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {features.length ? (
        <>
          <h3 id="paged-features">In the capability record</h3>
          <div className={s.wrap} role="region" aria-label={`${el.name} in the capability record (table)`} tabIndex={0}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Parse</th>
                  <th scope="col">Render</th>
                  <th scope="col">Edit</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link href={`${MATRIX_HREF}#${f.id}`}>{f.title}</Link>
                      <div className={s.count}>{f.status ?? 'no lifecycle'}</div>
                    </td>
                    <td>{stageWord(f.parser?.impl)}</td>
                    <td>{stageWord(f.renderer?.impl)}</td>
                    <td>{stageWord(f.mutation?.impl)}</td>
                    <td>
                      <span className={f.health?.state === 'broken' || f.health?.state === 'attention' ? s.issue : undefined}>
                        {f.health?.headline ?? 'No linked tests'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {fidelity.length ? (
        <>
          <h3 id="paged-render">Rendered against InDesign</h3>
          <ul className={s.plainList}>
            {fidelity.map((x) => (
              <li key={x.id}>
                {x.href ? <Link href={x.href}>{x.title}</Link> : x.title}: mean colour difference {x.verified!.fidelity!.meanDE} ΔE,
                structural similarity {x.verified!.fidelity!.ssim}
                {x.verified!.fidelity!.fontsMatched ? ', same fonts on both sides' : ', fonts differ'} (checked {x.verified!.verifiedAt}).
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className={s.record} style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
        Parse and write come from the <a href={sup.coverage?.url ?? '#'}>idml-coverage record</a>, which reads the
        importer and exporter source; each mark links to the line. Render is recorded per feature, not per attribute.
        A feature is listed when its title in the record names <code>{el.name}</code>.
      </p>
    </section>
  );
}

// ── the entry ────────────────────────────────────────────────────────────────

export function ElementReference({ name, section }: { name: string; section?: EntrySection }) {
  const book = getIdmlReference();
  const el = getRefElement(name);
  if (!el) {
    return (
      <p className="not-prose">
        No reference data for <code>{name}</code>. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  const body =
    section === 'relationships' ? (
      <Relationships el={el} book={book} />
    ) : section === 'attributes' ? (
      <Attributes el={el} book={book} />
    ) : section === 'visualization' ? (
      <Visualization el={el} />
    ) : section === 'behavior' ? (
      <Behavior el={el} />
    ) : section === 'evidence' ? (
      <Evidence el={el} book={book} />
    ) : section === 'support' ? (
      <PagedSupport el={el} book={book} />
    ) : (
      <Definition el={el} book={book} />
    );
  // `.entry` scopes the entry's type scale over the site's prose rules.
  return <div className={`not-prose ${s.entry}`}>{body}</div>;
}

export function ElementIndex() {
  const book = getIdmlReference();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': absoluteUrl('/reference/'),
    name: 'IDML element reference',
    hasDefinedTerm: book.elements.map((el) => ({
      '@type': 'DefinedTerm',
      name: el.name,
      url: absoluteUrl(`/reference/${el.slug}/`),
    })),
  };
  const rows: IndexRow[] = book.elements.map((el) => ({
    name: el.name,
    href: refHref(el.slug),
    part: el.parts[0]?.part ?? 'Other',
    attributes: el.attributes.map((a) => a.name),
    docCount: el.docCount,
    share: el.share,
  }));
  const c = book.census;
  return (
    <>
      <JsonLd data={ld} />
      <p>
        {book.elements.length} elements
        {c ? <> of the {c.elementsObserved} that a census of {book.documents} documents observed ({book.censusDate})</> : null},
        grouped by the package part they most often live in. <Link href={CENSUS_HREF}>How the census counts</Link>{' '}
        explains what the numbers measure and which elements have an entry. Type to narrow the list by element or
        attribute name.
      </p>
      <ElementIndexTable rows={rows} />
    </>
  );
}

/** The census page: what was measured, and the rule that picks the entries. */
export function CensusMethod() {
  const book = getIdmlReference();
  const c = book.census;
  if (!c) return <p>No census data in this build.</p>;
  const sel = book.selection;
  return (
    <div className={`not-prose ${s.entry}`}>
      <dl className={s.facts}>
        <dt>Taken</dt>
        <dd>
          {c.date}, schema <code>{c.schema}</code>
        </dd>
        <dt>Documents</dt>
        <dd>
          {c.documents}: {c.byGroup.generated} written by test generators, {c.byGroup.packs} from template packs exported
          by InDesign, {c.byGroup.samples} sample files
        </dd>
        <dt>XML parts read</dt>
        <dd className={s.num}>{c.xmlParts.toLocaleString('en')}</dd>
        {c.rules ? (
          <>
            <dt>Values published</dt>
            <dd>
              Only for closed sets: at most {String(c.rules.maxDistinctValues)} distinct values, each in at least{' '}
              {String(c.rules.minDocsPerValue)} documents and at most {String(c.rules.maxValueLength)} characters long.
              Numbers by kind and sign only.
            </dd>
          </>
        ) : null}
        <dt>Observed</dt>
        <dd>
          {c.elementsObserved} distinct elements and {c.attributesObserved.toLocaleString('en')} distinct
          element–attribute pairs
        </dd>
        <dt>In this reference</dt>
        <dd>
          {book.elements.length} of the {c.elementsObserved} elements
          {sel ? (
            <>
              : an element has an entry when it appears outside <code>META-INF</code>, and either it appears in at
              least {sel.minDocs} documents with attributes or children of its own, or Paged&rsquo;s importer reads it
              ({sel.byImporterOnly} entries are there for that reason alone)
            </>
          ) : null}
        </dd>
      </dl>
    </div>
  );
}
