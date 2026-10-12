import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { docsFrontmatter } from './lib/frontmatter';
import { termId } from './lib/glossary';
import { ENGINE_CHAPTERS } from './lib/site';
import { TIER_GLYPH_PATHS, TIER_META, isTier } from './lib/tiers';

// This file may export ONLY collections (a fumadocs-mdx constraint). The schema,
// enums, and types live in ./lib/frontmatter.
// One collection per site (lib/site.ts): idml.paged.media is built from
// content/docs/idml, docs.paged.media from content/docs/paged. lib/source.ts
// picks the one this build serves.
const docsOptions = {
  schema: docsFrontmatter,
  // Expose the processed Markdown of each page so the LLM routes
  // (app/llms.txt, app/llms-full.txt) can emit pages as plain Markdown via
  // `page.data.getText('processed')`.
  postprocess: { includeProcessedMarkdown: true },
} as const;

export const idml = defineDocs({ dir: 'content/docs/idml', docs: docsOptions });
export const paged = defineDocs({ dir: 'content/docs/paged', docs: docsOptions });

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
      // The panel's text now starts a block of its own: give it a capital
      // ("In short: one engine…" was written as a run-in lead). Code, and the
      // `paged.*` namespace, keep their spelling.
      const kids = node.children ?? [];
      const next = kids[kids.indexOf(first) + 1];
      if (next?.type === 'text' && next.value && !/^\s*paged\./.test(next.value)) {
        next.value = next.value.replace(/^(\s*)([a-z])/, (_, sp: string, c: string) => sp + c.toUpperCase());
      }
    });
  };
}

/**
 * The tier and mode of the page a site-neutral link points at, read from that
 * page's frontmatter (`/docs/idml/stories-text/x` → content/docs/idml/
 * stories-text/x.mdx or …/x/index.mdx). Null for any other link.
 */
const CONTENT_ROOT = join(process.cwd(), 'content', 'docs');
const linkedFrontmatter = new Map<string, { tier: string; diataxis: string | null } | null>();
function frontmatterOf(href: string): { tier: string; diataxis: string | null } | null {
  const m = href.match(/^\/docs\/(idml|paged)\/([^?#]*?)\/?(?:[?#].*)?$/);
  if (!m) return null;
  if (linkedFrontmatter.has(href)) return linkedFrontmatter.get(href)!;
  let pillar = m[1];
  let rest = m[2];
  if (pillar === 'idml' && (ENGINE_CHAPTERS as readonly string[]).includes(rest.split('/')[0])) {
    pillar = 'paged';
    rest = `engine/${rest}`;
  }
  const file = [join(CONTENT_ROOT, pillar, `${rest}.mdx`), join(CONTENT_ROOT, pillar, rest, 'index.mdx')].find(existsSync);
  const head = file ? readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '' : '';
  const tier = head.match(/^tier:\s*["']?([\w-]+)/m)?.[1];
  const result = tier ? { tier, diataxis: head.match(/^diataxis:\s*["']?([\w-]+)/m)?.[1] ?? null } : null;
  linkedFrontmatter.set(href, result);
  return result;
}

/** The tier mark (lib/tiers.ts) as hast: depth glyph, tier name, numeral, mode. */
function tierMark(tier: string, diataxis: string | null): HastNode | null {
  if (!isTier(tier)) return null;
  const meta = TIER_META[tier];
  const glyph: HastNode = {
    type: 'element',
    tagName: 'svg',
    properties: {
      width: 14,
      height: 14,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
    },
    children: TIER_GLYPH_PATHS[tier].map((d) => ({ type: 'element', tagName: 'path', properties: { d }, children: [] })),
  };
  const children: HastNode[] = [
    glyph,
    { type: 'text', value: meta.label },
    { type: 'element', tagName: 'span', properties: { className: ['paged-card-tier-numeral'] }, children: [{ type: 'text', value: meta.numeral }] },
  ];
  if (diataxis) children.push({ type: 'text', value: `· ${diataxis}` });
  return { type: 'element', tagName: 'span', properties: { className: ['paged-card-tier'], title: `Tier: ${meta.label}` }, children };
}

function hrefOf(node: HastNode | undefined): string | null {
  if (!node) return null;
  if (node.tagName === 'a') return typeof node.properties?.href === 'string' ? node.properties.href : null;
  const a = (node.children || []).find((c) => c.type === 'element' && c.tagName === 'a');
  return hrefOf(a);
}

/**
 * Navigation bullet lists — every item is a bold link (`- **[Title](href)** — …`)
 * — become a brand card grid (the home "where to begin" format): mark the <ul>
 * and wrap each item's trailing description so the title reads as a serif card
 * head over a sans description. A card whose link is a docs page carries that
 * page's tier mark, read from its frontmatter, so lists never hand-type tiers.
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
        const head = kids[i];
        const linked = frontmatterOf(hrefOf(head) ?? '');
        const mark = linked ? tierMark(linked.tier, linked.diataxis) : null;
        const rest = kids.slice(i + 1);
        // strip a leading em/en dash or colon + spaces from the description
        if (rest[0]?.type === 'text' && rest[0].value) rest[0].value = rest[0].value.replace(/^[\s—–:-]+/, '');
        const span: HastNode | null = rest.length
          ? { type: 'element', tagName: 'span', properties: { className: ['paged-card-desc'] }, children: rest }
          : null;
        content.children = [...kids.slice(0, i + 1), ...(mark ? [mark] : []), ...(span ? [span] : [])];
      }
    });
  };
}

/**
 * Glossary entries — paragraphs written `**Term** — definition` on a glossary
 * page — get a stable anchor (`id`, from lib/glossary termId) so usage
 * elsewhere can link `/docs/idml/glossary#<id>`. Only runs on glossary pages.
 */
function rehypeGlossaryAnchors() {
  return (tree: HastNode, file: { path?: string; history?: string[] }) => {
    const path = file.path ?? file.history?.[file.history.length - 1] ?? '';
    if (!/[\\/]glossary[\\/]index\.mdx?$/.test(path)) return;
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'p') return;
      const kids = node.children || [];
      const first = kids[0];
      if (!first || first.type !== 'element' || first.tagName !== 'strong') return;
      const next = kids[1];
      if (!next || next.type !== 'text' || !/^\s*—\s/.test(next.value ?? '')) return;
      const id = termId(textOf(first));
      if (!id) return;
      node.properties = { ...(node.properties || {}), id };
      addClass(node, 'paged-term');
    });
  };
}

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [rehypeInShort, rehypeCardList, rehypeGlossaryAnchors],
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
