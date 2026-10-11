import { ImageResponse } from 'next/og';
import { site, SITE_ID } from '@/lib/site';

// The site's social card, rendered once at build time into the export as
// /opengraph-image.png (lib/metadata.ts OG_IMAGE points every page at it).
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
          background: '#f6f0e6',
          padding: '72px 80px',
          borderTop: '16px solid #8f1d1f',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', color: '#8f1d1f' }}>
          {c.eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: '#151412', lineHeight: 1 }}>{c.title}</div>
          <div style={{ display: 'flex', fontSize: 40, color: '#3e3a35', marginTop: 28 }}>{c.sub}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#3e3a35' }}>{site.name} · paged.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
