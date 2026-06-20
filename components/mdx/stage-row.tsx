/**
 * <StageRow feature="chapter.feature" /> — the per-stage status of ONE feature,
 * inline, from `.generated/support-map.json`. For when a page wants to show how
 * far a single capability has progressed across parser / renderer / mutation
 * without the full matrix.
 */
import { getSupportFeature, type StageCell } from '@/lib/generated';

function dot(cell: StageCell): { glyph: string; color: string; title: string } {
  if (cell.impl === 'shipped')
    return cell.evidence === 'green'
      ? { glyph: '●', color: 'var(--valid)', title: 'shipped · verified' }
      : cell.evidence === 'red'
        ? { glyph: '✗', color: 'var(--warn)', title: 'shipped · failing' }
        : { glyph: '◍', color: 'color-mix(in srgb, var(--valid) 60%, var(--color-muted))', title: 'shipped · untested' };
  if (cell.impl === 'partial') return { glyph: '◐', color: 'var(--warn)', title: 'partial' };
  if (cell.impl === 'planned') return { glyph: '·', color: 'var(--color-muted)', title: 'planned' };
  return { glyph: '–', color: 'var(--color-muted)', title: 'n/a' };
}

function Cell({ label, cell }: { label: string; cell: StageCell }) {
  const d = dot(cell);
  return (
    <span
      title={`${label}: ${d.title}${cell.note ? ` — ${cell.note}` : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 12 }}
    >
      <span style={{ color: d.color, fontSize: 13 }}>{d.glyph}</span>
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
    </span>
  );
}

export function StageRow({ feature }: { feature: string }) {
  const f = getSupportFeature(feature);
  if (!f) {
    return (
      <span className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 12 }}>
        unmapped: <code>{feature}</code>
      </span>
    );
  }
  return (
    <span className="not-prose" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', verticalAlign: 'middle' }}>
      <Cell label="Parse" cell={f.parser} />
      <Cell label="Render" cell={f.renderer} />
      <Cell label="Mutate" cell={f.mutation} />
    </span>
  );
}
