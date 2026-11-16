/**
 * The Inspector's index of one XML part: every element with the character
 * range it covers in the part's source, so the element tree and the source can
 * select each other (ADR 809).
 *
 * `start` is the `<` of the opening tag, `openEnd` the character after its `>`,
 * `end` the character after the closing tag's `>` (or `openEnd` for an empty
 * element). Elements come in document order, a parent before its children, so
 * the innermost element under a source offset is found with one binary search
 * and a walk up the parents.
 *
 * Structural and tolerant, like lib/xml-tree.ts: a stray closing tag closes the
 * nearest open element with its name, and anything still open at the end of the
 * part runs to the end. Validation is the renderer's job, not this one's.
 */
export interface XNode {
  tag: string;
  start: number;
  openEnd: number;
  end: number;
  parent: number;
  children: number[];
  depth: number;
  /** The element's `Self` id, when it has one. */
  self: string | null;
  /** The attribute that names it best for a reader: `Name` (unless InDesign's empty `$ID/`), else `Self`. */
  hint: string | null;
}

export interface XmlIndex {
  nodes: XNode[];
  roots: number[];
  /** `Self` id → node, for the ids this part defines. */
  bySelf: Map<string, number>;
}

const TOKEN = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
const SELF = /\sSelf\s*=\s*"([^"]*)"/;
const NAME = /\sName\s*=\s*"([^"]*)"/;

export function indexXml(code: string): XmlIndex {
  const nodes: XNode[] = [];
  const roots: number[] = [];
  const bySelf = new Map<string, number>();
  const stack: number[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(code))) {
    if (!m[2]) continue; // a declaration, comment or CDATA section
    if (m[1]) {
      // closing tag: close up to the nearest open element of that name
      for (let i = stack.length - 1; i >= 0; i--) {
        if (nodes[stack[i]].tag !== m[2]) continue;
        while (stack.length > i) nodes[stack.pop()!].end = TOKEN.lastIndex;
        break;
      }
      continue;
    }
    const attrs = m[3] ?? '';
    const self = attrs.match(SELF)?.[1] ?? null;
    const name = attrs.match(NAME)?.[1] ?? null;
    const id = nodes.length;
    const parent = stack.length ? stack[stack.length - 1] : -1;
    nodes.push({
      tag: m[2],
      start: m.index,
      openEnd: TOKEN.lastIndex,
      end: TOKEN.lastIndex,
      parent,
      children: [],
      depth: stack.length,
      self,
      hint: name && name !== '$ID/' ? name : self,
    });
    if (parent >= 0) nodes[parent].children.push(id);
    else roots.push(id);
    if (self && !bySelf.has(self)) bySelf.set(self, id);
    if (m[4] !== '/') stack.push(id);
  }
  while (stack.length) nodes[stack.pop()!].end = code.length;
  return { nodes, roots, bySelf };
}

/** The innermost element whose range holds `offset`, or -1. */
export function nodeAt(index: XmlIndex, offset: number): number {
  const { nodes } = index;
  let lo = 0;
  let hi = nodes.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nodes[mid].start <= offset) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  while (found >= 0 && nodes[found].end <= offset) found = nodes[found].parent;
  return found;
}

/** The node and its ancestors, root first. */
export function ancestry(index: XmlIndex, node: number): number[] {
  const out: number[] = [];
  for (let n = node; n >= 0; n = index.nodes[n].parent) out.unshift(n);
  return out;
}

/** The attributes of a node's opening tag, in source order. */
export function attributesOf(code: string, node: XNode): { name: string; value: string }[] {
  const src = code.slice(node.start + node.tag.length + 1, node.openEnd);
  const out: { name: string; value: string }[] = [];
  const re = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push({ name: m[1], value: m[2] ?? m[3] ?? '' });
  return out;
}

/**
 * Every `Self` id the package defines, by part: where a reference such as
 * `ParentStory="u1d5"` or `AppliedParagraphStyle="ParagraphStyle/…"` leads.
 * One regular-expression pass per XML part; the first definition wins.
 */
export function indexPackageSelves(parts: Iterable<{ path: string; text: string }>): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<[A-Za-z_][\w.:-]*\s[^<>]*?\bSelf\s*=\s*"([^"]*)"/g;
  for (const { path, text } of parts) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) if (!out.has(m[1])) out.set(m[1], path);
  }
  return out;
}
