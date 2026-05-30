/**
 * Renderer-support badge (honesty mechanism for "format-complete" coverage).
 *
 * This is a *format* reference: we document the full IDML surface, including
 * constructs the Paged renderer does not yet fully handle. Every such feature
 * carries one of these badges so readers always know where they stand. The same
 * statuses are tracked privately in thoughts/docs/paged/renderer-gaps.md.
 */
export type SupportStatus = 'supported' | 'parsed-not-rendered' | 'not-yet-parsed';

const STYLES: Record<SupportStatus, { label: string; cls: string }> = {
  supported: {
    label: 'Supported',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  'parsed-not-rendered': {
    label: 'Parsed, not yet rendered',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  'not-yet-parsed': {
    label: 'Not yet parsed',
    cls: 'border-fd-border bg-fd-muted text-fd-muted-foreground',
  },
};

export function SupportBadge({
  status,
  note,
  compact = false,
}: {
  status: SupportStatus;
  note?: string;
  compact?: boolean;
}) {
  const s = STYLES[status];
  return (
    <span className="not-prose inline-flex items-baseline gap-1.5 align-middle">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}
      >
        {s.label}
      </span>
      {!compact && note ? <span className="text-xs text-fd-muted-foreground">{note}</span> : null}
    </span>
  );
}
