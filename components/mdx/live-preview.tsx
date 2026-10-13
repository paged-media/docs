'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerSessionLike } from '@paged-media/idml-viewer';
import { createPreviewSession } from './sdk-loader';
import { base64ToBytes, statusFromError, type PreviewStatus, type Viewer } from './viewer-common';
import { focusRect, inkBounds, scaleRect, type Rect } from './content-bounds';

/**
 * The WebGPU live preview (briefing §6.2.1).
 *
 * Decision-B path: powered by the PUBLISHED `@paged-media/idml-viewer` — its
 * `createViewer` over the renderer-core `ViewerSession` (the wasm bundled with
 * that package, staged into /public/preview by prepare-preview-wasm.mjs and
 * loaded lazily, on mount, NOT in the page bundle). The package is consumed from
 * npm at the release matching core.pin; nothing is built from a core checkout.
 *
 * It renders the example's assembled package — the SAME bytes the CI gate
 * validates — with our actual renderer, on a main-thread canvas. There is NO
 * CPU/WebGL fallback: when `navigator.gpu` is absent (or the wasm hasn't been
 * staged), it shows a one-line note and the raw / annotated / tree views carry
 * the page.
 *
 * Framing: the preview opens on the page's CONTENT, not the whole sheet — a
 * small render of the page finds the ink, and the camera fits that box (with a
 * margin, and a zoom cap so a single word is not blown up). "Whole page" goes
 * back to the sheet. The InDesign comparison passes its own `focus` (measured
 * on InDesign's raster) and drives `fit`, so both sides show the same region.
 *
 * Lifecycle: the wasm is imported+initialized ONCE via the shared
 * `createPreviewSession()` singleton; each mount builds its own `Viewer` (own
 * WebGPU device) and `dispose()`s it on unmount, so switching tabs or having
 * several previews on one page neither double-initializes the wasm nor leaks GPU
 * devices. The component is client-only (dynamic import, no SSR) — the static
 * export emits the canvas shell and the viewer hydrates on the client.
 */
type Status = PreviewStatus;
export type Fit = 'content' | 'page';

/** CSS px per pt: a content fit never zooms past this. */
export const MAX_CONTENT_ZOOM = 1.8;
/** Canvas height bounds (CSS px); a content fit takes the region's shape between them. */
export const MIN_H = 180;
const MAX_H = 480;

export function LivePreview({
  example,
  idmlBase64,
  fit: fitProp,
  onFitChange,
  focus: focusProp,
  toggle = true,
  onStatusChange,
}: {
  example: string;
  part: string;
  idmlBase64?: string;
  /** Controlled framing; omit to let the preview own it. */
  fit?: Fit;
  onFitChange?: (fit: Fit) => void;
  /** The region (pt, page 1) a content fit shows; omit to measure the render. */
  focus?: Rect | null;
  /** Show the Fit content / Whole page switch over the canvas. */
  toggle?: boolean;
  /** Told whenever the preview starts, renders, or falls back. */
  onStatusChange?: (status: Status) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const sessionRef = useRef<ViewerSessionLike | null>(null);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  const [ownFit, setOwnFit] = useState<Fit>('content');
  const [measured, setMeasured] = useState<Rect | null>(null);
  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);
  const fit = fitProp ?? ownFit;
  const focus = focusProp === undefined ? measured : focusProp;
  // A content fit gives the canvas the region's shape, so a three-line example
  // is not a strip of text in a tall empty box.
  const height =
    fit === 'content' && focus && width ? Math.round(Math.max(MIN_H, Math.min(MAX_H, (width * focus.h) / focus.w))) : MAX_H;
  const framing = useRef({ fit, focus });
  framing.current = { fit, focus };

  const setFit = (next: Fit) => {
    if (fitProp === undefined) setOwnFit(next);
    onFitChange?.(next);
  };

  const frame = useCallback((mode: Fit, rect: Rect | null) => {
    const viewer = viewerRef.current;
    const canvas = canvasRef.current;
    if (!viewer || !canvas) return;
    // `fit` always repaints; the content camera below lands in the same frame.
    // (A resized surface is blank until the next paint, and a camera that did
    // not move would not ask for one.)
    viewer.fit('page');
    if (mode === 'page' || !rect) return;
    const vw = canvas.clientWidth;
    const vh = canvas.clientHeight;
    const zoom = Math.max(viewer.minZoom, Math.min(MAX_CONTENT_ZOOM, viewer.maxZoom, 0.96 * Math.min(vw / rect.w, vh / rect.h)));
    viewer.setZoom(zoom);
    viewer.scrollTo(vw / 2 - (rect.x + rect.w / 2) * zoom, vh / 2 - (rect.y + rect.h / 2) * zoom);
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
        // Lazy: pulls @paged-media/idml-viewer's createViewer into a separate
        // chunk, and createPreviewSession imports the wasm glue from /public —
        // so neither the viewer JS nor the ~9 MB wasm is in the page bundle.
        const { createViewer } = await import('@paged-media/idml-viewer');
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewer = await createViewer({
          canvas,
          // rejects without a WebGPU adapter; kept to read the page size and resize the surface
          session: async () => (sessionRef.current = await createPreviewSession()),
          layoutMode: 'single',
          input: { wheelZoom: false, dragPan: true, doubleClickZoom: true, keyboard: false },
        });
        if (cancelled) {
          viewer.dispose();
          return;
        }
        viewerRef.current = viewer;

        await viewer.load(base64ToBytes(idmlBase64));
        if (cancelled) return;

        // Find the ink on page 1 from a small render of it (pt via the page width).
        let rect: Rect | null = null;
        if (focusProp === undefined) {
          const page = sessionRef.current?.page_layout().pages[0];
          if (page) {
            // Let the first paint finish: the session is borrowed for the whole
            // readback, and a paint landing inside it is refused by the wasm.
            await nextFrames(2);
            if (cancelled) return;
            const raster = await viewer.renderPageThumbnail(0, { width: 480 });
            if (cancelled) return;
            const k = page.widthPt / raster.width;
            const ink = inkBounds(raster.rgba, raster.width, raster.height);
            rect = focusRect(ink && scaleRect(ink, k), page.widthPt, page.heightPt);
            setMeasured(rect);
          }
        }
        frame(fitProp ?? 'content', focusProp === undefined ? rect : focusProp);
        setStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        const { status, detail } = statusFromError(e);
        setStatus(status);
        if (status === 'error') setDetail(detail);
      }
    })();

    return () => {
      cancelled = true;
      const v = viewerRef.current;
      viewerRef.current = null;
      sessionRef.current = null;
      try {
        v?.dispose();
      } catch {
        /* already gone */
      }
    };
    // The viewer is built once per package; framing changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idmlBase64]);

  // Re-frame when the framing or the region changes after load.
  useEffect(() => {
    if (status === 'ready') frame(fit, focus);
  }, [status, fit, focus, frame]);

  // Follow the canvas: its width sets the content-fit height, and the viewer
  // sizes its GPU surface only once, at first paint — so resize it on change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setWidth(canvas.clientWidth);
      const session = sessionRef.current;
      if (status !== 'ready' || !session || !canvas.clientWidth) return;
      session.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      frame(framing.current.fit, framing.current.focus);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [status, frame]);

  return (
    <div className="not-prose relative">
      <canvas
        ref={canvasRef}
        aria-label={`Live WebGPU render of ${example}`}
        className="block w-full rounded-[2px] bg-fd-muted"
        style={{ height }}
      />
      {status === 'ready' && toggle && focus ? <FitSwitch fit={fit} onChange={setFit} floating /> : null}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[2px] border border-dashed border-fd-border bg-fd-card/85 p-6 text-center text-sm text-fd-muted-foreground">
          {status === 'loading' && <span>Rendering with WebGPU…</span>}
          {status === 'no-webgpu' && (
            <span>
              Live preview requires WebGPU, which this browser doesn’t expose. The
              Raw / Annotated / Tree views show the same example.
            </span>
          )}
          {status === 'unavailable' && (
            <span>
              Live preview isn’t available in this deployment yet. The static views
              still show the example.
            </span>
          )}
          {status === 'error' && <span>Couldn’t render this example: {detail}</span>}
        </div>
      )}
    </div>
  );
}

function nextFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
}

/** Fit content / Whole page — over the canvas, or above a comparison. */
export function FitSwitch({ fit, onChange, floating }: { fit: Fit; onChange: (fit: Fit) => void; floating?: boolean }) {
  return (
    <div role="group" aria-label="Framing" className={`paged-fit-switch${floating ? ' is-floating' : ''}`}>
      <button type="button" aria-pressed={fit === 'content'} onClick={() => onChange('content')}>
        Fit content
      </button>
      <button type="button" aria-pressed={fit === 'page'} onClick={() => onChange('page')}>
        Whole page
      </button>
    </div>
  );
}
