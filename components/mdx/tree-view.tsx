import { parseXmlToTree, type XmlNode } from '@/lib/xml-tree';

function Node({ node }: { node: XmlNode }) {
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <details open className="[&>summary]:cursor-pointer">
        <summary className="font-mono">
          <span className="text-fd-foreground">{node.tag}</span>
          {node.attrs.length > 0 && (
            <span className="text-fd-muted-foreground"> · {node.attrs.length} attrs</span>
          )}
          {node.hasText && <span className="text-fd-muted-foreground"> · text</span>}
        </summary>
        {hasChildren && (
          <ul className="ml-4 border-l border-fd-border pl-3">
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
 * XML. Display only — it does not validate as IDML (that is the CI gate's job).
 */
export function TreeView({ code }: { code: string }) {
  const roots = parseXmlToTree(code);
  return (
    <ul className="not-prose rounded-lg border border-fd-border p-4 text-sm">
      {roots.map((node, i) => (
        <Node key={i} node={node} />
      ))}
    </ul>
  );
}
