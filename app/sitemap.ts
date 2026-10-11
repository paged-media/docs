import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { isIndexable, canonicalPath } from '@/lib/metadata';
import { absoluteUrl } from '@/lib/site';
import type { Status } from '@/lib/frontmatter';

// Emit a static sitemap.xml into the export (output: 'export').
export const dynamic = 'force-static';

// The home page and chapter indexes rank above leaf pages.
function priorityFor(path: string): number {
  if (path === '/') return 1.0;
  return path.split('/').filter(Boolean).length <= 1 ? 0.8 : 0.6;
}

// Every indexable page of THIS site, at its canonical (trailing-slash) URL.
// `lastModified` comes from the page's `reviewed` date (when prose was last
// checked against the system), so the sitemap carries a real freshness signal.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source
    .getPages()
    .filter((page) => isIndexable(page.data.status as Status))
    .map((page) => {
      const path = canonicalPath(page.url);
      const reviewed = (page.data as { reviewed?: string }).reviewed;
      return {
        url: absoluteUrl(path),
        lastModified: reviewed ? new Date(reviewed) : undefined,
        changeFrequency: 'weekly' as const,
        priority: priorityFor(path),
      };
    });
  return [{ url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1.0 }, ...pages];
}
