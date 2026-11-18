'use client';
/**
 * The scripting lab's client island (the server wrapper is scripting-lab.tsx).
 *
 * Tabs mode: one tab per theme of settable paths (an ARIA tablist; each tab is
 * also the anchor `#theme-<id>`), the theme's paths, and a workspace: the script
 * in Monaco on the left with Run, Reset, Copy and "Open in the editor"; the
 * stage, "Look for" and the console on the right. Single mode is one script, no
 * tabs, the same workspace.
 *
 * The stage shows the theme's recorded result (public/scripting/lab/<id>.webp)
 * or, until one is recorded, says what Run will do. Run loads the page's one
 * editor (scripting-lab-stage.ts) and runs the script; from then on switching
 * tabs runs the new tab's script at once, Reset puts the starter document back
 * without running, and Before / After switches between the two. Without WebGPU
 * there is no Run, only a note, and the recorded result stays.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import type { SeedId } from '@/data/scripting/examples';
import { claimStage, onStage, openInEditorHref, releaseStage, stageStore } from './scripting-lab-stage';

/** Where the recorded results come from: the editor's still recorder
 *  (apps/editor/apps/canvas/tests/films/stills/embed.film.ts), at this commit. */
const LAB_POSTERS = { commit: 'eeef38be6', date: '18 Nov 2026' } as const;

export interface LabItem {
  id: string;
  title: string;
  summary?: string;
  seed: SeedId;
  /** The starter document in words ("a page with one text frame, selected"). */
  seedLabel: string;
  script: string;
  lookFor?: string;
  /** Tabs mode: the theme's settable paths, and those its script writes. */
  paths?: string[];
  demoPaths?: string[];
  /** The recorded result's address, when the still exists. */
  poster: string | null;
}

type Action = 'run' | 'reset' | 'before' | 'after';
interface Output {
  lines: string[];
  error: string | null;
}

const MonacoCodeInput = dynamic(() => import('./monaco-code-input').then((m) => m.MonacoCodeInput), {
  ssr: false,
  loading: () => <div className="paged-script-editor-loading">Loading the script editor…</div>,
});

const pad = (n: number) => String(n).padStart(2, '0');

/** Height for the script editor: the script's lines, within bounds. */
function editorHeight(script: string): number {
  const lines = script.split('\n').length;
  return Math.min(360, Math.max(170, lines * 19 + 34));
}

export function ScriptingLabClient({ items, tabs, label }: { items: LabItem[]; tabs: boolean; label: string }) {
  const owner = useId();
  const panelId = `${owner}-panel`;
  const [selected, setSelected] = useState(0);
  const [sources, setSources] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.id, i.script])));
  const [output, setOutput] = useState<Output | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [view, setView] = useState<'before' | 'after' | null>(null);
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [resets, setResets] = useState(0);
  const stage = useSyncExternalStore(stageStore.subscribe, stageStore.get, stageStore.getServer);
  const slotRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const generation = useRef(0);
  const firstSelection = useRef(true);

  const item = items[selected] ?? items[0];
  const source = sources[item.id] ?? item.script;
  const active = stage.owner === owner;
  const live = active && stage.status === 'ready';
  const loading = active && stage.status === 'loading';

  useEffect(() => {
    setGpu(!!(navigator as Navigator & { gpu?: unknown }).gpu);
  }, []);
  useEffect(() => () => releaseStage(owner), [owner]);

  // `#theme-<id>` selects that tab: on arrival and when the address changes.
  useEffect(() => {
    if (!tabs) return;
    const pick = () => {
      const m = /^#theme-(.+)$/.exec(window.location.hash);
      if (!m) return;
      const i = items.findIndex((t) => t.id === decodeURIComponent(m[1]));
      if (i >= 0) setSelected(i);
    };
    pick();
    window.addEventListener('hashchange', pick);
    return () => window.removeEventListener('hashchange', pick);
  }, [tabs, items]);

  // Another tab: once the editor is live here, run its script at once.
  useEffect(() => {
    if (firstSelection.current) {
      firstSelection.current = false;
      return;
    }
    const now = stageStore.get();
    // perform is this render's, so it reads the newly selected item; a run
    // still in flight for the old tab is dropped (its generation is stale).
    if (now.owner === owner && (now.status === 'ready' || now.status === 'loading')) void perform('after');
    else {
      generation.current++;
      setBusy(null);
      setOutput(null);
      setView(null);
    }
  }, [selected]);

  async function perform(action: Action) {
    const slot = slotRef.current;
    if (!slot) return;
    const mine = ++generation.current;
    const it = item;
    const script = action === 'reset' ? it.script : source;
    const runs = action === 'run' || action === 'after';
    setBusy(action);
    if (runs) setOutput(null);
    try {
      const editor = await claimStage(owner, slot, it.seed);
      const result = await onStage(async () => {
        const r = await editor.play(it.seed, runs ? script : null);
        await editor.fit();
        return r;
      });
      if (generation.current !== mine) return;
      setView(runs ? 'after' : 'before');
      setOutput(result ? { lines: result.output, error: result.error } : null);
    } catch (err) {
      if (generation.current !== mine) return;
      setOutput({ lines: [], error: err instanceof Error ? err.message : String(err) });
    } finally {
      if (generation.current === mine) setBusy(null);
    }
  }

  function reset() {
    setSources((s) => ({ ...s, [item.id]: item.script }));
    setResets((n) => n + 1);
    if (live) void perform('reset');
    else {
      generation.current++;
      setBusy(null);
      setOutput(null);
      setView(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked: nothing to do
    }
  }

  function select(i: number) {
    setSelected(i);
    // On a phone the tabs are one scrolling row: keep the chosen one in view.
    tabRefs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    try {
      window.history.replaceState(null, '', `#theme-${items[i].id}`);
    } catch {
      // a sandboxed page: the tab still changes
    }
  }
  function onTabClick(e: MouseEvent<HTMLAnchorElement>, i: number) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    select(i);
  }
  function onTabKey(e: KeyboardEvent<HTMLAnchorElement>, i: number) {
    const n = items.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === ' ') next = i;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  }

  const runLabel = busy === 'run' || busy === 'after' ? (loading ? 'Loading the editor…' : 'Running…') : 'Run';
  const stageWords = live ? 'the Paged editor, live' : loading ? 'loading the editor' : item.poster ? 'the recorded result' : 'not run yet';
  const demo = new Set(item.demoPaths ?? []);
  const name = item.title || 'the script';

  return (
    <section className="not-prose paged-lab paged-script-lab" aria-label={label} data-tabs={tabs ? '' : undefined}>
      <div className="paged-lab-panel paged-script-panel">
        {tabs ? (
          <div className="paged-lab-bar paged-script-bar">
            <div role="tablist" aria-label="Path themes" className="paged-lab-tabs paged-script-tabs">
              {items.map((t, i) => (
                <a
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`theme-${t.id}`}
                  href={`#theme-${t.id}`}
                  role="tab"
                  aria-selected={i === selected}
                  aria-controls={panelId}
                  tabIndex={i === selected ? 0 : -1}
                  className="paged-lab-tab paged-script-tab"
                  onClick={(e) => onTabClick(e, i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  <span className="paged-lab-tab-num">{pad(i + 1)} /</span> {t.title}
                  <span className="paged-script-tab-count" aria-label={`${t.paths?.length ?? 0} paths`}>
                    {t.paths?.length ?? 0}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className="paged-script-body"
          id={panelId}
          role={tabs ? 'tabpanel' : undefined}
          aria-labelledby={tabs ? `theme-${item.id}` : undefined}
        >
          {tabs || item.summary || item.title ? (
            <header className="paged-script-head">
              {tabs ? <h2 className="paged-script-title">{item.title}</h2> : item.title ? <p className="paged-script-title">{item.title}</p> : null}
              {item.summary ? <p className="paged-script-summary">{item.summary}</p> : null}
              {item.paths?.length ? (
                <div className="paged-script-paths">
                  <p className="paged-script-paths-label">
                    Written by this script <span>{item.demoPaths?.length ?? 0}</span>
                  </p>
                  <ul className="paged-script-chips">
                    {(item.demoPaths ?? []).map((p) => (
                      <li key={p} className="paged-script-chip" data-demo="">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <details className="paged-script-more">
                    <summary>All {item.paths.length} paths in this theme</summary>
                    <ul className="paged-script-chips">
                      {item.paths.map((p) => (
                        <li key={p} className="paged-script-chip" data-demo={demo.has(p) ? '' : undefined}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ) : null}
            </header>
          ) : null}

          <div className="paged-script-workspace">
            <div className="paged-lab-sheet paged-script-sheet">
              <div className="paged-lab-heading">
                <span>
                  Script <span className="paged-lab-path">/ {item.id}.js</span>
                </span>
                <button type="button" className="paged-lab-copy" onClick={copy} data-copied={copied || undefined}>
                  {copied ? 'Copied' : 'Copy script'}
                </button>
              </div>
              <div className="paged-script-editor">
                <MonacoCodeInput
                  // Uncontrolled, so fast typing never races a re-render; a new
                  // key (another tab, or Reset) starts it from the source again.
                  key={`${item.id}:${resets}`}
                  defaultValue={source}
                  onChange={(v) => setSources((s) => ({ ...s, [item.id]: v }))}
                  height={editorHeight(item.script)}
                  night
                  wrap
                  label={`Script: ${name}`}
                />
              </div>
              <div className="paged-script-controls">
                {gpu === false ? (
                  <p className="paged-script-gpu" role="note">
                    The live stage needs WebGPU, which this browser does not offer.
                    {item.poster ? ' The stage shows the result as recorded.' : ''}
                  </p>
                ) : (
                  <button type="button" className="paged-script-run" onClick={() => perform('run')} disabled={!!busy} aria-busy={!!busy || undefined}>
                    {runLabel}
                  </button>
                )}
                <button type="button" className="paged-script-button" onClick={reset} disabled={!!busy}>
                  Reset
                </button>
                <a className="paged-script-open" href={openInEditorHref(item.seed)} target="_blank" rel="noreferrer">
                  Open in the editor <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="paged-lab-sheet paged-script-sheet">
              <div className="paged-lab-heading">
                <span>
                  Stage <span className="paged-lab-path">/ {stageWords}</span>
                </span>
                <div className="paged-script-toggle" role="group" aria-label="Show the starter document or the result">
                  <button
                    type="button"
                    aria-pressed={live && view === 'before'}
                    disabled={!live || !!busy}
                    onClick={() => perform('before')}
                  >
                    Before
                  </button>
                  <button type="button" aria-pressed={live && view === 'after'} disabled={!live || !!busy} onClick={() => perform('after')}>
                    After
                  </button>
                </div>
              </div>
              <div
                ref={slotRef}
                className="paged-script-stage"
                role="group"
                aria-label={`Stage: ${name}`}
                data-live={live ? '' : undefined}
                data-mode={active ? (stage.mode ?? undefined) : undefined}
              >
                {live ? null : item.poster ? (
                  <figure className="paged-script-poster">
                    <img src={item.poster} alt={`${name}: the result, recorded in the Paged editor`} decoding="async" loading="lazy" />
                    <figcaption>
                      Recorded result: this script, run in the Paged editor at{' '}
                      <a href={`https://github.com/paged-media/paged/commit/${LAB_POSTERS.commit}`}>
                        <code>{LAB_POSTERS.commit}</code>
                      </a>
                      , {LAB_POSTERS.date}
                    </figcaption>
                  </figure>
                ) : (
                  <div className="paged-script-empty">
                    <p className="paged-script-empty-kicker">{gpu === false ? 'No live stage here' : 'What Run does'}</p>
                    <p className="paged-script-empty-text">
                      {gpu === false
                        ? 'The live stage needs WebGPU. There is no recorded result of this script yet.'
                        : `Run loads the Paged editor here, opens ${item.seedLabel} and runs this script on it.`}
                    </p>
                  </div>
                )}
                {loading ? (
                  <p className="paged-script-stage-status" role="status">
                    Loading the editor…
                  </p>
                ) : null}
              </div>
              {item.lookFor ? (
                <p className="paged-script-look">
                  <b>Look for</b> {item.lookFor}
                </p>
              ) : null}
              <div className="paged-script-console" role="log" aria-live="polite" aria-label="Console">
                <p className="paged-script-console-head">Console</p>
                {output ? (
                  <>
                    {output.lines.map((l, i) => (
                      <pre key={i}>{l}</pre>
                    ))}
                    {output.error ? <pre className="paged-script-error">✗ {output.error}</pre> : null}
                    {!output.lines.length && !output.error ? <p className="paged-script-quiet">(no output)</p> : null}
                  </>
                ) : (
                  <p className="paged-script-quiet">
                    {busy === 'run' || busy === 'after'
                      ? loading
                        ? 'Loading the editor…'
                        : 'Running the script…'
                      : live && view === 'before'
                        ? 'The stage shows the starter document. After runs the script on it.'
                        : 'Run the script to see its console output here.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
