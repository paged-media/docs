/**
 * Process-wide singleton loader for the WebGPU paged-sdk wasm.
 *
 * Every `<LivePreview>` on a page (and every remount when switching tabs) shares
 * ONE wasm module and ONE `init()`. This is load-bearing: wasm-bindgen keeps the
 * instance in a module-level binding, so a second `init()` — e.g. two previews
 * initializing at once, or a preview remounting on tab-switch — would replace it
 * and leave already-created `ViewerSession` objects pointing at stale memory
 * (the preview then silently stops rendering). Memoizing the import+init makes
 * `init()` happen exactly once; each preview just creates its own session.
 */
let sdk: Promise<any> | undefined;

export function loadSdk(): Promise<any> {
  if (!sdk) {
    sdk = (async () => {
      // Runtime import from /public — the glue is built out-of-band by
      // scripts/build-preview-wasm.sh, not bundled by Next.
      const jsUrl = '/preview/paged_sdk.js';
      const mod: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ jsUrl);
      await mod.default('/preview/paged_sdk_bg.wasm');
      return mod;
    })().catch((e) => {
      // Don't cache a failed load — a later mount (or a deploy that builds the
      // wasm) should be able to retry.
      sdk = undefined;
      throw e;
    });
  }
  return sdk;
}
