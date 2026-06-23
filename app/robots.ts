import type { MetadataRoute } from 'next';

// Emit a static robots.txt into the export (output: 'export').
export const dynamic = 'force-static';

// Crawling is allowed site-wide; per-page `noindex` (derived from status) does
// the gating, not a blanket disallow — so finished pages are found while stubs
// stay out of the index (briefing §8).
// AI answer-engine crawlers, allowed explicitly (GEO). They are already covered
// by the `*` rule, but naming them documents intent and gives a single place to
// restrict a specific bot later. Per-page `noindex` (from status) still gates
// stubs out of every index.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: 'https://docs.paged.media/sitemap.xml',
    host: 'https://docs.paged.media',
  };
}
