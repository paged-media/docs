import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

// Emit a static robots.txt into the export (output: 'export').
export const dynamic = 'force-static';

// Crawling is allowed site-wide; every page is indexable (lib/metadata.ts).
// AI answer-engine crawlers, allowed explicitly (GEO). They are already covered
// by the `*` rule, but naming them documents intent and gives a single place to
// restrict a specific bot later.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${site.origin}/sitemap.xml`,
    host: site.origin,
  };
}
