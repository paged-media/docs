'use client';

import { useEffect, useRef, useState } from 'react';
import { createPreviewSession } from './sdk-loader';

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
 * Lifecycle: the wasm is imported+initialized ONCE via the shared
 * `createPreviewSession()` singleton; each mount builds its own `Viewer` (own
 * WebGPU device) and `dispose()`s it on unmount, so switching tabs or having
 * several previews on one page neither double-initializes the wasm nor leaks GPU
 * devices. The component is client-only (dynamic import, no SSR) — the static
 * export emits the canvas shell and the viewer hydrates on the client.
 */
type Status = 'loading' | 'ready' | 'no-webgpu' | 'unavailable' | 'error';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function LivePreview({ example, idmlBase64 }: { example: string; part: string; idmlBase64?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<{ dispose: () => void } | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');

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
        // so neither the viewer JS nor the 7 MB wasm is in the page bundle.
        const { createViewer } = await import('@paged-media/idml-viewer');
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewer = await createViewer({
          canvas,
          session: createPreviewSession, // rejects without a WebGPU adapter
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
        viewer.fit('page');
        setStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        // ViewerError carries a structured code; fall back to message sniffing
        // for the wasm import/init failures that surface before a ViewerError.
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
        v?.dispose();
      } catch {
        /* already gone */
      }
    };
  }, [idmlBase64]);

  return (
    <div className="not-prose relative">
      <canvas
        ref={canvasRef}
        aria-label={`Live WebGPU render of ${example}`}
        className="block h-[480px] w-full rounded-[2px] bg-fd-muted"
      />
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
