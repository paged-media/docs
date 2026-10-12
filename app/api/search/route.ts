import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { searchKind } from '@/lib/search-kinds';
import { SITE_ID } from '@/lib/site';

// Static in-site search for the export: `staticGET` emits a static
// search index into the export (no server route), which the client loads via
// Fumadocs' `type: 'static'` search (configured on RootProvider). A hosted
// search service is a later upgrade once content stabilizes (briefing §7).
//
// Every page is tagged with its kind (lib/search-kinds.ts: guide, element,
// cookbook, API, …) so the search dialog can filter to one kind.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, {
  async buildIndex(page) {
    // As Fumadocs' default buildIndex reads it: a value, a getter, or behind load().
    const data = page.data as { structuredData?: unknown; load?: () => Promise<{ structuredData: unknown }> };
    const sd = data.structuredData;
    const structuredData = typeof sd === 'function' ? await sd() : (sd ?? (await data.load?.())?.structuredData);
    return {
      id: page.url,
      url: page.url,
      title: page.data.title ?? page.url,
      description: page.data.description,
      structuredData: structuredData as never,
      tag: searchKind(SITE_ID, page.url).value,
    };
  },
});
