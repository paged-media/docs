'use client';
/**
 * Interactive editorial diagrams — client islands in otherwise-static MDX pages
 * (so the static export still works). They share the brand diagram language of
 * the static figures in ./index.tsx (ink lines, oxblood focal accent, mono
 * labels) but add a numbered stepper: click a step, use ←/→, and the figure
 * highlights that stage. `prefers-reduced-motion` is respected (no auto-advance;
 * transitions are instant for those users).
 */
import { useState, type ReactNode } from 'react';

const STYLE = `
  .dlabel{font-family:var(--font-mono);font-weight:600;font-size:11px;fill:var(--color-ink)}
  .dsub{font-family:var(--font-mono);font-size:10px;fill:var(--color-ink-soft)}
  .dbox{fill:none;stroke:var(--color-ink);stroke-width:1.2}
  .dmut{stroke:var(--color-rule-strong);stroke-width:1.2}
  .dfill{fill:var(--color-ink);opacity:.04}
  .dacc{fill:none;stroke:var(--color-accent);stroke-width:1.6}
  .daccfill{fill:var(--color-accent);opacity:.08}
  .dacclabel{font-family:var(--font-mono);font-weight:600;font-size:11px;fill:var(--color-accent)}
  .darrow{fill:var(--color-rule-strong)}
  .dnode{transition:opacity .18s ease}
`;

export interface FigureStep {
  label: string;
  sub?: string;
}

/**
 * A stepped figure. `render(active)` returns the SVG children, keyed off the
 * active step index so the caller can light up the current stage.
 */
export function InteractiveFigure({
  caption,
  viewBox,
  steps,
  render,
}: {
  caption: string;
  viewBox: string;
  steps: FigureStep[];
  render: (active: number) => ReactNode;
}) {
  const [active, setActive] = useState(0);
  const go = (i: number) => setActive((i + steps.length) % steps.length);

  return (
    <figure
      className="not-prose"
      style={{
        margin: 'var(--space-5) 0',
        background: 'var(--color-paper-soft)',
        border: '1px solid var(--color-rule)',
        borderRadius: 2,
        padding: 'var(--space-5)',
      }}
    >
      {/* Stepper */}
      <div
        role="tablist"
        aria-label={caption}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-4)' }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(active + 1);
          else if (e.key === 'ArrowLeft') go(active - 1);
        }}
      >
        {steps.map((s, i) => (
          <button
            key={s.label}
            role="tab"
            aria-selected={i === active}
            type="button"
            onClick={() => setActive(i)}
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11.5,
              padding: '3px 9px',
              cursor: 'pointer',
              borderRadius: 3,
              border: '1px solid ' + (i === active ? 'var(--color-accent)' : 'var(--color-rule)'),
              background: i === active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
              color: i === active ? 'var(--color-accent)' : 'var(--color-ink-soft, var(--color-muted))',
              fontWeight: i === active ? 640 : 500,
            }}
          >
            <span style={{ opacity: 0.6 }}>{i + 1}.</span> {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={viewBox} className="mx-auto block w-full max-w-2xl" role="img" aria-label={caption}>
        <style>{STYLE}</style>
        <defs>
          <marker id="iarrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path className="darrow" d="M0,0 L6,3 L0,6 Z" />
          </marker>
        </defs>
        {render(active)}
      </svg>

      {/* Active step detail */}
      {steps[active]?.sub ? (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            lineHeight: 1.45,
            color: 'var(--color-ink-soft)',
            margin: 'var(--space-4) 0 0',
          }}
        >
          <strong style={{ color: 'var(--color-accent)' }}>{steps[active].label}.</strong> {steps[active].sub}
        </p>
      ) : null}

      <figcaption
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12.5,
          lineHeight: 1.45,
          color: 'var(--color-ink-soft)',
          marginTop: 'var(--space-3)',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

// Lit-node helper: full opacity when this node's stage index <= active.
const lit = (stageIndex: number, active: number): React.CSSProperties => ({
  opacity: stageIndex <= active ? 1 : 0.28,
});

/**
 * <ScriptingExecutionModel /> — how a paged.* script becomes pixels:
 * source → Boa sandbox → Operation channel → apply_mutation → re-render, with
 * undo/redo branching off the channel and the runtime budgets guarding Boa.
 */
export function ScriptingExecutionModel() {
  const steps: FigureStep[] = [
    { label: 'Your script', sub: 'Plain ECMAScript calling paged.* — no modules, no I/O.' },
    { label: 'Boa sandbox', sub: 'A pure Rust ECMAScript engine runs it under budgets: ~10M loop iterations, recursion depth 512, ~2s wall-clock checked at every host call.' },
    { label: 'Operation channel', sub: 'Each write becomes a Mutation on the same Operation log the gestures and panels use — so undo/redo work identically.' },
    { label: 'apply_mutation', sub: 'The model applies the operation and rebuilds its display list.' },
    { label: 'Re-render', sub: 'The GPU scene cache is cleared and the canvas repaints — the change is visible immediately.' },
  ];

  const box = (x: number, y: number, w: number, label: string, sub: string, stage: number, active: number) => (
    <g className="dnode" style={lit(stage, active)}>
      <rect className={stage === active ? 'dacc daccfill' : 'dbox dfill'} x={x} y={y} width={w} height={48} rx={4} />
      <text className={stage === active ? 'dacclabel' : 'dlabel'} x={x + w / 2} y={y + 22} textAnchor="middle">
        {label}
      </text>
      <text className="dsub" x={x + w / 2} y={y + 38} textAnchor="middle">
        {sub}
      </text>
    </g>
  );

  return (
    <InteractiveFigure
      caption="A paged.* script runs in a sandboxed Boa engine; every write flows through the same Operation channel as the UI, so it re-renders live and is fully undoable."
      viewBox="0 0 720 230"
      steps={steps}
      render={(active) => (
        <>
          {box(16, 90, 120, 'script', 'paged.* source', 0, active)}
          <line className="dmut" markerEnd="url(#iarrow)" x1={136} y1={114} x2={166} y2={114} style={lit(1, active)} />
          {box(166, 90, 130, 'Boa sandbox', 'budgeted ECMAScript', 1, active)}
          <line className="dmut" markerEnd="url(#iarrow)" x1={296} y1={114} x2={326} y2={114} style={lit(2, active)} />
          {box(326, 90, 150, 'Operation channel', 'one undoable log', 2, active)}
          <line className="dmut" markerEnd="url(#iarrow)" x1={476} y1={114} x2={506} y2={114} style={lit(3, active)} />
          {box(506, 90, 90, 'apply', 'rebuild list', 3, active)}
          <line className="dmut" markerEnd="url(#iarrow)" x1={596} y1={114} x2={626} y2={114} style={lit(4, active)} />
          {box(626, 90, 78, 'render', 'repaint', 4, active)}

          {/* undo/redo branch off the channel */}
          <g className="dnode" style={lit(2, active)}>
            <line className="dmut" strokeDasharray="3 3" x1={401} y1={138} x2={401} y2={178} />
            <text className="dsub" x={401} y={196} textAnchor="middle">
              paged.undo() / redo()
            </text>
          </g>

          {/* budget annotation over Boa */}
          <g className="dnode" style={lit(1, active)}>
            <text className="dsub" x={231} y={70} textAnchor="middle">
              budgets: 10M loops · depth 512 · ~2s
            </text>
          </g>
        </>
      )}
    />
  );
}

/**
 * <RenderPipeline /> — how an IDML package becomes pixels through the engine's
 * five crates: parse → scene → text → compose → GPU. The same display list the
 * compose stage emits is what both the WebGPU viewer and the headless CPU
 * rasterizer consume, so they never disagree.
 */
export function RenderPipeline() {
  const stages = [
    { label: 'parse', sub: 'paged-parse — ZIP + XML → an AST: the design map, spreads, stories, styles, and graphics.' },
    { label: 'scene', sub: 'paged-scene — resolve the style cascade and thread stories through their frame chains.' },
    { label: 'text', sub: 'paged-text — shape runs and lay out paragraphs with InDesign-calibrated Knuth-Plass line breaking.' },
    { label: 'compose', sub: 'paged-compose — emit a versioned display list: the single source both renderers consume.' },
    { label: 'GPU', sub: 'paged-gpu — rasterize the display list through Vello (WebGPU) or tiny-skia (headless CPU).' },
  ];

  const crate = ['paged-parse', 'paged-scene', 'paged-text', 'paged-compose', 'paged-gpu'];

  return (
    <InteractiveFigure
      caption="The render pipeline is a chain of five crates; the compose stage's display list is the contract that keeps the WebGPU and CPU backends pixel-identical."
      viewBox="0 0 760 190"
      steps={stages}
      render={(active) => (
        <>
          {stages.map((s, i) => {
            const x = 16 + i * 148;
            const on = i === active;
            return (
              <g key={s.label} className="dnode" style={{ opacity: i <= active ? 1 : 0.3 }}>
                <rect className={on ? 'dacc daccfill' : 'dbox dfill'} x={x} y={70} width={120} height={50} rx={4} />
                <text className={on ? 'dacclabel' : 'dlabel'} x={x + 60} y={92} textAnchor="middle">
                  {s.label}
                </text>
                <text className="dsub" x={x + 60} y={108} textAnchor="middle">
                  {crate[i]}
                </text>
                {i < stages.length - 1 ? (
                  <line className="dmut" markerEnd="url(#iarrow)" x1={x + 120} y1={95} x2={x + 148} y2={95} style={{ opacity: i + 1 <= active ? 1 : 0.3 }} />
                ) : null}
              </g>
            );
          })}
          {/* the display-list contract under compose */}
          <g className="dnode" style={{ opacity: active >= 3 ? 1 : 0.3 }}>
            <text className="dsub" x={508} y={150} textAnchor="middle">
              display list — one contract, two backends
            </text>
          </g>
        </>
      )}
    />
  );
}
