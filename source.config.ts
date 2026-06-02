import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { docsFrontmatter } from './lib/frontmatter';

// This file may export ONLY collections (a fumadocs-mdx constraint). The schema,
// enums, and types live in ./lib/frontmatter.
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsFrontmatter,
    // Expose the processed Markdown of each page so the LLM routes
    // (app/llms.txt, app/llms-full.txt) can emit pages as plain Markdown via
    // `page.data.getText('processed')`.
    postprocess: { includeProcessedMarkdown: true },
  },
});

/* ===========================================================================
   Editorial rehype transforms — apply brand structures to authored Markdown
   without touching content. Dependency-free hast walkers (loosely typed; the
   hast shape we touch is just type/tagName/value/properties/children).
   ======================================================================== */
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function walk(node: HastNode, fn: (n: HastNode) => void): void {
  fn(node);
  if (node.children) for (const c of node.children) walk(c, fn);
}
function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.children) return node.children.map(textOf).join('');
  return '';
}
function addClass(node: HastNode, cls: string): void {
  node.properties = node.properties || {};
  const c = node.properties.className;
  node.properties.className = Array.isArray(c) ? [...c, cls] : c ? [c, cls] : [cls];
}
/** The inline container of a list item: a sole wrapping <p> (loose list) or the <li> itself (tight). */
function liContent(li: HastNode): HastNode {
  const els = (li.children || []).filter((c) => c.type === 'element');
  if (els.length === 1 && els[0].tagName === 'p') return els[0];
  return li;
}
function firstElementChild(node: HastNode): HastNode | undefined {
  return (node.children || []).find((c) => c.type === 'element');
}

/**
 * "In short:" paragraphs become a brand panel (styleguide DefinitionBlock):
 * mark the <p> and turn its leading "In short:" <strong> into a section label.
 */
function rehypeInShort() {
  return (tree: HastNode) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'p') return;
      const first = firstElementChild(node);
      if (!first || first.tagName !== 'strong') return;
      if (!/^in short\b/i.test(textOf(first).trim())) return;
      addClass(node, 'paged-inshort');
      // drop the trailing colon from the label ("In short:" -> "In short")
      const texts: HastNode[] = [];
      walk(first, (n) => {
        if (n.type === 'text') texts.push(n);
      });
      const last = texts[texts.length - 1];
      if (last && last.value) last.value = last.value.replace(/\s*:\s*$/, '');
    });
  };
}

/**
 * Navigation bullet lists — every item is a bold link (`- **[Title](href)** — …`)
 * — become a brand card grid (the home "where to begin" format): mark the <ul>
 * and wrap each item's trailing description so the title reads as a serif card
 * head over a sans description.
 */
function rehypeCardList() {
  return (tree: HastNode) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'ul') return;
      const items = (node.children || []).filter((c) => c.type === 'element' && c.tagName === 'li');
      if (items.length < 2) return;

      const isNavItem = (li: HastNode): boolean => {
        const fe = firstElementChild(liContent(li));
        if (!fe) return false;
        if (fe.tagName === 'a') return true;
        if (fe.tagName === 'strong') return (fe.children || []).some((c) => c.type === 'element' && c.tagName === 'a');
        return false;
      };
      if (!items.every(isNavItem)) return;

      addClass(node, 'paged-cardlist');
      for (const li of items) {
        const content = liContent(li);
        const kids = content.children || [];
        const i = kids.findIndex((c) => c.type === 'element');
        const rest = kids.slice(i + 1);
        if (!rest.length) continue;
        // strip a leading em/en dash + spaces from the description
        if (rest[0].type === 'text' && rest[0].value) rest[0].value = rest[0].value.replace(/^[\s—–-]+/, '');
        const span: HastNode = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['paged-card-desc'] },
          children: rest,
        };
        content.children = [...kids.slice(0, i + 1), span];
      }
    });
  };
}

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [rehypeInShort, rehypeCardList],
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
