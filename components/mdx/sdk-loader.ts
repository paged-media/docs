import type { ViewerSessionLike } from '@paged-media/idml-viewer';

/**
 * Process-wide singleton init for the WebGPU paged-sdk wasm that backs the
 * live preview.
 *
 * Decision-B path: the wasm-bindgen glue + binary ship inside the published
 * `@paged-media/idml-viewer` package and are staged into /public/preview by
 * scripts/prepare-preview-wasm.mjs. We load the glue from that stable static
 * URL (NOT bundled into any page JS — the 7 MB wasm only travels when a preview
 * actually mounts) and pass an explicit wasm URL, so resolution never depends on
 * the package's own `import.meta.url` surviving the static export's hashing.
 *
 * Memoizing the import+`init()` is load-bearing: wasm-bindgen keeps the instance
 * in a module-level binding, so a second `init()` — two previews initializing at
 * once, or one remounting on a tab-switch — would replace it and leave existing
 * `ViewerSession` objects pointing at stale memory (the preview then silently
 * stops rendering). With this singleton, `init()` runs exactly once per page;
 * each preview just creates its own session.
 */
type SdkGlue = {
  default: (init?: { module_or_path: string }) => Promise<unknown>;
  // wasm-bindgen's STATIC async factory, not a constructor — hence the quoted key.
  ViewerSession: { ['new'](): Promise<ViewerSessionLike> };
};

const GLUE_URL = '/preview/paged_sdk.js';
const WASM_URL = '/preview/paged_sdk_bg.wasm';

let glue: Promise<SdkGlue> | undefined;

function loadGlue(): Promise<SdkGlue> {
  if (!glue) {
    glue = (async () => {
      // Runtime import from /public — left untouched by Next's bundler so the
      // glue (and the wasm it fetches) stay out of the page bundle.
      const mod = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ GLUE_URL
      )) as SdkGlue;
      await mod.default({ module_or_path: WASM_URL });
      return mod;
    })().catch((e) => {
      // Don't cache a failed load — a later mount (or a deploy that stages the
      // wasm) should be able to retry.
      glue = undefined;
      throw e;
    });
  }
  return glue;
}

/**
 * Create a fresh `ViewerSession` (its own WebGPU device) over the shared,
 * once-initialized wasm. Suitable to hand straight to `createViewer({ session })`
 * from `@paged-media/idml-viewer`. Rejects without a WebGPU adapter.
 */
export async function createPreviewSession(): Promise<ViewerSessionLike> {
  const mod = await loadGlue();
  return mod.ViewerSession['new']();
}
