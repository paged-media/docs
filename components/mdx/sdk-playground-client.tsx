'use client';

/**
 * <SdkPlaygroundClient> — the interactive SDK demo. It boots the PUBLISHED
 * @paged-media/idml-viewer over a canvas (same path as <LivePreview>) and wires a
 * toolbar to the REAL API: fit, zoom, page navigation, and layout mode. An events
 * log shows the viewer's own events firing as you drive it — so the SDK reference
 * is something you operate, not just read. WebGPU-only, with a graceful fallback.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPreviewSession } from './sdk-loader';

type Status = 'loading' | 'ready' | 'no-webgpu' | 'unavailable' | 'error';
type LayoutMode = 'single' | 'continuous';

interface ViewerLike {
  load(b: Uint8Array): Promise<void>;
  fit(mode: 'page' | 'width'): void;
  setZoom(z: number, opts?: { anchor?: { x: number; y: number } }): void;
  zoomIn(): void;
  zoomOut(): void;
  goToPage(i: number): void;
  layoutMode(mode?: LayoutMode): LayoutMode;
  on(event: string, cb: (payload: unknown) => void): () => void;
  dispose(): void;
  readonly zoom: number;
  readonly currentPage: number;
  readonly pageCount: number;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const btn: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12.5,
  padding: '4px 9px',
  border: '1px solid var(--color-rule)',
  borderRadius: 4,
  background: 'var(--color-paper, #fff)',
  cursor: 'pointer',
  color: 'inherit',
};
const readout: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--color-muted)', minWidth: 0 };

export function SdkPlaygroundClient({ idmlBase64, height = 460 }: { idmlBase64?: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<ViewerLike | null>(null);
  const offsRef = useRef<Array<() => void>>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [layout, setLayout] = useState<LayoutMode>('single');
  const [log, setLog] = useState<string[]>([]);

  const push = useCallback((line: string) => {
    setLog((l) => [line, ...l].slice(0, 8));
  }, []);

  const sync = useCallback(() => {
    const v = viewerRef.current;
    if (!v) return;
    setZoom(v.zoom);
    setPage(v.currentPage);
    setPages(v.pageCount);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      setStatus('no-webgpu');
      return;
    }
    if (!idmlBase64) {
      setStatus('error');
      setDetail('no package bytes were provided');
      return;
    }
    setStatus('loading');
    void (async () => {
      try {
        const { createViewer } = await import('@paged-media/idml-viewer');
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewer = (await createViewer({
          canvas,
          session: createPreviewSession,
          layoutMode: 'single',
          input: { wheelZoom: true, dragPan: true, doubleClickZoom: true, keyboard: false },
        })) as unknown as ViewerLike;
        if (cancelled) {
          viewer.dispose();
          return;
        }
        viewerRef.current = viewer;
        // Wire the events log to the viewer's own events.
        offsRef.current = [
          viewer.on('loaded', (p) => push(`loaded · ${(p as { pageCount: number }).pageCount} page(s)`)),
          viewer.on('pageChanged', (p) => { push(`pageChanged · page ${(p as { page: number }).page + 1}`); sync(); }),
          viewer.on('zoomChanged', (p) => { push(`zoomChanged · ${Math.round((p as { zoom: number }).zoom * 100)}%`); sync(); }),
          viewer.on('error', (p) => push(`error · ${String((p as { message?: string }).message ?? p)}`)),
        ];
        await viewer.load(base64ToBytes(idmlBase64));
        if (cancelled) return;
        viewer.fit('page');
        sync();
        setStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        const code = (e as { code?: string } | null)?.code;
        const msg = e instanceof Error ? e.message : String(e);
        if (code === 'GPU_UNAVAILABLE' || /gpu|webgpu|adapter/i.test(msg)) setStatus('no-webgpu');
        else if (/Failed to fetch|Cannot find module|importing|404|MIME/i.test(msg)) setStatus('unavailable');
        else {
          setStatus('error');
          setDetail(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
      const v = viewerRef.current;
      viewerRef.current = null;
      try {
        offsRef.current.forEach((off) => off());
        offsRef.current = [];
        v?.dispose();
      } catch {
        /* gone */
      }
    };
  }, [idmlBase64, push, sync]);

  const act = (fn: (v: ViewerLike) => void) => () => {
    const v = viewerRef.current;
    if (!v) return;
    fn(v);
    sync();
  };
  const toggleLayout = () => {
    const v = viewerRef.current;
    if (!v) return;
    const next: LayoutMode = layout === 'single' ? 'continuous' : 'single';
    v.layoutMode(next);
    setLayout(next);
    push(`layoutMode('${next}')`);
    sync();
  };

  const disabled = status !== 'ready';

  return (
    <div className="not-prose" style={{ margin: '1.25rem 0', border: '1px solid var(--color-rule)', borderRadius: 6, overflow: 'hidden' }}>
      {/* Toolbar — every control calls the real SDK method named on it. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--color-rule)', background: 'color-mix(in srgb, var(--color-rule) 10%, transparent)' }}>
        <button style={btn} disabled={disabled} onClick={act((v) => v.fit('page'))} title="viewer.fit('page')">Fit page</button>
        <button style={btn} disabled={disabled} onClick={act((v) => v.fit('width'))} title="viewer.fit('width')">Fit width</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled} onClick={act((v) => v.zoomOut())} title="viewer.zoomOut()">−</button>
        <span style={readout}>{Math.round(zoom * 100)}%</span>
        <button style={btn} disabled={disabled} onClick={act((v) => v.zoomIn())} title="viewer.zoomIn()">+</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled || page <= 0} onClick={act((v) => v.goToPage(Math.max(0, page - 1)))} title="viewer.goToPage(n−1)">◀</button>
        <span style={readout}>{pages ? `page ${page + 1} / ${pages}` : '—'}</span>
        <button style={btn} disabled={disabled || page >= pages - 1} onClick={act((v) => v.goToPage(Math.min(pages - 1, page + 1)))} title="viewer.goToPage(n+1)">▶</button>
        <span style={{ width: 1, height: 18, background: 'var(--color-rule)' }} />
        <button style={btn} disabled={disabled} onClick={toggleLayout} title="viewer.layoutMode(…)">layout: {layout}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px' }}>
        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} aria-label="Interactive SDK viewer" style={{ display: 'block', width: '100%', height, background: 'var(--color-muted-bg, #f4f2ee)' }} />
          {status !== 'ready' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-muted)', background: 'var(--color-card, rgba(255,255,255,0.85))' }}>
              {status === 'loading' && <span>Booting the WebGPU viewer…</span>}
              {status === 'no-webgpu' && <span>This playground renders with WebGPU, which this browser doesn’t expose. The API reference below is unaffected.</span>}
              {status === 'unavailable' && <span>The viewer wasm isn’t staged in this deployment yet.</span>}
              {status === 'error' && <span>Couldn’t boot the viewer: {detail}</span>}
            </div>
          )}
        </div>
        {/* Events log — the viewer's own events, live. */}
        <div style={{ borderLeft: '1px solid var(--color-rule)', padding: '8px 10px', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, background: 'color-mix(in srgb, var(--color-rule) 6%, transparent)', overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 680, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 6 }}>
            viewer.on(…)
          </div>
          {log.length === 0 ? (
            <div style={{ color: 'var(--color-muted)' }}>Drive the viewer →<br />events appear here.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {log.map((l, i) => (
                <li key={i} style={{ color: i === 0 ? 'var(--color-ink, inherit)' : 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
