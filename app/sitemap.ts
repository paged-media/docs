import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { isIndexable } from '@/lib/metadata';
import type { Status } from '@/lib/frontmatter';

const BASE = 'https://docs.paged.media';

// Only finished (status: published) pages enter the sitemap — crawlers see
// depth, not stubs (briefing §8). Same derived rule as the per-page robots tag.
export default function sitemap(): MetadataRoute.Sitemap {
  return source
    .getPages()
    .filter((page) => isIndexable(page.data.status as Status))
    .map((page) => ({
      url: `${BASE}${page.url}`,
      changeFrequency: 'weekly' as const,
    }));
}
