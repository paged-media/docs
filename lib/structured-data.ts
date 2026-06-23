/**
 * Structured data (JSON-LD) builders — generated per page from frontmatter +
 * the page's own Markdown, never hand-authored. Three schema.org types:
 *
 *   TechArticle    — the page itself (headline, description, dateModified).
 *   BreadcrumbList — Home › Pillar › Section › Page, from the route.
 *   FAQPage        — parsed from the page's "Frequently asked questions" section.
 *
 * Every page in this reference ends with FAQs (the page contract), so the
 * FAQPage block is high-leverage for both rich results and GEO citations. When
 * a page has no FAQ section, that block is simply omitted.
 */
const BASE = 'https://docs.paged.media';

export interface FaqPair {
  q: string;
  a: string;
}

/**
 * Pull Q/A pairs out of the processed Markdown. The contract writes the FAQ as a
 * `## Frequently asked questions` section of `**Question?**` lines each followed
 * by an answer paragraph. Returns [] when there is no such section.
 */
export function parseFaq(markdown: string): FaqPair[] {
  if (!markdown) return [];
  // The heading may carry a Fumadocs anchor suffix, e.g.
  // "## Frequently asked questions [#frequently-asked-questions]".
  const m = markdown.match(/^#{2,3}\s+Frequently asked questions\b.*$/im);
  if (!m || m.index === undefined) return [];
  let section = markdown.slice(m.index + m[0].length);
  // Stop at the next same-or-higher heading.
  const next = section.search(/^#{1,3}\s+/m);
  if (next > 0) section = section.slice(0, next);

  const pairs: FaqPair[] = [];
  // Each question is a line that is entirely bold and ends with "?".
  const re = /^\s*\*\*(.+?)\*\*\s*$/gm;
  const matches = [...section.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const q = matches[i][1].trim();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? section.length : section.length;
    const a = section
      .slice(start, end)
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip md links → text
      .replace(/`/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

export interface BreadcrumbCrumb {
  name: string;
  url: string;
}

export function buildJsonLd(opts: {
  title: string;
  description?: string;
  url: string; // page.url, e.g. /docs/idml/stories-text
  dateModified?: string;
  crumbs: BreadcrumbCrumb[];
  faq: FaqPair[];
}): object {
  const { title, description, url, dateModified, crumbs, faq } = opts;
  const graph: object[] = [];

  graph.push({
    '@type': 'TechArticle',
    '@id': `${BASE}${url}#article`,
    headline: title,
    ...(description ? { description } : {}),
    ...(dateModified ? { dateModified } : {}),
    inLanguage: 'en',
    url: `${BASE}${url}`,
    isPartOf: { '@type': 'WebSite', name: 'Paged Documentation', url: BASE },
    author: { '@type': 'Organization', name: 'Paged' },
    publisher: { '@type': 'Organization', name: 'Paged' },
  });

  if (crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: `${BASE}${c.url}`,
      })),
    });
  }

  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((p) => ({
        '@type': 'Question',
        name: p.q,
        acceptedAnswer: { '@type': 'Answer', text: p.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
