import type { Tier, Diataxis, Status } from '@/lib/frontmatter';
import { Pic } from '@/components/icons';
import { TIER_META } from '@/lib/tiers';

// Form, never color: the tier reads as a TYPOGRAPHIC depth glyph (one line → a
// paragraph → a full spread) plus a roman numeral — no emoji, no color-only
// signal (the brand bans both). Survives greyscale. lib/tiers.ts holds the mark.
const ICON: Record<Tier, string> = {
  beginner: 'tierBeginner',
  intermediate: 'tierIntermediate',
  pro: 'tierPro',
};

/**
 * The difficulty label (briefing §4) — not decoration. It drives reading paths,
 * warns readers off the wrong tier, and is the first thing a reviewer checks.
 * Rendered automatically from frontmatter at the top of every page, so the
 * visible label and the `tier`/`diataxis` fields can never disagree.
 */
export function DifficultyLabel({ tier, mode, status }: { tier: Tier; mode: Diataxis; status?: Status }) {
  const t = { ...TIER_META[tier], icon: ICON[tier] };
  return (
    <div
      className="not-prose"
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        width: 'fit-content',
        alignItems: 'center',
        gap: 9,
        margin: '0 0 var(--space-5)',
        padding: '6px 12px',
        border: '1px solid var(--color-rule)',
        borderRadius: 2,
        background: 'var(--color-paper-soft)',
      }}
    >
      <Pic name={t.icon} size={16} color="var(--color-ink-soft)" title={`Tier: ${t.label}`} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
        {t.label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
        }}
      >
        {t.numeral}
      </span>
      <span aria-hidden style={{ color: 'var(--color-rule-strong)' }}>
        ·
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-muted)' }}>{mode}</span>
      {status && status !== 'published' ? (
        <span className="paged-draft-mark" title="This page is still being written and may change">
          Draft
        </span>
      ) : null}
    </div>
  );
}
