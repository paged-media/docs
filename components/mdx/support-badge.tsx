/**
 * Renderer-support badge (honesty mechanism for "format-complete" coverage).
 *
 * This is a *format* reference: we document the full IDML surface, including
 * constructs the Paged renderer does not yet fully handle. Every such feature
 * carries one of these badges so readers always know where they stand. The same
 * statuses are tracked privately in thoughts/docs/paged/renderer-gaps.md.
 *
 * Styling uses the brand's app-status palette (`--valid` / `--warn`, the one
 * doc-chrome place that legitimately shows renderer status) on a hairline rule.
 * The label text carries the meaning — the color only reinforces it — so it
 * survives greyscale (form, not color).
 */
export type SupportStatus = 'supported' | 'parsed-not-rendered' | 'not-yet-parsed';

const STYLES: Record<SupportStatus, { label: string; color: string }> = {
  supported: { label: 'Supported', color: 'var(--valid)' },
  'parsed-not-rendered': { label: 'Parsed, not yet rendered', color: 'var(--warn)' },
  'not-yet-parsed': { label: 'Not yet parsed', color: 'var(--color-muted)' },
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
    <span
      className="not-prose"
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, verticalAlign: 'middle' }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 2,
          border: `1px solid color-mix(in srgb, ${s.color} 45%, var(--color-rule))`,
          background: `color-mix(in srgb, ${s.color} 8%, transparent)`,
          padding: '2px 7px',
          fontFamily: 'var(--font-sans)',
          fontSize: 10.5,
          fontWeight: 640,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: s.color,
          whiteSpace: 'nowrap',
        }}
      >
        {s.label}
      </span>
      {!compact && note ? (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-muted)' }}>{note}</span>
      ) : null}
    </span>
  );
}
