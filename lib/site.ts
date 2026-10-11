/**
 * Which of the two sites this build produces. One repo, two static exports
 * (ADR 805):
 *
 *   SITE=idml   → idml.paged.media — the IDML format reference (content/docs/idml)
 *   SITE=paged  → docs.paged.media — the Paged platform docs   (content/docs/paged)
 *
 * Both serve their pages from the root (`/<chapter>/<page>/`). Content keeps
 * writing site-neutral links — `/docs/idml/<path>` and `/docs/paged/<path>` —
 * and `resolveHref` turns them into a root path on the owning site or an
 * absolute URL on the other one, so a page reads the same in either build and
 * a chapter can move between sites without touching its prose.
 */
export type SiteId = 'idml' | 'paged';

export interface SiteConfig {
  id: SiteId;
  origin: string;
  /** The site's name, as search results and the title suffix show it. */
  name: string;
  /** Home page <title>. */
  homeTitle: string;
  description: string;
}

export const SITES: Record<SiteId, SiteConfig> = {
  idml: {
    id: 'idml',
    origin: 'https://idml.paged.media',
    name: 'IDML Reference',
    homeTitle: 'IDML Reference — the InDesign Markup Language format, explained',
    description:
      'An independent, in-depth reference for IDML, the InDesign Markup Language: the package, ' +
      'spreads and pages, stories, styles, tables, colour and graphics, with validated examples.',
  },
  paged: {
    id: 'paged',
    origin: 'https://docs.paged.media',
    name: 'Paged Docs',
    homeTitle: 'Paged Docs — the open-source engine, editor, SDK and plugins for IDML',
    description:
      'Documentation for Paged, the open-source system that reads, renders and edits IDML: ' +
      'the WebGPU render engine, viewer SDK, paged.* scripting, CLI and plugin SDK.',
  },
};

function siteFromEnv(): SiteId {
  const v = process.env.SITE ?? process.env.NEXT_PUBLIC_SITE ?? 'paged';
  if (v !== 'idml' && v !== 'paged') throw new Error(`SITE must be "idml" or "paged", got "${v}"`);
  return v;
}

export const SITE_ID: SiteId = siteFromEnv();
export const site: SiteConfig = SITES[SITE_ID];

/**
 * IDML chapters that describe Paged's own engine rather than the format. They
 * live on docs.paged.media under /engine/, and an old `/docs/idml/<chapter>`
 * link still reaches them.
 */
export const ENGINE_CHAPTERS = ['the-renderer', 'parser-internals', 'test-corpus'] as const;

/** `/a/b` → `/a/b/`: the export serves every page at its trailing-slash URL. */
function withSlash(path: string): string {
  return path.endsWith('/') || /\.[a-z0-9]+$/i.test(path) ? path : `${path}/`;
}

/** The owning site and its root-relative path for a site-neutral href. */
function locate(href: string): { site: SiteId; path: string } | null {
  const m = href.match(/^\/docs\/(idml|paged)(\/[^?#]*)?([?#].*)?$/);
  if (!m) return null;
  const pillar = m[1] as SiteId;
  const rest = withSlash(m[2] ?? '/').replace(/^\/+/, '');
  const tail = m[3] ?? '';
  if (pillar === 'idml') {
    const chapter = rest.split('/')[0];
    if ((ENGINE_CHAPTERS as readonly string[]).includes(chapter)) {
      return { site: 'paged', path: `/engine/${rest}${tail}` };
    }
  }
  return { site: pillar, path: `/${rest}${tail}` };
}

/**
 * Resolve a link for this build. Site-neutral `/docs/<pillar>/…` links become a
 * root path here or an absolute URL on the sibling site; anything else passes
 * through untouched.
 */
export function resolveHref(href: string): string {
  const loc = locate(href);
  if (!loc) return href;
  return loc.site === SITE_ID ? loc.path : `${SITES[loc.site].origin}${loc.path}`;
}

/** An absolute URL on this site for a root-relative path. */
export function absoluteUrl(path: string): string {
  return `${site.origin}${path.startsWith('/') ? path : `/${path}`}`;
}
