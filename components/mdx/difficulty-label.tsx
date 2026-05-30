import type { Tier, Diataxis } from '@/lib/frontmatter';

const TIERS: Record<Tier, { dot: string; label: string }> = {
  beginner: { dot: '🟢', label: 'Beginner' },
  intermediate: { dot: '🟡', label: 'Intermediate' },
  pro: { dot: '🔴', label: 'Pro' },
};

/**
 * The difficulty label (briefing §4) — not decoration. It drives reading paths,
 * warns readers off the wrong tier, and is the first thing a reviewer checks.
 * Rendered automatically from frontmatter at the top of every page, so the
 * visible label and the `tier`/`diataxis` fields can never disagree.
 */
export function DifficultyLabel({ tier, mode }: { tier: Tier; mode: Diataxis }) {
  const t = TIERS[tier];
  return (
    <div className="not-prose mb-4 inline-flex items-center gap-2 rounded-full border border-fd-border px-3 py-1 text-sm">
      <span aria-hidden>{t.dot}</span>
      <span className="font-medium">{t.label}</span>
      <span className="text-fd-muted-foreground">· {mode}</span>
    </div>
  );
}
