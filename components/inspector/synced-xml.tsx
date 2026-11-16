'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { ElementRefs } from './annotated-xml';
import { nodeAt, type XmlIndex } from './xml-index';
import { scrollWithin } from './scroll';
import s from './inspector.module.css';

/**
 * The XML of one part, synchronised with its element tree (ADR 809).
 *
 * The source is drawn token by token, each tag and each run of text carrying
 * its offset in the part (`data-o`), so a click maps back to the innermost
 * element around it through the part's index. The selected element's whole
 * range, from its opening `<` to the end of its closing tag, is marked and
 * scrolled into view inside the pane.
 *
 * As in the Linked view (annotated-xml.tsx), an element name with a page in the
 * element reference links to it, in a new tab so the file stays open. An
 * attribute value that is the `Self` id of an element elsewhere in the package
 * is a reference the reader can follow: a click opens that part with the
 * element selected (`onFollow`). The selection strip above offers the same
 * references as buttons, for the keyboard.
 *
 * Large parts render `TAG_PAGE` tags at a time; a selection further on extends
 * the rendered range to reach it.
 */
const TAG_PAGE = 2500;
const TOKEN = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
const ATTR = /(\s+)([A-Za-z_][\w.:-]*)(\s*=\s*)("[^"]*"|'[^']*')/g;

function NameLink({ name, refs }: { name: string; refs: ElementRefs }) {
  const ref = refs[name];
  if (!ref) return <span className={s.xTag}>{name}</span>;
  return (
    <a href={ref.href} target="_blank" rel="noopener" title={ref.summary ?? `${name} in the element reference`} className={`${s.xTag} ${s.xLink}`}>
      {name}
    </a>
  );
}

function attrs(src: string, at: number, selves: Map<string, string> | null): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const value = m[4].slice(1, -1);
    const isRef = m[2] !== 'Self' && !!value && !!selves?.has(value);
    out.push(
      m[1],
      <span key={`a${at + m.index}`} className={s.xAttr}>
        {m[2]}
      </span>,
      <span key={`e${at + m.index}`} className={s.xPunct}>
        {m[3]}
      </span>,
      isRef ? (
        <span key={`v${at + m.index}`} className={`${s.xStr} ${s.xRef}`} data-ref={value} title={`Go to ${value} in ${selves!.get(value)}`}>
          {m[4]}
        </span>
      ) : (
        <span key={`v${at + m.index}`} className={s.xStr}>
          {m[4]}
        </span>
      ),
    );
    last = ATTR.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

interface Rendered {
  before: ReactNode[];
  inside: ReactNode[];
  after: ReactNode[];
  end: number;
}

/** The source up to `maxTags` tags (and at least to `minEnd`), split around the selection. */
function render(code: string, refs: ElementRefs, selves: Map<string, string> | null, maxTags: number, sel: [number, number] | null, minEnd: number): Rendered {
  const out: Rendered = { before: [], inside: [], after: [], end: code.length };
  let cur = out.before;
  const text = (from: number, to: number) => {
    if (to > from) cur.push(<span key={`t${from}`} data-o={from}>{code.slice(from, to)}</span>);
  };
  let last = 0;
  let tags = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    text(last, m.index);
    if (sel && m.index === sel[0]) cur = out.inside;
    const k = m.index;
    if (m[2]) {
      cur.push(
        <span key={k} data-o={k}>
          <span className={s.xPunct}>{m[1] ? '</' : '<'}</span>
          <NameLink name={m[2]} refs={refs} />
          {attrs(m[3] ?? '', k, selves)}
          <span className={s.xPunct}>{m[4] ? '/>' : '>'}</span>
        </span>,
      );
    } else {
      cur.push(
        <span key={k} data-o={k} className={m[0].startsWith('<!--') ? s.xComment : s.xPunct}>
          {m[0]}
        </span>,
      );
    }
    last = TOKEN.lastIndex;
    if (sel && last === sel[1]) cur = out.after;
    if (++tags >= maxTags && last >= minEnd) {
      out.end = last;
      return out;
    }
  }
  text(last, code.length);
  return out;
}

export function SyncedXml({
  code,
  index,
  selected,
  onSelect,
  onFollow,
  refs,
  selves,
  part,
}: {
  code: string;
  index: XmlIndex;
  selected: number;
  onSelect: (node: number) => void;
  /** Follow a reference to the element with this `Self`, in whichever part holds it. */
  onFollow: (self: string) => void;
  refs: ElementRefs;
  /** `Self` id → the part that defines it, across the package; null while it is being built. */
  selves: Map<string, string> | null;
  part: string;
}) {
  const [limit, setLimit] = useState(TAG_PAGE);
  const paneRef = useRef<HTMLDivElement>(null);
  const node = selected >= 0 ? index.nodes[selected] : null;
  const from = node ? node.start : -1;
  const to = node ? node.end : -1;
  const { before, inside, after, end } = useMemo(
    () => render(code, refs, selves, limit, from >= 0 ? [from, to] : null, Math.max(to, 0)),
    [code, refs, selves, limit, from, to],
  );

  useEffect(() => {
    const pane = paneRef.current;
    const mark = pane?.querySelector<HTMLElement>('[data-selected]');
    if (pane && mark) scrollWithin(pane, mark, 'start');
  }, [selected]);

  const onClick = (e: MouseEvent<HTMLPreElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a')) return;
    const ref = target.closest<HTMLElement>('[data-ref]')?.dataset.ref;
    if (ref) {
      onFollow(ref);
      return;
    }
    // A selection of text to copy is not a click to select an element.
    if (window.getSelection()?.toString()) return;
    const o = target.closest<HTMLElement>('[data-o]')?.dataset.o;
    if (o === undefined) return;
    const n = nodeAt(index, Number(o));
    if (n >= 0) onSelect(n);
  };

  return (
    <div ref={paneRef} className={s.scroll} tabIndex={0} role="region" aria-label={`XML of ${part}`}>
      <pre className={s.source} onClick={onClick}>
        {before}
        {inside.length ? (
          <mark className={s.sel} data-selected="">
            {inside}
          </mark>
        ) : null}
        {after}
      </pre>
      {end < code.length && (
        <div className={s.moreSource}>
          <button type="button" className={s.btn} onClick={() => setLimit((l) => l + TAG_PAGE * 4)}>
            Show more of the source ({Math.round((end / code.length) * 100)}% shown)
          </button>
        </div>
      )}
    </div>
  );
}
