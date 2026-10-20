/**
 * What the live preview, the SDK playground and the inspector share: decoding
 * the package bytes a server component hands over, and turning a viewer
 * failure into the status the UI shows.
 */
export type { Viewer } from '@paged-media/viewer';

export type PreviewStatus = 'loading' | 'ready' | 'no-webgpu' | 'unavailable' | 'error';

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * ViewerError carries a structured code; the wasm import/init failures that
 * surface before a ViewerError exists are recognised by their message.
 */
export function statusFromError(e: unknown): { status: Exclude<PreviewStatus, 'loading' | 'ready'>; detail: string } {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  if (code === 'GPU_UNAVAILABLE' || /gpu|webgpu|adapter/i.test(msg)) return { status: 'no-webgpu', detail: msg };
  if (/Failed to fetch|Cannot find module|importing|404|MIME/i.test(msg)) return { status: 'unavailable', detail: msg };
  return { status: 'error', detail: msg };
}
