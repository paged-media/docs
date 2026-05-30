/**
 * A tiny, isomorphic, *structural* XML reader for the TreeView (display only).
 * It deliberately does NOT validate as IDML — validation is the CI gate's job
 * (`scripts/examples/validate.ts` via the renderer). This just turns
 * well-formed example XML into a collapsible element tree. Tolerant by design.
 */
export interface XmlNode {
  tag: string;
  attrs: { name: string; value: string }[];
  children: XmlNode[];
  hasText: boolean;
}

function parseAttrs(src: string): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  const re = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"|([A-Za-z_][\w.:-]*)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push({ name: m[1] ?? m[3], value: m[2] ?? m[4] ?? '' });
  }
  return out;
}

export function parseXmlToTree(xml: string): XmlNode[] {
  const roots: XmlNode[] = [];
  const stack: XmlNode[] = [];
  // elements | processing-instructions | comments | CDATA
  const re =
    /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const between = xml.slice(lastIndex, m.index);
    if (between.trim().length > 0 && stack.length) stack[stack.length - 1].hasText = true;
    lastIndex = re.lastIndex;

    const full = m[0];
    if (full.startsWith('<?') || full.startsWith('<!--') || full.startsWith('<![CDATA[')) continue;

    const closing = m[1] === '/';
    if (closing) {
      stack.pop();
      continue;
    }
    const node: XmlNode = {
      tag: m[2],
      attrs: parseAttrs(m[3] ?? ''),
      children: [],
      hasText: false,
    };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    if (m[4] !== '/') stack.push(node);
  }
  return roots;
}
