'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { btn, label, mono, muted } from './styles';

/**
 * The Annotated view: the part's source with every element name that has a page
 * in the element reference linked to it (a new tab, so the dropped file stays
 * open), and its summary as the tooltip. Above it, the part's element
 * vocabulary: each element with its count, linked the same way.
 *
 * `refs` maps an element name to its resolved reference href; the server wrapper
 * builds it from the generated reference, so only names with a page are links.
 * The source renders `TAG_PAGE` tags at a time.
 */
export type ElementRefs = Record<string, { href: string; summary: string | null }>;

const TAG_PAGE = 2500;
const TOKEN =
  /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
const ATTR = /(\s+)([A-Za-z_][\w.:-]*)(\s*=\s*)("[^"]*"|'[^']*')/g;

const c = {
  tag: { color: 'var(--code-tag)' },
  attr: { color: 'var(--code-attr)' },
  str: { color: 'var(--code-string)' },
  punct: { color: 'var(--code-punctuation)' },
  comment: { color: 'var(--code-comment)', fontStyle: 'italic' },
} as const;

function NameLink({ name, refs }: { name: string; refs: ElementRefs }) {
  const ref = refs[name];
  if (!ref) return <span style={c.tag}>{name}</span>;
  return (
    <a
      href={ref.href}
      target="_blank"
      rel="noopener"
      title={ref.summary ?? `${name} in the element reference`}
      style={{ ...c.tag, textDecoration: 'underline', textDecorationColor: 'var(--color-rule-strong)', textUnderlineOffset: 2 }}
    >
      {name}
    </a>
  );
}

function attrs(src: string, key: number): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    out.push(
      m[1],
      <span key={`${key}a${m.index}`} style={c.attr}>
        {m[2]}
      </span>,
      <span key={`${key}e${m.index}`} style={c.punct}>
        {m[3]}
      </span>,
      <span key={`${key}v${m.index}`} style={c.str}>
        {m[4]}
      </span>,
    );
    last = ATTR.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

function renderSource(code: string, refs: ElementRefs, maxTags: number): { nodes: ReactNode[]; end: number } {
  const nodes: ReactNode[] = [];
  let last = 0;
  let tags = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) nodes.push(code.slice(last, m.index));
    const k = m.index;
    if (m[2]) {
      nodes.push(
        <span key={k}>
          <span style={c.punct}>{m[1] ? '</' : '<'}</span>
          <NameLink name={m[2]} refs={refs} />
          {attrs(m[3] ?? '', k)}
          <span style={c.punct}>{m[4] ? '/>' : '>'}</span>
        </span>,
      );
    } else {
      nodes.push(
        <span key={k} style={m[0].startsWith('<!--') ? c.comment : c.punct}>
          {m[0]}
        </span>,
      );
    }
    last = TOKEN.lastIndex;
    if (++tags >= maxTags) return { nodes, end: last };
  }
  if (last < code.length) nodes.push(code.slice(last));
  return { nodes, end: code.length };
}

function vocabulary(code: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const m of code.matchAll(/<([A-Za-z_][\w.:-]*)/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function AnnotatedXml({ code, refs }: { code: string; refs: ElementRefs }) {
  const [limit, setLimit] = useState(TAG_PAGE);
  const vocab = useMemo(() => vocabulary(code), [code]);
  const { nodes, end } = useMemo(() => renderSource(code, refs, limit), [code, refs, limit]);
  const linked = vocab.filter(([n]) => refs[n]).length;

  return (
    <div>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-rule)' }}>
        <div style={{ ...label, marginBottom: 8 }}>
          {vocab.length} element types · {linked} with a reference page
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {vocab.map(([name, n]) => (
            <span
              key={name}
              style={{
                ...mono,
                display: 'inline-flex',
                gap: 5,
                padding: '1px 6px',
                border: '1px solid var(--color-rule)',
                borderRadius: 3,
                background: refs[name] ? 'var(--color-paper)' : 'transparent',
              }}
            >
              <NameLink name={name} refs={refs} />
              <span style={muted}>{n.toLocaleString('en')}</span>
            </span>
          ))}
        </div>
      </div>
      <pre
        style={{
          ...mono,
          margin: 0,
          padding: '18px 20px',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          color: 'var(--code-text)',
        }}
      >
        {nodes}
      </pre>
      {end < code.length && (
        <div style={{ padding: '0 20px 18px' }}>
          <button type="button" style={btn} onClick={() => setLimit((l) => l + TAG_PAGE * 4)}>
            Show more ({Math.round((end / code.length) * 100)}% shown)
          </button>
        </div>
      )}
    </div>
  );
}
