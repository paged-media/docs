'use client';
/**
 * <ScriptingPlayground> — an editable paged.* script run against the REAL editor.
 *
 * Layout (stacked): a syntax-highlighted code editor with a line-number gutter on
 * top, the embedded play.paged.media editor below at 50% zoom (so the whole
 * large DTP UI is visible in a compact band), and a console at the bottom.
 *
 * The code editor is a dependency-free "textarea over a highlighted <pre>" overlay
 * (the react-simple-code-editor technique) with a regex JS highlighter — no Monaco/
 * CodeMirror. "Run" posts the edited source to the iframe; the editor executes it
 * via the worker's Boa paged.run and posts back the captured console output.
 *
 * postMessage contract (docs ⇄ play.paged.media), origin-checked both ways:
 *   docs → frame : { type: 'paged:run', id, source }
 *   frame → docs : { type: 'paged:ready' } · { type: 'paged:result', id, output, error }
 */
import { useEffect, useMemo, useRef, useState } from 'react';

const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';
let RUN_SEQ = 0;

// ── lightweight JS highlighter (escapes everything, colours tokens inline) ────
const HL = {
  comment: '#9b9483',
  string: '#6a8a2f',
  keyword: '#9a4fb0',
  number: '#b0772f',
  global: '#2f6f8f',
};
const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|of|in|new|typeof|instanceof|await|async|try|catch|finally|throw|switch|case|break|continue|true|false|null|undefined|this|void|delete';
const TOKEN = new RegExp(
  `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)` + // 1 comment
    `|(\`(?:\\\\.|[^\`\\\\])*\`|'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")` + // 2 string
    `|\\b(${KEYWORDS})\\b` + // 3 keyword
    `|\\b(\\d+(?:\\.\\d+)?)\\b` + // 4 number
    `|\\b(paged|console)\\b`, // 5 global
  'g',
);
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function highlight(code: string): string {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    out += escapeHtml(code.slice(last, i));
    const color = m[1] ? HL.comment : m[2] ? HL.string : m[3] ? HL.keyword : m[4] ? HL.number : HL.global;
    const weight = m[5] ? ';font-weight:600' : '';
    out += `<span style="color:${color}${weight}">${escapeHtml(m[0])}</span>`;
    last = i + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out + '\n'; // trailing newline keeps the last line's height stable
}

const EDITOR_FONT: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 12.5,
  lineHeight: 1.6,
  tabSize: 2,
  whiteSpace: 'pre',
};

function CodeInput({ value, onChange, height }: { value: string; onChange: (v: string) => void; height: number }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  const html = useMemo(() => highlight(value), [value]);

  const sync = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const pad = '12px 14px';
  return (
    <div style={{ display: 'flex', height, overflow: 'hidden', background: 'var(--color-paper, #fdfcfa)', borderBottom: '1px solid var(--color-rule)' }}>
      <div
        ref={gutterRef}
        aria-hidden
        style={{
          ...EDITOR_FONT,
          overflow: 'hidden',
          padding: '12px 8px 12px 12px',
          textAlign: 'right',
          color: 'color-mix(in srgb, var(--color-muted) 70%, transparent)',
          userSelect: 'none',
          borderRight: '1px solid color-mix(in srgb, var(--color-rule) 60%, transparent)',
          minWidth: 34,
          background: 'color-mix(in srgb, var(--color-rule) 7%, transparent)',
        }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <pre
          ref={preRef}
          aria-hidden
          style={{ ...EDITOR_FONT, position: 'absolute', inset: 0, margin: 0, padding: pad, overflow: 'hidden', pointerEvents: 'none', color: 'var(--color-ink, #1a1a1a)' }}
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sync}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="paged.* script source"
          style={{
            ...EDITOR_FONT,
            position: 'absolute',
            inset: 0,
            margin: 0,
            padding: pad,
            border: 0,
            outline: 'none',
            resize: 'none',
            overflow: 'auto',
            background: 'transparent',
            color: 'transparent',
            caretColor: 'var(--color-ink, #1a1a1a)',
            WebkitTextFillColor: 'transparent',
          }}
        />
      </div>
    </div>
  );
}

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

export function ScriptingPlayground({ script = '', title, codeHeight = 220, frameHeight = 460 }: { script?: string; title?: string; codeHeight?: number; frameHeight?: number }) {
  const [source, setSource] = useState(script.trim());
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
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
    frame.postMessage({ type: 'paged:run', id, source }, PLAYGROUND_ORIGIN);
  }

  const src = `${PLAYGROUND_ORIGIN}/?embed=script`;

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
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--color-muted)' }}>
            {loaded ? (ready ? 'editor ready' : 'booting editor…') : 'paged.* · editor at 50%'}
          </span>
        </div>

        {/* Code editor (line numbers + highlight) */}
        <CodeInput value={source} onChange={setSource} height={codeHeight} />

        {/* The real editor, zoomed to 50% so the whole UI fits the band */}
        <div style={{ position: 'relative', height: frameHeight, overflow: 'hidden', background: '#0f0f12' }}>
          {loaded ? (
            <iframe
              ref={frameRef}
              title="Paged scripting playground"
              src={src}
              allow="cross-origin-isolated; clipboard-write"
              // Render at 2× the band, then scale to 0.5 → the full editor at half size.
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
