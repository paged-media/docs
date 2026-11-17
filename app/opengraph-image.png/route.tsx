import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { site, SITE_ID } from '@/lib/site';

// The site's social card, rendered once at build time into the export as
// /opengraph-image.png (lib/metadata.ts OG_IMAGE points every page at it).
// The colours are the brand tokens' (app/brand.css: paper, ink, ink-soft,
// muted, accent); an image renderer cannot read CSS variables, so they are
// written out here and follow the tokens by hand. The type is the brand's,
// Newsreader and DM Sans, from the static WOFF files beside this route
// (fonts/README.md): next/og reads no WOFF2 and, given no font, draws in its
// own fallback.
export const dynamic = 'force-static';
export const revalidate = false;

const INK = '#171815';
const INK_SOFT = '#383a36';
const MUTED = '#63645d';
const PAPER = '#f3f0e8';
const ACCENT = '#b51f19';

const CARD = {
  idml: {
    eyebrow: 'idml.paged.media',
    edition: 'The independent format atlas',
    title: ['The IDML', 'reference.'],
    sub: 'The InDesign Markup Language format, explained',
  },
  paged: {
    eyebrow: 'docs.paged.media',
    edition: 'The technical edition',
    title: ['Paged', 'documentation.'],
    sub: 'Render, script and extend IDML in the open',
  },
} as const;

const font = (file: string) => readFileSync(join(process.cwd(), 'app', 'opengraph-image.png', 'fonts', file));

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
          background: PAPER,
          padding: '56px 80px 60px',
          fontFamily: 'DM Sans',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22, borderBottom: `2px solid ${INK}` }}>
          <div style={{ display: 'flex', fontFamily: 'Newsreader', fontWeight: 600, fontSize: 60, letterSpacing: -2.6, color: INK, lineHeight: 1 }}>
            Paged<span style={{ color: ACCENT }}>.</span>
          </div>
          <div style={{ display: 'flex', fontWeight: 700, fontSize: 19, letterSpacing: 3.6, textTransform: 'uppercase', color: MUTED }}>{c.edition}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontWeight: 700, fontSize: 21, letterSpacing: 4, textTransform: 'uppercase', color: ACCENT }}>{c.eyebrow}</div>
          <div style={{ display: 'flex', fontFamily: 'Newsreader', fontWeight: 400, fontSize: 112, lineHeight: 0.98, letterSpacing: -5.4, color: INK, marginTop: 24 }}>
            {c.title[0]}
          </div>
          <div
            style={{ display: 'flex', fontFamily: 'Newsreader', fontStyle: 'italic', fontWeight: 300, fontSize: 112, lineHeight: 0.98, letterSpacing: -5.4, color: ACCENT }}
          >
            {c.title[1]}
          </div>
          <div style={{ display: 'flex', fontWeight: 400, fontSize: 32, color: INK_SOFT, marginTop: 28 }}>{c.sub}</div>
        </div>
        <div style={{ display: 'flex', fontWeight: 400, fontSize: 22, color: MUTED }}>{site.name} · the open publishing system</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Newsreader', data: font('newsreader-latin-400-normal.woff'), weight: 400, style: 'normal' },
        { name: 'Newsreader', data: font('newsreader-latin-300-italic.woff'), weight: 300, style: 'italic' },
        { name: 'Newsreader', data: font('newsreader-latin-600-normal.woff'), weight: 600, style: 'normal' },
        { name: 'DM Sans', data: font('dm-sans-latin-400-normal.woff'), weight: 400, style: 'normal' },
        { name: 'DM Sans', data: font('dm-sans-latin-700-normal.woff'), weight: 700, style: 'normal' },
      ],
    },
  );
}
