'use client';
/**
 * <ScriptingPlayground> — an editable paged.* script run against the REAL editor.
 *
 * Left: a code editor (a dependency-free textarea over a mono surface — the brand
 * line forbids pulling in Monaco/CodeMirror for this). Right: the embedded
 * play.paged.media editor (click-to-load, like <LiveDemo>). "Run" posts the
 * edited source to the iframe; the editor executes it via the worker's Boa
 * `paged.run(source)` and posts back the captured console output, which renders
 * in the console pane. The document on the canvas updates live.
 *
 * postMessage contract (docs ⇄ play.paged.media):
 *   docs → frame : { type: 'paged:run', id, source }
 *   frame → docs : { type: 'paged:ready' }                      (on boot)
 *                  { type: 'paged:result', id, output: string[], error: string|null }
 * Messages are accepted ONLY from PLAYGROUND_ORIGIN.
 *
 * The docs side is complete; until play.paged.media ships the editable-script
 * bridge + deploy, Run shows a clear "waiting for the playground host" state and
 * the editor + console still let readers read and edit the example.
 */
import { useEffect, useRef, useState } from 'react';

const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';

let RUN_SEQ = 0;

export function ScriptingPlayground({
  script = '',
  height = 460,
  title,
}: {
  script?: string;
  height?: number;
  title?: string;
}) {
  const [source, setSource] = useState(script.trim());
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ lines: string[]; error: string | null } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pendingRef = useRef<number | null>(null);

  // Receive ready/result messages from the playground iframe (origin-checked).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== PLAYGROUND_ORIGIN) return;
      const data = e.data as { type?: string; id?: number; output?: string[]; error?: string | null };
      if (data?.type === 'paged:ready') {
        setReady(true);
      } else if (data?.type === 'paged:result' && data.id === pendingRef.current) {
        setRunning(false);
        setOutput({ lines: data.output ?? [], error: data.error ?? null });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function run() {
    if (!loaded) {
      setLoaded(true); // boot the iframe; the user can press Run again once ready
      return;
    }
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    const id = ++RUN_SEQ;
    pendingRef.current = id;
    setRunning(true);
    setOutput(null);
    frame.postMessage({ type: 'paged:run', id, source }, PLAYGROUND_ORIGIN);
  }

  const src = `${PLAYGROUND_ORIGIN}/?embed=script`;

  return (
    <figure className="not-prose" style={{ margin: '1.25rem 0' }}>
      {title ? <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 6 }}>{title}</figcaption> : null}
      <div style={{ border: '1px solid var(--color-rule)', borderRadius: 6, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--color-rule)', background: 'color-mix(in srgb, var(--color-rule) 10%, transparent)' }}>
          <button
            type="button"
            onClick={run}
            disabled={running}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 640, padding: '4px 12px', border: '1px solid var(--color-rule)', borderRadius: 4, background: 'var(--valid, #2a7)', color: '#fff', cursor: running ? 'default' : 'pointer', opacity: running ? 0.6 : 1 }}
          >
            {running ? 'Running…' : loaded ? '▶ Run' : '▶ Load & run'}
          </button>
          <button
            type="button"
            onClick={() => { setSource(script.trim()); setOutput(null); }}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, padding: '4px 10px', border: '1px solid var(--color-rule)', borderRadius: 4, background: 'var(--color-paper, #fff)', color: 'inherit', cursor: 'pointer' }}
          >
            Reset
          </button>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--color-muted)' }}>
            {loaded ? (ready ? 'editor ready' : 'booting editor…') : 'paged.*'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)' }}>
          {/* Code editor — dependency-free textarea over a mono surface. */}
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            aria-label="paged.* script source"
            style={{
              height,
              resize: 'none',
              border: 'none',
              borderRight: '1px solid var(--color-rule)',
              padding: '12px 14px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12.5,
              lineHeight: 1.6,
              tabSize: 2,
              background: 'var(--color-paper, #fff)',
              color: 'var(--color-ink, #1a1a1a)',
              outline: 'none',
              whiteSpace: 'pre',
              overflow: 'auto',
            }}
          />
          {/* The real editor */}
          <div style={{ position: 'relative', background: '#0f0f12', minHeight: height }}>
            {loaded ? (
              <iframe
                ref={frameRef}
                title="Paged scripting playground"
                src={src}
                allow="cross-origin-isolated; clipboard-write"
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
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
        </div>

        {/* Console output */}
        <div style={{ borderTop: '1px solid var(--color-rule)', padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, background: 'color-mix(in srgb, var(--color-rule) 6%, transparent)', maxHeight: 160, overflow: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 680, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 4 }}>Console</div>
          {output === null ? (
            <span style={{ color: 'var(--color-muted)' }}>
              {running ? 'Running your script in the editor…' : 'Run a script to see console output here.'}
            </span>
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
