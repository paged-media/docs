'use client';
/**
 * <ScriptingPlayground> — an editable paged.* script run against the REAL editor.
 *
 * Layout (stacked): a Monaco code editor on top, the embedded play.paged.media
 * editor below at 50% zoom (so the whole large DTP UI fits a compact band), and a
 * console at the bottom. Monaco is self-hosted and loaded client-only (next/dynamic).
 *
 * "Run" posts the edited source to the iframe; the editor executes it via the
 * worker's Boa paged.run and posts back the captured console output.
 *
 * postMessage contract (docs ⇄ play.paged.media), origin-checked both ways:
 *   docs → frame : { type: 'paged:run', id, source }
 *   frame → docs : { type: 'paged:ready' } · { type: 'paged:result', id, output, error }
 */
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';
let RUN_SEQ = 0;

// Monaco is heavy + browser-only → load its chunk on the client, never during SSR.
const MonacoCodeInput = dynamic(() => import('./monaco-code-input').then((m) => m.MonacoCodeInput), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 12, fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, color: 'var(--color-muted)' }}>Loading editor…</div>
  ),
});

const btn = (primary?: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)',
  fontSize: 12.5,
  fontWeight: primary ? 640 : 500,
  padding: '5px 12px',
  border: '1px solid var(--color-rule)',
  borderRadius: 4,
  background: primary ? 'var(--valid, #2a7)' : 'var(--color-paper, #fff)',
  color: primary ? '#fff' : 'inherit',
  cursor: 'pointer',
});

export function ScriptingPlayground({
  script = '',
  title,
  seed,
  lookFor,
  codeHeight = 220,
  frameHeight = 460,
}: {
  script?: string;
  title?: string;
  /** A named starter document run before the snippet (see editor ./playground/seeds). */
  seed?: string;
  /** One line describing what visibly changes when the script runs. */
  lookFor?: string;
  codeHeight?: number;
  frameHeight?: number;
}) {
  const [source, setSource] = useState(script.trim());
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<{ lines: string[]; error: string | null } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== PLAYGROUND_ORIGIN) return;
      const data = e.data as { type?: string; id?: number; output?: string[]; error?: string | null };
      if (data?.type === 'paged:ready') setReady(true);
      else if (data?.type === 'paged:result' && data.id === pendingRef.current) {
        setRunning(false);
        setOutput({ lines: data.output ?? [], error: data.error ?? null });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function run() {
    if (!loaded) {
      setLoaded(true);
      return;
    }
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    const id = ++RUN_SEQ;
    pendingRef.current = id;
    setRunning(true);
    setOutput(null);
    // A seeded playground re-seeds before each run so a mutating snippet starts
    // from identical content every time (Reset semantics).
    frame.postMessage({ type: 'paged:run', id, source, reseed: !!seed }, PLAYGROUND_ORIGIN);
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  // The embed loads the real editor; a seed scaffolds a starter document so the
  // snippet has something addressable to act on.
  const src = `${PLAYGROUND_ORIGIN}/?embed=script${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`;
  const openHref = `${PLAYGROUND_ORIGIN}/?embed=script${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`;

  return (
    <figure className="not-prose" style={{ margin: '1.25rem 0' }}>
      {title ? <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 6 }}>{title}</figcaption> : null}
      <div style={{ border: '1px solid var(--color-rule)', borderRadius: 6, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--color-rule)', background: 'color-mix(in srgb, var(--color-rule) 10%, transparent)' }}>
          <button type="button" onClick={run} disabled={running} style={{ ...btn(true), opacity: running ? 0.6 : 1, cursor: running ? 'default' : 'pointer' }}>
            {running ? 'Running…' : loaded ? '▶ Run' : '▶ Load & run'}
          </button>
          <button type="button" onClick={() => { setSource(script.trim()); setOutput(null); }} style={btn(false)}>
            Reset
          </button>
          <button type="button" onClick={copySource} style={btn(false)} title="Copy the script">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <a href={openHref} target="_blank" rel="noreferrer" style={{ ...btn(false), textDecoration: 'none', display: 'inline-block' }} title="Open the playground in a full window">
            Open ↗
          </a>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--color-muted)' }}>
            {loaded ? (ready ? 'editor ready' : 'booting editor…') : seed ? `paged.* · seed: ${seed}` : 'paged.* · editor at 50%'}
          </span>
        </div>

        {/* Monaco code editor */}
        <div style={{ borderBottom: '1px solid var(--color-rule)', background: '#fffffe' }}>
          <MonacoCodeInput value={source} onChange={setSource} height={codeHeight} />
        </div>

        {/* The real editor, zoomed to 50% so the whole UI fits the band */}
        <div style={{ position: 'relative', height: frameHeight, overflow: 'hidden', background: '#0f0f12' }}>
          {loaded ? (
            <iframe
              ref={frameRef}
              title="Paged scripting playground"
              src={src}
              allow="cross-origin-isolated; clipboard-write"
              style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '200%', border: 0, transform: 'scale(0.5)', transformOrigin: '0 0', display: 'block' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setLoaded(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: 0, color: '#fff', background: 'radial-gradient(120% 120% at 50% 40%, #1b1b22 0%, #0f0f12 70%)' }}
            >
              <span style={{ fontSize: 26 }}>▶</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 640 }}>Load the editor</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-muted)' }}>the real Paged editor, driven by your script</span>
            </button>
          )}
        </div>

        {/* What to look for — the visible outcome of a successful run */}
        {lookFor ? (
          <div style={{ borderTop: '1px solid var(--color-rule)', padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-muted)', background: 'color-mix(in srgb, var(--valid, #2a7) 7%, transparent)' }}>
            <strong style={{ fontWeight: 640, color: 'inherit' }}>Look for:</strong> {lookFor}
          </div>
        ) : null}

        {/* Console output */}
        <div style={{ borderTop: '1px solid var(--color-rule)', padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, background: 'color-mix(in srgb, var(--color-rule) 6%, transparent)', maxHeight: 160, overflow: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 680, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 4 }}>Console</div>
          {output === null ? (
            <span style={{ color: 'var(--color-muted)' }}>{running ? 'Running your script in the editor…' : 'Run a script to see console output here.'}</span>
          ) : (
            <>
              {output.lines.map((l, i) => (
                <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{l}</div>
              ))}
              {output.error ? <div style={{ color: 'var(--warn, #c33)', whiteSpace: 'pre-wrap' }}>✗ {output.error}</div> : null}
              {!output.lines.length && !output.error ? <span style={{ color: 'var(--color-muted)' }}>(no output)</span> : null}
            </>
          )}
        </div>
      </div>
    </figure>
  );
}
