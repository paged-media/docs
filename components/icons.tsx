import type { CSSProperties, ReactNode } from 'react';

/**
 * The Paged crafted publishing icon set — ported verbatim from the brand UI kit
 * (`brand/ui_kits/docs/Icons.jsx`). Line-based, 24×24, stroke 1.6, currentColor,
 * round caps/joins. The spec-defined glyphs (page, spread, textFrame, kerning,
 * baseline, xml, renderer, package) are used as-authored; the rest match.
 *
 * Reader-tier glyphs (tierBeginner/Intermediate/Pro) encode depth as TYPOGRAPHIC
 * FORM — one line → a paragraph → a full spread — so the tier reads in greyscale
 * (the brand bans color-only meaning, and bans emoji entirely).
 */
export const ICONS: Record<string, ReactNode> = {
  page: (<g><path d="M7 3.5h7l3 3v14H7z" /><path d="M14 3.5v3h3" /><path d="M9.5 10h5" /><path d="M9.5 13h5" /><path d="M9.5 16h3.5" /></g>),
  spread: (<g><path d="M4 5.5h7.25v13H4z" /><path d="M12.75 5.5H20v13h-7.25z" /><path d="M12 5.5v13" /><path d="M6.5 9h2.5" /><path d="M15 9h2.5" /><path d="M6.5 12h2.5" /><path d="M15 12h2.5" /></g>),
  textFrame: (<g><rect x="4.5" y="5" width="15" height="14" rx="0.5" /><path d="M7.5 8.5h9" /><path d="M7.5 11.5h9" /><path d="M7.5 14.5h6" /><path d="M4.5 5h2" /><path d="M17.5 19h2" /></g>),
  imageFrame: (<g><rect x="4.5" y="5" width="15" height="14" rx="0.5" /><circle cx="9" cy="9.5" r="1.4" /><path d="M5 17l4.5-4.5 3.5 3.5 2.5-2.5L19 17" /></g>),
  kerning: (<g><path d="M5 18l4-12 4 12" /><path d="M7 13h4" /><path d="M14.5 6l2.25 12" /><path d="M20 6l-3.25 12" /><path d="M12.75 20h2.5" /><path d="M12.75 20l1-1" /><path d="M15.25 20l-1-1" /></g>),
  baseline: (<g><path d="M4 18h16" /><path d="M7 18l3.5-10h3L17 18" /><path d="M9 14h6" /><path d="M4 6h16" opacity="0.4" /><path d="M4 10h16" opacity="0.4" /><path d="M4 14h16" opacity="0.4" /></g>),
  xml: (<g><path d="M8.5 7L4 12l4.5 5" /><path d="M15.5 7L20 12l-4.5 5" /><path d="M13.5 5.5l-3 13" /></g>),
  renderer: (<g><path d="M5 4.5h14v6H5z" /><path d="M7 7.5h5" /><path d="M5 14h14v5.5H5z" /><path d="M8 16.75h8" /><path d="M12 10.5v3.5" /><path d="M10.5 12.5L12 14l1.5-1.5" /></g>),
  package: (<g><path d="M4.5 8l7.5-4 7.5 4v8l-7.5 4-7.5-4z" /><path d="M4.5 8l7.5 4 7.5-4" /><path d="M12 12v8" /><path d="M8.25 6l7.5 4" /></g>),
  parser: (<g><path d="M9 5L4.5 5 4.5 19 9 19" opacity="0.5" /><path d="M15 5h4.5v14H15" opacity="0.5" /><path d="M9.5 9.5l2.5 2.5-2.5 2.5" /><path d="M13 15h2" /></g>),
  story: (<g><path d="M6 4.5h9l3 3V19a.5.5 0 01-.5.5H6z" /><path d="M15 4.5v3h3" /><path d="M8.5 11h7" /><path d="M8.5 13.5h7" /><path d="M8.5 16h4.5" /></g>),
  styleCascade: (<g><path d="M5 6h7" /><path d="M5 6v5" /><path d="M5 11h7" /><path d="M9 11v5" /><path d="M9 16h7" /><circle cx="14.5" cy="6" r="1.4" /><circle cx="14.5" cy="11" r="1.4" /><circle cx="18.5" cy="16" r="1.4" /></g>),
  glyph: (<g><path d="M7.5 18l4.5-12 4.5 12" /><path d="M9.4 13h5.2" /><path d="M5 20h4" opacity="0.45" /><path d="M15 20h4" opacity="0.45" /></g>),
  columns: (<g><rect x="4.5" y="5" width="15" height="14" rx="0.5" /><path d="M12 5v14" /><path d="M7 8.5h2.5" /><path d="M7 11h2.5" /><path d="M14.5 8.5H17" /><path d="M14.5 11H17" /></g>),
  margin: (<g><rect x="4" y="4.5" width="16" height="15" rx="0.5" /><rect x="7" y="7.5" width="10" height="9" rx="0.5" opacity="0.55" strokeDasharray="2 2" /><path d="M4 7.5h1.5" opacity="0.6" /><path d="M18.5 7.5H20" opacity="0.6" /></g>),
  book: (<g><path d="M5 4.5h9a3 3 0 013 3V19.5H8a3 3 0 01-3-3z" /><path d="M5 4.5v12" opacity="0.5" /><path d="M8 8.5h6" /><path d="M8 11.5h6" /></g>),
  search: (<g><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5L20 20" /></g>),
  menu: (<g><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></g>),
  chevronRight: (<path d="M9.5 5l7 7-7 7" />),
  arrowRight: (<g><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></g>),
  check: (<path d="M5 12.5l4.5 4.5L19 7" />),
  paragraph: (<g><path d="M9 4.5h8" /><path d="M13 4.5v15" /><path d="M9.5 4.5a3.5 3.5 0 000 7H10v-7" /></g>),
  external: (<g><path d="M14 5h5v5" /><path d="M19 5l-8 8" /><path d="M17 13.5V19H5V7h5.5" /></g>),
  // Reader tiers — typographic depth: one line → a paragraph → a full spread.
  tierBeginner: (<g><path d="M6 4.5h12v15H6z" /><path d="M9.5 12h5" /></g>),
  tierIntermediate: (<g><path d="M6 4.5h12v15H6z" /><path d="M9 9h6" /><path d="M9 12h6" /><path d="M9 15h4" /></g>),
  tierPro: (<g><path d="M3 5h8.5v14H3z" /><path d="M12.5 5H21v14h-8.5z" /><path d="M5.2 8.5h4.1" /><path d="M5.2 11h4.1" /><path d="M5.2 13.5h3" /><path d="M14.7 8.5H18.8" /><path d="M14.7 11H18.8" /><path d="M14.7 13.5H18.8" /></g>),
};

export type IconName = keyof typeof ICONS;

export function Pic({
  name,
  size = 24,
  stroke = 1.6,
  color = 'currentColor',
  title,
  style,
}: {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const body = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {title ? <title>{title}</title> : null}
      {body ?? null}
    </svg>
  );
}
