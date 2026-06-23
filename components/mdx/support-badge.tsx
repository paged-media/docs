/**
 * Renderer-support badge — the public honesty signal beside every IDML feature.
 *
 * Preferred form: `<SupportBadge feature="chapter.feature" />`. The status is
 * resolved LIVE from the capability registry (state.json → `.generated/
 * support-map.json`, via lib/generated) and reflects both the claim AND the test
 * evidence: "Supported · verified" / "Supported · untested" / "Supported ·
 * failing" / "Parsed, partly rendered" / "Parsed, not rendered" / "Planned".
 * It links to that feature's row in the capability matrix. There is nothing to
 * hand-maintain — when the engine changes, the registry changes, the badge
 * changes on the next build.
 *
 * Legacy form: `<SupportBadge status="supported" />` still renders (a static
 * chip with no live link) for the handful of documented constructs the registry
 * does not yet track at this granularity. `scripts/check-feature-refs.mjs`
 * gates every `feature=` id against the registry.
 *
 * Form, not color: the label text carries the meaning (survives greyscale); the
 * color only reinforces it, using the brand app-status palette.
 */
import Link from 'fumadocs-core/link';
import { getSupportFeature, type BadgeTone } from '@/lib/generated';

export type SupportStatus = 'supported' | 'parsed-not-rendered' | 'not-yet-parsed';

const TONE_COLOR: Record<BadgeTone, string> = {
  valid: 'var(--valid)',
  'valid-muted': 'color-mix(in srgb, var(--valid) 62%, var(--color-muted))',
  warn: 'var(--warn)',
  muted: 'var(--color-muted)',
};

// Legacy status → label/tone, for constructs not yet in the registry.
const LEGACY: Record<SupportStatus, { label: string; tone: BadgeTone }> = {
  supported: { label: 'Supported', tone: 'valid' },
  'parsed-not-rendered': { label: 'Parsed, not rendered', tone: 'warn' },
  'not-yet-parsed': { label: 'Not yet parsed', tone: 'muted' },
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        border: `1px solid color-mix(in srgb, ${color} 45%, var(--color-rule))`,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        padding: '2px 7px',
        fontFamily: 'var(--font-sans)',
        fontSize: 10.5,
        fontWeight: 640,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export function SupportBadge({
  feature,
  status,
  note,
  compact = false,
}: {
  feature?: string;
  status?: SupportStatus;
  note?: string;
  compact?: boolean;
}) {
  let label: string;
  let color: string;
  let href: string | undefined;

  if (feature) {
    const f = getSupportFeature(feature);
    if (f) {
      label = f.badge.label;
      color = TONE_COLOR[f.badge.tone];
      href = `/docs/paged/state/matrix#${feature}`;
    } else {
      // Unknown id — render visibly so it surfaces in review; check-feature-refs fails the build.
      label = `unmapped: ${feature}`;
      color = TONE_COLOR.muted;
    }
  } else if (status) {
    const l = LEGACY[status] ?? { label: status, tone: 'muted' as BadgeTone };
    label = l.label;
    color = TONE_COLOR[l.tone];
  } else {
    label = 'unknown';
    color = TONE_COLOR.muted;
  }

  const chip = href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Chip label={label} color={color} />
    </Link>
  ) : (
    <Chip label={label} color={color} />
  );

  return (
    <span className="not-prose" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, verticalAlign: 'middle' }}>
      {chip}
      {!compact && note ? (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-muted)' }}>{note}</span>
      ) : null}
    </span>
  );
}
