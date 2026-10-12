/**
 * The reader-tier mark, in one place: a typographic depth glyph (one line → a
 * paragraph → a full spread) plus a roman numeral. Form, never colour, never
 * emoji — the brand bans both — so it survives greyscale.
 *
 * Used by the page's DifficultyLabel, the icon set (components/icons.tsx), and
 * the card lists (source.config.ts rehypeCardList), which mark each card with
 * the tier of the page it links to.
 */
export type TierId = 'beginner' | 'intermediate' | 'pro';

export const TIER_META: Record<TierId, { label: string; numeral: string }> = {
  beginner: { label: 'Beginner', numeral: 'I' },
  intermediate: { label: 'Intermediate', numeral: 'II' },
  pro: { label: 'Pro', numeral: 'III' },
};

/** 24×24 line paths, stroke 1.6, round caps (the brand icon grid). */
export const TIER_GLYPH_PATHS: Record<TierId, string[]> = {
  beginner: ['M6 4.5h12v15H6z', 'M9.5 12h5'],
  intermediate: ['M6 4.5h12v15H6z', 'M9 9h6', 'M9 12h6', 'M9 15h4'],
  pro: [
    'M3 5h8.5v14H3z',
    'M12.5 5H21v14h-8.5z',
    'M5.2 8.5h4.1',
    'M5.2 11h4.1',
    'M5.2 13.5h3',
    'M14.7 8.5H18.8',
    'M14.7 11H18.8',
    'M14.7 13.5H18.8',
  ],
};

export function isTier(v: unknown): v is TierId {
  return v === 'beginner' || v === 'intermediate' || v === 'pro';
}
