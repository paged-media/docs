import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { isIndexable } from '@/lib/metadata';
import type { Status } from '@/lib/frontmatter';

// Emit a static sitemap.xml into the export (output: 'export').
export const dynamic = 'force-static';

const BASE = 'https://docs.paged.media';

// Pillar/section landings rank above leaf pages; everything else is a notch
// below so the two entry points and chapter indexes surface first.
function priorityFor(url: string): number {
  if (url === '/docs' || url === '/docs/idml' || url === '/docs/paged') return 1.0;
  const depth = url.replace(/\/$/, '').split('/').length; // /docs/idml/styles → 4
  return depth <= 4 ? 0.8 : 0.6;
}

// Only finished (status: published) pages enter the sitemap — crawlers see
// depth, not stubs (briefing §8). Same derived rule as the per-page robots tag.
// `lastModified` comes from the page's `reviewed` date (when prose was last
// checked against the system), so the sitemap carries a real freshness signal.
export default function sitemap(): MetadataRoute.Sitemap {
  return source
    .getPages()
    .filter((page) => isIndexable(page.data.status as Status))
    .map((page) => {
      const reviewed = (page.data as { reviewed?: string }).reviewed;
      return {
        url: `${BASE}${page.url}`,
        lastModified: reviewed ? new Date(reviewed) : undefined,
        changeFrequency: 'weekly' as const,
        priority: priorityFor(page.url),
      };
    });
}
