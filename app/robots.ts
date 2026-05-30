import type { MetadataRoute } from 'next';

// Emit a static robots.txt into the export (output: 'export').
export const dynamic = 'force-static';

// Crawling is allowed site-wide; per-page `noindex` (derived from status) does
// the gating, not a blanket disallow — so finished pages are found while stubs
// stay out of the index (briefing §8).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://docs.paged.media/sitemap.xml',
    host: 'https://docs.paged.media',
  };
}
