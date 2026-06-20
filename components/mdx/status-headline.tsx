/**
 * <StatusHeadline /> — the live headline stats band, generated from the state
 * registry (`.generated/matrix.json` → headline). Mirrors the numbers on the
 * state dashboard; nothing hand-typed.
 */
import { getMatrix } from '@/lib/generated';

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: 'valid' | 'warn' | 'muted' }) {
  const color = tone === 'valid' ? 'var(--valid)' : tone === 'warn' ? 'var(--warn)' : 'var(--color-fg, inherit)';
  return (
    <div
      style={{
        flex: '1 1 90px',
        minWidth: 90,
        border: '1px solid var(--color-rule)',
        borderRadius: 4,
        padding: '10px 12px',
        background: 'color-mix(in srgb, var(--color-rule) 10%, transparent)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 680, lineHeight: 1.1, color }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-muted)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

export function StatusHeadline() {
  const { headline: h, sourceCommit, chapters } = getMatrix();
  if (!h || h.total == null) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No registry data. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Stat value={h.total ?? '—'} label="Capabilities" />
        <Stat value={`${h.shipped_pct ?? '—'}%`} label="Shipped" />
        <Stat value={`${h.green_pct ?? '—'}%`} label="Green of shipped" tone="valid" />
        <Stat value={h.failing ?? 0} label="Failing" tone={(h.failing ?? 0) > 0 ? 'warn' : 'muted'} />
        <Stat value={h.shipped_untested ?? 0} label="Untested" tone={(h.shipped_untested ?? 0) > 0 ? 'warn' : 'muted'} />
        <Stat value={h.open_bugs ?? 0} label="Open bugs" tone={(h.open_bugs ?? 0) > 0 ? 'warn' : 'muted'} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>
        {chapters.length} chapters · generated from the capability registry{sourceCommit ? ` @ ${sourceCommit.slice(0, 8)}` : ''}.
      </p>
    </div>
  );
}
