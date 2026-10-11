'use client';

import { useMemo, useState } from 'react';
import { parseXmlToTree, type XmlNode } from '@/lib/xml-tree';
import { TreeLabel, treeChildList, treeMono } from '@/components/mdx/tree-view';
import { btn } from './styles';

/**
 * The Tree view for a dropped part. Same structural read and the same line as
 * the docs' TreeView (components/mdx/tree-view.tsx), but children mount only
 * when their element is opened, and long sibling runs come in pages of
 * `PAGE`, so a multi-megabyte story stays responsive. Small parts open fully;
 * large ones open the first `openDepth` levels.
 */
const PAGE = 200;

/** The attribute that names an element best, shown after its label. */
function hintOf(node: XmlNode): string | null {
  for (const key of ['Name', 'Self']) {
    const a = node.attrs.find((x) => x.name === key);
    if (a?.value) return a.value.length > 48 ? `${a.value.slice(0, 47)}…` : a.value;
  }
  return null;
}

function Children({ nodes, depth, openDepth }: { nodes: XmlNode[]; depth: number; openDepth: number }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <>
      {nodes.slice(0, shown).map((child, i) => (
        <Node key={i} node={child} depth={depth} openDepth={openDepth} />
      ))}
      {nodes.length > shown && (
        <li style={{ padding: '4px 0' }}>
          <button type="button" style={{ ...btn, fontSize: 11.5, padding: '2px 8px' }} onClick={() => setShown((n) => n + PAGE * 5)}>
            Show {Math.min(PAGE * 5, nodes.length - shown).toLocaleString('en')} more of {(nodes.length - shown).toLocaleString('en')}
          </button>
        </li>
      )}
    </>
  );
}

function Node({ node, depth, openDepth }: { node: XmlNode; depth: number; openDepth: number }) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(depth < openDepth);
  const hint = hintOf(node);
  return (
    <li>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="[&>summary]:cursor-pointer">
        <summary style={{ ...treeMono, lineHeight: 1.65, color: 'var(--code-punctuation)' }}>
          <TreeLabel node={node}>
            {hint && <span style={{ color: 'var(--code-string)' }}> {hint}</span>}
            {hasChildren && !open && <span style={{ color: 'var(--color-muted)' }}> · {node.children.length} children</span>}
          </TreeLabel>
        </summary>
        {hasChildren && open && (
          <ul style={treeChildList}>
            <Children nodes={node.children} depth={depth + 1} openDepth={openDepth} />
          </ul>
        )}
      </details>
    </li>
  );
}

function countNodes(nodes: XmlNode[]): number {
  let n = 0;
  const stack = [...nodes];
  while (stack.length) {
    const x = stack.pop()!;
    n++;
    for (const c of x.children) stack.push(c);
  }
  return n;
}

export function LazyTree({ code }: { code: string }) {
  const { roots, openDepth } = useMemo(() => {
    const roots = parseXmlToTree(code);
    const n = countNodes(roots);
    return { roots, openDepth: n <= 600 ? Infinity : 2 };
  }, [code]);
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '18px 20px', ...treeMono }}>
      <Children nodes={roots} depth={0} openDepth={openDepth} />
    </ul>
  );
}
