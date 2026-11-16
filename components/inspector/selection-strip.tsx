'use client';

import type { ElementRefs } from './annotated-xml';
import { ancestry, attributesOf, type XmlIndex } from './xml-index';
import s from './inspector.module.css';

/**
 * Above the tree and the XML: where the selected element sits (its ancestry,
 * each step selectable), its reference page, and the references it makes to
 * other elements of the package, as buttons. The XML pane offers the same
 * references inline to the pointer; these are the keyboard's way to them.
 */
export function SelectionStrip({
  part,
  code,
  index,
  node,
  refs,
  selves,
  onSelect,
  onFollow,
}: {
  part: string;
  code: string;
  index: XmlIndex;
  node: number;
  refs: ElementRefs;
  selves: Map<string, string> | null;
  onSelect: (node: number) => void;
  onFollow: (self: string) => void;
}) {
  if (node < 0) {
    return (
      <div className={s.pane}>
        <p className={s.note} style={{ padding: '10px 16px' }}>
          Choose an element in the tree or click one in the XML; the other side follows. Values underlined in blue are
          references to another element of the package and lead to it.
        </p>
      </div>
    );
  }
  const n = index.nodes[node];
  const chain = ancestry(index, node);
  const outgoing = selves
    ? attributesOf(code, n).filter((a) => a.name !== 'Self' && a.value && selves.has(a.value))
    : [];
  const ref = refs[n.tag];
  return (
    <section className={s.pane} aria-label="Selected element" aria-live="polite">
      <div className={s.cardBody}>
        <ol className={s.crumbs} aria-label={`Path to the selected element in ${part}`}>
          {chain.map((c) => (
            <li key={c}>
              <button type="button" className={s.crumb} aria-current={c === node ? 'true' : undefined} onClick={() => onSelect(c)}>
                {index.nodes[c].tag}
              </button>
            </li>
          ))}
        </ol>
        <p className={s.note}>
          {n.self ? (
            <>
              <code>Self=&quot;{n.self}&quot;</code>.{' '}
            </>
          ) : null}
          {ref ? (
            <a href={ref.href} target="_blank" rel="noopener">
              {n.tag} in the element reference
            </a>
          ) : (
            <>No reference entry for {n.tag}.</>
          )}
        </p>
        {outgoing.length ? (
          <ul className={s.refs} aria-label="References to other elements">
            {outgoing.map((a) => (
              <li key={a.name}>
                <button type="button" className={s.refBtn} onClick={() => onFollow(a.value)} title={`${a.value} is defined in ${selves!.get(a.value)}`}>
                  {a.name} &rarr; {a.value.length > 36 ? `${a.value.slice(0, 35)}…` : a.value}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
