'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { XmlIndex } from './xml-index';
import { scrollWithin } from './scroll';
import s from './inspector.module.css';

/**
 * The element tree of one XML part, synchronised with its source (ADR 809).
 *
 * The rows are the index's elements, flattened as far as they are open, so the
 * tree reads like an outline and the keyboard can walk it: Up and Down move,
 * Right opens or steps into, Left closes or steps out, Home and End jump.
 * Selection follows focus, and the source pane follows the selection. When the
 * source selects an element, the tree opens its ancestors, pages its run of
 * siblings into view and scrolls to it.
 *
 * Parts can hold hundreds of thousands of elements: a large part opens two
 * levels deep, and siblings come in pages of `PAGE`.
 */
const PAGE = 200;
const SMALL = 600;

type Row = { kind: 'node'; node: number } | { kind: 'more'; parent: number; hidden: number };

function flatten(index: XmlIndex, open: Set<number>, shown: Map<number, number>): Row[] {
  const rows: Row[] = [];
  const visit = (list: number[], parent: number) => {
    const limit = shown.get(parent) ?? PAGE;
    for (let i = 0; i < Math.min(list.length, limit); i++) {
      const n = list[i];
      rows.push({ kind: 'node', node: n });
      if (open.has(n) && index.nodes[n].children.length) visit(index.nodes[n].children, n);
    }
    if (list.length > limit) rows.push({ kind: 'more', parent, hidden: list.length - limit });
  };
  visit(index.roots, -1);
  return rows;
}

function initiallyOpen(index: XmlIndex): Set<number> {
  const all = index.nodes.length <= SMALL;
  const out = new Set<number>();
  index.nodes.forEach((n, i) => {
    if (n.children.length && (all || n.depth < 2)) out.add(i);
  });
  return out;
}

export function SyncedTree({
  index,
  selected,
  onSelect,
  part,
}: {
  index: XmlIndex;
  selected: number;
  onSelect: (node: number) => void;
  /** The part's path, for the tree's accessible name. */
  part: string;
}) {
  const [open, setOpen] = useState<Set<number>>(() => initiallyOpen(index));
  const [shown, setShown] = useState<Map<number, number>>(() => new Map());
  const [focus, setFocus] = useState<number>(() => (selected >= 0 ? selected : (index.roots[0] ?? -1)));
  const listRef = useRef<HTMLUListElement>(null);
  const moved = useRef(false);

  // Follow a selection made elsewhere: open the ancestors, page the sibling run.
  useEffect(() => {
    if (selected < 0 || selected >= index.nodes.length) return;
    setOpen((prev) => {
      let next = prev;
      for (let p = index.nodes[selected].parent; p >= 0; p = index.nodes[p].parent) {
        if (!next.has(p)) {
          if (next === prev) next = new Set(prev);
          next.add(p);
        }
      }
      return next;
    });
    setShown((prev) => {
      let next = prev;
      for (let n = selected; n >= 0; n = index.nodes[n].parent) {
        const p = index.nodes[n].parent;
        const siblings = p >= 0 ? index.nodes[p].children : index.roots;
        const at = siblings.indexOf(n);
        if (at >= (next.get(p) ?? PAGE)) {
          if (next === prev) next = new Map(prev);
          next.set(p, Math.ceil((at + 1) / PAGE) * PAGE);
        }
      }
      return next;
    });
    setFocus(selected);
  }, [index, selected]);

  const rows = useMemo(() => flatten(index, open, shown), [index, open, shown]);

  // Keep the selected row in view inside the pane; move DOM focus only when the
  // keyboard moved it.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-node="${focus}"]`);
    const pane = list?.parentElement;
    if (!row || !pane) return;
    scrollWithin(pane, row, 'nearest');
    if (moved.current) {
      moved.current = false;
      row.focus({ preventScroll: true });
    }
  }, [focus, rows]);

  const toggle = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const go = (n: number) => {
    if (n < 0) return;
    moved.current = true;
    setFocus(n);
    onSelect(n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const nodeRows = rows.filter((r): r is { kind: 'node'; node: number } => r.kind === 'node');
    const at = nodeRows.findIndex((r) => r.node === focus);
    const node = index.nodes[focus];
    switch (e.key) {
      case 'ArrowDown':
        go(nodeRows[Math.min(at + 1, nodeRows.length - 1)]?.node ?? -1);
        break;
      case 'ArrowUp':
        go(nodeRows[Math.max(at - 1, 0)]?.node ?? -1);
        break;
      case 'Home':
        go(nodeRows[0]?.node ?? -1);
        break;
      case 'End':
        go(nodeRows[nodeRows.length - 1]?.node ?? -1);
        break;
      case 'ArrowRight':
        if (!node?.children.length) return;
        if (!open.has(focus)) toggle(focus);
        else go(node.children[0]);
        break;
      case 'ArrowLeft':
        if (node?.children.length && open.has(focus)) toggle(focus);
        else if (node && node.parent >= 0) go(node.parent);
        else return;
        break;
      case 'Enter':
      case ' ':
        if (focus >= 0) onSelect(focus);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <ul ref={listRef} role="tree" aria-label={`Elements of ${part}`} className={s.treeList} onKeyDown={onKeyDown}>
      {rows.map((r) => {
        if (r.kind === 'more') {
          return (
            <li key={`more-${r.parent}`} role="none" className={s.more}>
              <button
                type="button"
                className={s.btn}
                onClick={() => setShown((prev) => new Map(prev).set(r.parent, (prev.get(r.parent) ?? PAGE) + PAGE * 5))}
              >
                Show {Math.min(PAGE * 5, r.hidden).toLocaleString('en')} more of {r.hidden.toLocaleString('en')}
              </button>
            </li>
          );
        }
        const n = index.nodes[r.node];
        const hasChildren = n.children.length > 0;
        const isOpen = open.has(r.node);
        const isSelected = r.node === selected;
        return (
          <li
            key={r.node}
            role="treeitem"
            aria-label={n.hint ? `${n.tag} ${n.hint}` : n.tag}
            aria-level={n.depth + 1}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-selected={isSelected}
            tabIndex={r.node === focus ? 0 : -1}
            data-node={r.node}
            className={s.row}
            style={{ paddingLeft: 6 + n.depth * 14 }}
            onClick={() => {
              setFocus(r.node);
              onSelect(r.node);
            }}
          >
            <span
              className={s.twisty}
              aria-hidden
              onClick={(e) => {
                if (!hasChildren) return;
                e.stopPropagation();
                toggle(r.node);
              }}
            >
              {hasChildren ? (isOpen ? '▾' : '▸') : ''}
            </span>
            <span className={s.tag}>{n.tag}</span>
            {n.hint ? <span className={s.hint}>{n.hint.length > 40 ? `${n.hint.slice(0, 39)}…` : n.hint}</span> : null}
            {hasChildren && !isOpen ? <span className={s.kids}>{n.children.length}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
