import { parseXmlToTree, type XmlNode } from '@/lib/xml-tree';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  letterSpacing: '-0.01em',
} as const;

function Node({ node }: { node: XmlNode }) {
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <details open className="[&>summary]:cursor-pointer">
        <summary style={{ ...mono, lineHeight: 1.65, color: 'var(--code-punctuation)' }}>
          <span style={{ color: 'var(--code-tag)' }}>{node.tag}</span>
          {node.attrs.length > 0 && (
            <span style={{ color: 'var(--code-attr)' }}>
              {' · '}
              {node.attrs.length} attrs
            </span>
          )}
          {node.hasText && <span style={{ color: 'var(--color-muted)' }}> · text</span>}
        </summary>
        {hasChildren && (
          <ul
            style={{
              listStyle: 'none',
              margin: '0 0 0 6px',
              padding: '0 0 0 12px',
              borderLeft: '1px solid var(--color-rule)',
            }}
          >
            {node.children.map((child, i) => (
              <Node key={i} node={child} />
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}

/**
 * The "tree" view (briefing §6.2): a collapsible structural read of the same
 * XML in the editorial token palette — tag in code-tag, attribute counts in
 * code-attr, rule-left nesting (SourcePanel.jsx tree mode). Display only; it
 * does not validate as IDML (that is the CI gate's job).
 */
export function TreeView({ code }: { code: string }) {
  const roots = parseXmlToTree(code);
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '18px 20px', ...mono }}>
      {roots.map((node, i) => (
        <Node key={i} node={node} />
      ))}
    </ul>
  );
}
