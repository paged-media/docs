'use client';
/**
 * <LiveDemo> — embeds the REAL editor running a demo script inline, live, via the
 * playground (play.paged.media). The successor to <Demo> (rrweb recording): the
 * actual app driven by its own scripting layer, scrubbable + interactive.
 *
 *   <LiveDemo script="draw-fill" />   loads play.paged.media/?script=draw-fill
 *
 * The live path needs this docs page cross-origin-isolated (COOP/COEP via
 * _headers, so the iframe inherits SharedArrayBuffer) + WebGPU; the embedded
 * editor self-reports when its browser lacks either — no fallback here.
 *
 * Click-to-load: an embedded editor is heavy, so we mount the iframe on Run —
 * several demos can sit on one page without booting N editors. Origin is
 * NEXT_PUBLIC_PLAYGROUND_URL (inlined at build); defaults to production.
 */
import { useState } from 'react';

const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';

export function LiveDemo({
  script,
  title,
  caption,
  height = 600,
  autoplay = true,
}: {
  script: string;
  title?: string;
  caption?: string;
  height?: number;
  autoplay?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const label = title ?? script;
  const open = `${PLAYGROUND_ORIGIN}/?script=${encodeURIComponent(script)}`;
  const src = `${open}${autoplay ? '&autoplay' : ''}`;

  return (
    <figure className="not-prose" style={{ margin: '1.25rem 0' }}>
      <div style={{ position: 'relative', height, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-rule, #ddd)', background: '#0f0f12' }}>
        {loaded ? (
          <iframe
            title={`Live demo: ${label}`}
            src={src}
            // allow="cross-origin-isolated" lets the cross-origin iframe inherit
            // SAB from this (already isolated) page; fullscreen for the expand control.
            allow="cross-origin-isolated; fullscreen; clipboard-write"
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            aria-label={`Run live demo: ${label}`}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', border: 0, color: '#fff',
              background: 'radial-gradient(120% 120% at 50% 40%, #1b1b22 0%, #0f0f12 70%)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1 }}>▶</span>
            <span style={{ fontWeight: 640 }}>Run live demo</span>
            <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{label} — the real editor, driven by a script</span>
          </button>
        )}
        {loaded ? (
          <a href={open} target="_blank" rel="noreferrer" title="Open in the playground"
            style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '3px 8px', textDecoration: 'none' }}>
            open ↗
          </a>
        ) : null}
      </div>
      {caption ? (
        <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)', marginTop: 6 }}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
