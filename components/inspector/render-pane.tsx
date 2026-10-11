'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionDiagnostic, SessionPagesLayout, SessionRaster, Viewer, ViewerSessionLike } from '@paged-media/idml-viewer';
import { createPreviewSession, type SessionFont } from '@/components/mdx/sdk-loader';
import { statusFromError, type PreviewStatus } from '@/components/mdx/viewer-common';
import { btn, label, mono, muted, sheet, strip } from './styles';

/**
 * The live render of a dropped package: the published @paged-media/idml-viewer
 * over a canvas, with the SDK playground's toolbar (fit, zoom, page navigation,
 * layout) and page thumbnails.
 *
 * The session comes from our own factory, so the pane can do what `Viewer` does
 * not expose: register the package's `Document fonts/` faces (plus the Open Sans
 * fallback, sdk-loader.ts), read page sizes from `page_layout()`, keep the
 * diagnostics `load` returns even when it succeeds, and resize the surface when
 * the canvas changes size.
 *
 * `load` parses on the main thread and blocks it, so the pane first paints a
 * "parsing" state and yields two frames. The parent remounts the pane (by key)
 * for every file, and unmounting disposes the viewer and its GPU device.
 */
type Status = PreviewStatus | 'parsing';
type LayoutMode = 'single' | 'continuous';

const THUMB_LIMIT = 60;
const THUMB_WIDTH = 120;

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function pageSize(layout: SessionPagesLayout | null, page: number): string | null {
  const p = layout?.pages[page];
  if (!p) return null;
  const mm = (pt: number) => ((pt * 25.4) / 72).toFixed(1);
  return `${+p.widthPt.toFixed(2)} × ${+p.heightPt.toFixed(2)} pt (${mm(p.widthPt)} × ${mm(p.heightPt)} mm)`;
}

function Thumb({ raster, index, active, onClick }: { raster: SessionRaster; index: number; active: boolean; onClick: () => void }) {
  const ref = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      canvas.width = raster.width;
      canvas.height = raster.height;
      const rgba = new Uint8ClampedArray(raster.rgba.buffer as ArrayBuffer, raster.rgba.byteOffset, raster.rgba.byteLength);
      canvas.getContext('2d')?.putImageData(new ImageData(rgba, raster.width, raster.height), 0, 0);
    },
    [raster],
  );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Page ${index + 1}`}
      aria-current={active ? 'true' : undefined}
      style={{ flex: 'none', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'center' }}
    >
      <canvas
        ref={ref}
        style={{
          display: 'block',
          width: THUMB_WIDTH / 1.5,
          height: 'auto',
          background: '#fff',
          outline: active ? '2px solid var(--color-accent)' : '1px solid var(--color-rule)',
          outlineOffset: active ? 1 : 0,
        }}
      />
      <span style={{ ...mono, fontSize: 10.5, ...muted }}>{index + 1}</span>
    </button>
  );
}

export function RenderPane({
  bytes,
  fonts,
  unavailable = [],
  height = 560,
}: {
  bytes: Uint8Array;
  fonts: SessionFont[];
  /** Applied font families the renderer has no face for (from the summary). */
  unavailable?: string[];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const sessionRef = useRef<ViewerSessionLike | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  const [diagnostics, setDiagnostics] = useState<SessionDiagnostic[]>([]);
  const [layout, setLayout] = useState<SessionPagesLayout | null>(null);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [mode, setMode] = useState<LayoutMode>('single');
  const [showThumbs, setShowThumbs] = useState(false);
  const [thumbs, setThumbs] = useState<SessionRaster[]>([]);

  const sync = useCallback(() => {
    const v = viewerRef.current;
    if (!v) return;
    setZoom(v.zoom);
    setPage(v.currentPage);
    setPages(v.pageCount);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const offs: Array<() => void> = [];
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      setStatus('no-webgpu');
      return;
    }
    void (async () => {
      try {
        const { createViewer } = await import('@paged-media/idml-viewer');
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewer = await createViewer({
          canvas,
          session: async () => {
            const s = await createPreviewSession(fonts);
            // Keep what `load` reports; `Viewer.load` throws on errors but drops warnings.
            const load = s.load.bind(s);
            s.load = (idml, font) => {
              const d = load(idml, font);
              if (!cancelled) setDiagnostics(d.messages ?? []);
              return d;
            };
            sessionRef.current = s;
            return s;
          },
          layoutMode: 'single',
          input: { wheelZoom: true, dragPan: true, doubleClickZoom: true, keyboard: false },
        });
        if (cancelled) {
          viewer.dispose();
          return;
        }
        viewerRef.current = viewer;
        offs.push(viewer.on('pageChanged', sync), viewer.on('zoomChanged', sync));

        setStatus('parsing');
        await nextFrame();
        await nextFrame();
        if (cancelled) return;
        await viewer.load(bytes);
        if (cancelled) return;
        setLayout(sessionRef.current?.page_layout() ?? null);
        viewer.fit('page');
        sync();
        setStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        const diags = (e as { diagnostics?: { messages?: SessionDiagnostic[] } } | null)?.diagnostics?.messages;
        if (diags) setDiagnostics(diags);
        const { status, detail } = statusFromError(e);
        setStatus(status);
        setDetail(detail);
      }
    })();
    return () => {
      cancelled = true;
      const v = viewerRef.current;
      viewerRef.current = null;
      sessionRef.current = null;
      try {
        offs.forEach((off) => off());
        v?.dispose();
      } catch {
        /* gone */
      }
    };
  }, [bytes, fonts, sync]);

  // The viewer sizes its surface once, at first paint; follow the canvas after that.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'ready' || typeof ResizeObserver === 'undefined') return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) return void (first = false);
      const s = sessionRef.current;
      const v = viewerRef.current;
      if (!s || !v || !canvas.clientWidth) return;
      s.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      v.fit('page');
      sync();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [status, sync]);

  // Thumbnails, one at a time, only once asked for.
  useEffect(() => {
    if (!showThumbs || status !== 'ready') return;
    let live = true;
    void (async () => {
      const v = viewerRef.current;
      if (!v) return;
      const out: SessionRaster[] = [];
      for (let i = 0; i < Math.min(v.pageCount, THUMB_LIMIT); i++) {
        try {
          out.push(await v.renderPageThumbnail(i, { width: THUMB_WIDTH }));
        } catch {
          break;
        }
        if (!live) return;
        setThumbs([...out]);
      }
    })();
    return () => {
      live = false;
    };
  }, [showThumbs, status]);

  const act = (fn: (v: Viewer) => void) => () => {
    const v = viewerRef.current;
    if (!v) return;
    fn(v);
    sync();
  };
  const toggleLayout = () => {
    const v = viewerRef.current;
    if (!v) return;
    const next: LayoutMode = mode === 'single' ? 'continuous' : 'single';
    v.layoutMode(next);
    setMode(next);
    sync();
  };

  const disabled = status !== 'ready';
  const warnings = diagnostics.filter((d) => d.severity !== 'error' || status !== 'ready');

  return (
    <section style={sheet} aria-label="Live render">
      <div style={{ ...strip, justifyContent: 'flex-start', gap: 8 }}>
        <span style={{ ...label, marginRight: 4 }}>Render</span>
        <button style={btn} disabled={disabled} onClick={act((v) => v.fit('page'))} title="Fit the page">Fit page</button>
        <button style={btn} disabled={disabled} onClick={act((v) => v.fit('width'))} title="Fit the width">Fit width</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled} onClick={act((v) => v.zoomOut())} aria-label="Zoom out">−</button>
        <span style={{ ...mono, ...muted, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button style={btn} disabled={disabled} onClick={act((v) => v.zoomIn())} aria-label="Zoom in">+</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled || page <= 0} onClick={act((v) => v.goToPage(v.currentPage - 1))} aria-label="Previous page">◀</button>
        <label style={{ ...mono, ...muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          page
          <input
            type="number"
            min={1}
            max={Math.max(1, pages)}
            value={pages ? page + 1 : ''}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.currentTarget.value);
              if (Number.isFinite(n) && n >= 1 && n <= pages) act((v) => v.goToPage(n - 1))();
            }}
            style={{ ...mono, width: 52, padding: '3px 4px', border: '1px solid var(--color-rule)', borderRadius: 3, background: 'var(--color-paper)' }}
          />
          / {pages || '—'}
        </label>
        <button style={btn} disabled={disabled || page >= pages - 1} onClick={act((v) => v.goToPage(v.currentPage + 1))} aria-label="Next page">▶</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled} onClick={toggleLayout}>{mode === 'single' ? 'One page' : 'All pages'}</button>
        <button style={btn} disabled={disabled} onClick={() => setShowThumbs((s) => !s)} aria-pressed={showThumbs}>Thumbnails</button>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          aria-label="Rendered page"
          style={{ display: 'block', width: '100%', maxWidth: '100%', height, background: 'color-mix(in srgb, var(--color-rule) 35%, var(--color-paper))', touchAction: 'none' }}
        />
        {status !== 'ready' && (
          <div
            role="status"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 24,
              fontFamily: 'var(--font-sans)',
              fontSize: 13.5,
              color: 'var(--color-ink-soft)',
              background: 'color-mix(in srgb, var(--color-paper-soft) 88%, transparent)',
            }}
          >
            {status === 'loading' && <span>Starting the WebGPU renderer…</span>}
            {status === 'parsing' && <span>Parsing and laying out the document… The page may pause for a moment on a large file.</span>}
            {status === 'no-webgpu' && (
              <span>
                This browser does not expose WebGPU, so the document can’t be rendered here. Everything else on this page still works.
              </span>
            )}
            {status === 'unavailable' && <span>The renderer isn’t available in this deployment.</span>}
            {status === 'error' && <span>The renderer could not open this document: {detail}</span>}
          </div>
        )}
      </div>

      {showThumbs && status === 'ready' && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 12px', borderTop: '1px solid var(--color-rule)' }}>
          {thumbs.map((t, i) => (
            <Thumb key={i} raster={t} index={i} active={i === page} onClick={act((v) => v.goToPage(i))} />
          ))}
          {pages > THUMB_LIMIT && thumbs.length >= THUMB_LIMIT && (
            <span style={{ alignSelf: 'center', fontFamily: 'var(--font-sans)', fontSize: 12.5, ...muted }}>First {THUMB_LIMIT} of {pages} pages</span>
          )}
        </div>
      )}

      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-rule)', fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-ink-soft)', display: 'grid', gap: 4 }}>
        {status === 'ready' && pageSize(layout, page) && (
          <span>
            Page {page + 1}: <span style={mono}>{pageSize(layout, page)}</span>
          </span>
        )}
        {warnings.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer' }}>
              {warnings.length} message{warnings.length === 1 ? '' : 's'} from the renderer
            </summary>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {warnings.slice(0, 50).map((d, i) => (
                <li key={i} style={mono}>
                  {d.severity} · {d.code}: {d.message}
                  {d.part ? ` (${d.part}${d.line ? `:${d.line}` : ''})` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
        <span style={muted}>
          {fonts.length > 0 && `${fonts.length} font face${fonts.length === 1 ? '' : 's'} from the package registered. `}
          {unavailable.length > 0
            ? `${unavailable.length === 1 ? 'One applied family is' : `${unavailable.length} applied families are`} not in the package (${unavailable.slice(0, 3).join(', ')}${unavailable.length > 3 ? ', …' : ''}); that text is drawn in Open Sans as a stand-in, so line breaks can differ.`
            : 'Every applied font family is available to the renderer.'}{' '}
          The renderer does not yet report substitutions itself.
        </span>
      </div>
    </section>
  );
}
