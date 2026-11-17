import { ImageResponse } from 'next/og';
import { site, SITE_ID } from '@/lib/site';

// The site's social card, rendered once at build time into the export as
// /opengraph-image.png (lib/metadata.ts OG_IMAGE points every page at it).
// The colours are the brand tokens' (app/brand.css: paper, ink, ink-soft,
// accent); an image renderer cannot read CSS variables, so they are written
// out here and follow the tokens by hand.
export const dynamic = 'force-static';
export const revalidate = false;

const CARD = {
  idml: { eyebrow: 'idml.paged.media', title: 'The IDML reference', sub: 'The InDesign Markup Language format, explained' },
  paged: { eyebrow: 'docs.paged.media', title: 'Paged documentation', sub: 'Render, script and extend IDML in the open' },
} as const;

export function GET() {
  const c = CARD[SITE_ID];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f3f0e8',
          padding: '72px 80px',
          borderTop: '16px solid #b51f19',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', color: '#b51f19' }}>
          {c.eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 400, color: '#171815', lineHeight: 1, letterSpacing: -4 }}>{c.title}</div>
          <div style={{ display: 'flex', fontSize: 40, color: '#383a36', marginTop: 28 }}>{c.sub}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#383a36' }}>{site.name} · Paged.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
