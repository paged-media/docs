'use client';

import { useEffect, useRef, useState } from 'react';
import { loadSdk } from './sdk-loader';

/**
 * The WebGPU live preview (briefing §6.2.1), powered by the renderer-core
 * `ViewerSession` from `@paged-media/sdk` (built to wasm by
 * scripts/build-preview-wasm.sh into /public/preview).
 *
 * It renders the example's assembled package — the SAME bytes the CI gate
 * validates — with our actual renderer, on a main-thread canvas via
 * `render_to_canvas_main`. There is NO CPU/WebGL fallback: when `navigator.gpu`
 * is absent (or the wasm hasn't been built), it shows a one-line note and the
 * raw / annotated / tree views carry the page.
 *
 * Lifecycle: the wasm is loaded+initialized ONCE via the shared `loadSdk()`
 * singleton; each mount creates its own `ViewerSession` and frees it on unmount
 * (releasing the WebGPU device), so switching tabs or having several previews on
 * one page neither double-initializes the wasm nor leaks GPU devices.
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
  const sessionRef = useRef<{ free?: () => void } | null>(null);
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
        const mod = await loadSdk();
        if (cancelled) return;

        const session = await mod.ViewerSession.new(); // rejects without a WebGPU adapter
        if (cancelled) {
          session.free?.();
          return;
        }
        sessionRef.current = session;

        const diags = session.load(base64ToBytes(idmlBase64), undefined);
        if (!diags?.ok) {
          setStatus('error');
          setDetail(diags?.messages?.[0]?.message ?? 'failed to load the package');
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 600;
        const cssH = canvas.clientHeight || 480;
        canvas.width = Math.max(1, Math.round(cssW * dpr));
        canvas.height = Math.max(1, Math.round(cssH * dpr));

        const r = await session.render_to_canvas_main(canvas);
        if (cancelled) return;
        if (!r?.ok) {
          setStatus('error');
          setDetail(r?.messages?.[0]?.message ?? 'render failed');
          return;
        }
        setStatus('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/gpu|webgpu|adapter/i.test(msg)) setStatus('no-webgpu');
        else if (/Failed to fetch|Cannot find module|importing|404|MIME/i.test(msg)) setStatus('unavailable');
        else {
          setStatus('error');
          setDetail(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = sessionRef.current;
      sessionRef.current = null;
      try {
        s?.free?.();
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
              Live preview isn’t built in this deployment yet. Run{' '}
              <code className="font-mono">scripts/build-preview-wasm.sh</code>. The
              static views still show the example.
            </span>
          )}
          {status === 'error' && <span>Couldn’t render this example: {detail}</span>}
        </div>
      )}
    </div>
  );
}
