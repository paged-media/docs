import { source } from '@/lib/source';
import { searchKind } from '@/lib/search-kinds';
import { canonicalPath } from '@/lib/metadata';
import { absoluteUrl, site, SITE_ID } from '@/lib/site';

/**
 * /search-index.json — every page of this site in one small static file, for
 * the search on paged.media (docs/adr/810-next-edition-chrome.md): its ⌘K
 * dialog fetches this file from docs.paged.media and idml.paged.media and
 * lists the pages beside its own. Served with `Access-Control-Allow-Origin: *`
 * (public/_headers). The Orama index at /api/search, which this site's own
 * dialog and the other docs site read (ADR 808), is unchanged.
 *
 * Schema `paged.search.index/1`:
 *   { schema, site: "paged" | "idml", origin, generatedAt,
 *     pages: [{ title, url (absolute, canonical), kind, description }] }
 * `kind` is the label search shows for the page (lib/search-kinds.ts).
 */
export const dynamic = 'force-static';
export const revalidate = false;

export interface SearchIndexPage {
  title: string;
  url: string;
  kind: string;
  description: string;
}

export function GET() {
  const pages: SearchIndexPage[] = source
    .getPages()
    .map((page) => ({
      title: page.data.title ?? page.url,
      url: absoluteUrl(canonicalPath(page.url)),
      kind: searchKind(SITE_ID, page.url).name,
      description: page.data.description ?? '',
    }))
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  const body = {
    schema: 'paged.search.index/1',
    site: SITE_ID,
    origin: site.origin,
    generatedAt: new Date().toISOString(),
    pages,
  };
  return Response.json(body);
}
