/**
 * <CapabilityMatrix /> — the live capability grid, generated from the state
 * registry (`.generated/matrix.json`). Replaces the old hand-authored
 * capabilities-matrix.mdx: there is nothing to maintain here.
 *
 *   <CapabilityMatrix />                  every chapter, grouped
 *   <CapabilityMatrix chapter="typography" />   one chapter
 *   <CapabilityMatrix group="format" />   only format / editor / server / plugin chapters
 *
 * Columns are dynamic per chapter (only the stages that chapter actually touches),
 * so each table stays narrow. Each feature row carries an `id` anchor so
 * <SupportBadge feature=…> can deep-link to it.
 */
import { getMatrix, type Impl, type Evidence, type MatrixChapter, type MatrixFeature } from '@/lib/generated';

const STAGE_TITLE: Record<string, string> = {
  'core.parser': 'Parser',
  'core.renderer': 'Renderer',
  'core.mutation': 'Mutation',
  'core.canvas-wasm': 'Canvas',
  'core.sdk': 'SDK',
  'editor.canvas': 'Canvas',
  'editor.shell': 'Shell',
  'editor.panel': 'Panel',
  'editor.gesture': 'Gesture',
  'editor.script': 'Script',
  'editor.styleguide': 'Style',
  'server.api': 'API',
  'plugin.api': 'API',
  'plugin.draw': 'Draw',
  'plugin.web': 'Web',
  'plugin.image': 'Image',
  'plugin.data': 'Data',
  'plugin.sheet': 'Sheet',
};

/** A cell glyph: meaning in the symbol (survives greyscale), color reinforces. */
function cellGlyph(impl: Impl, evidence: Evidence): { glyph: string; color: string; title: string } {
  if (impl === 'shipped') {
    if (evidence === 'green') return { glyph: '●', color: 'var(--valid)', title: 'shipped · verified' };
    if (evidence === 'red') return { glyph: '✗', color: 'var(--warn)', title: 'shipped · failing test' };
    return { glyph: '◍', color: 'color-mix(in srgb, var(--valid) 60%, var(--color-muted))', title: 'shipped · untested' };
  }
  if (impl === 'partial') return { glyph: '◐', color: 'var(--warn)', title: 'partial' };
  if (impl === 'planned') return { glyph: '·', color: 'var(--color-muted)', title: 'planned' };
  if (impl === 'deferred') return { glyph: '·', color: 'var(--color-muted)', title: 'deferred' };
  return { glyph: '', color: 'transparent', title: 'n/a' };
}

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 640,
  letterSpacing: '0.04em',
  color: 'var(--color-muted)',
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-rule)',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', verticalAlign: 'top' };

function ChapterTable({ chapter }: { chapter: MatrixChapter }) {
  // Stages actually used by this chapter (keeps the table narrow).
  const used: string[] = [];
  const seen = new Set<string>();
  for (const f of chapter.features) for (const s of Object.keys(f.cells)) if (!seen.has(s)) (seen.add(s), used.push(s));
  const stages = getMatrix().stages.map((s) => s.id).filter((id) => seen.has(id));

  return (
    <div className="not-prose" style={{ margin: '1.25rem 0' }}>
      <h3 id={`chapter-${chapter.chapter}`} style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 16, margin: '0 0 2px' }}>
        {chapter.title}{' '}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)' }}>
          {chapter.features.length} features{chapter.greenPct != null ? ` · ${chapter.greenPct}% green` : ''}
        </span>
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead>
            <tr>
              <th style={TH}>Feature</th>
              {stages.map((s) => (
                <th key={s} style={{ ...TH, textAlign: 'center' }} title={s}>
                  {STAGE_TITLE[s] ?? s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chapter.features.map((f: MatrixFeature) => (
              <tr key={f.id} id={f.id} style={{ scrollMarginTop: '5rem' }}>
                <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>
                  <span style={{ fontWeight: 560 }}>{f.title}</span>
                  <br />
                  <code style={{ fontSize: 10.5, color: 'var(--color-muted)' }}>{f.id}</code>
                </td>
                {stages.map((s) => {
                  const c = f.cells[s];
                  const g = c ? cellGlyph(c.impl, c.evidence) : { glyph: '', color: 'transparent', title: 'n/a' };
                  return (
                    <td key={s} style={{ ...TD, textAlign: 'center', color: g.color, fontSize: 14 }} title={`${STAGE_TITLE[s] ?? s}: ${g.title}`}>
                      {g.glyph}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CapabilityMatrix({ chapter, group }: { chapter?: string; group?: string }) {
  const matrix = getMatrix();
  let chapters = matrix.chapters;
  if (chapter) chapters = chapters.filter((c) => c.chapter === chapter);
  if (group) chapters = chapters.filter((c) => c.group === group);

  if (!chapters.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No capability data{chapter ? ` for “${chapter}”` : ''}. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }

  return (
    <div>
      <p className="not-prose" style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>
        <span style={{ color: 'var(--valid)' }}>●</span> shipped &amp; verified ·{' '}
        <span style={{ color: 'color-mix(in srgb, var(--valid) 60%, var(--color-muted))' }}>◍</span> shipped, untested ·{' '}
        <span style={{ color: 'var(--warn)' }}>◐</span> partial · <span style={{ color: 'var(--warn)' }}>✗</span> failing ·{' '}
        <span style={{ color: 'var(--color-muted)' }}>·</span> planned
      </p>
      {chapters.map((c) => (
        <ChapterTable key={c.chapter} chapter={c} />
      ))}
    </div>
  );
}
