/**
 * Reserved slot for the WebGPU live preview (briefing §6.2.1).
 *
 * Phase 0 ships this placeholder so pages can already declare the `live` view
 * without rework. When `@paged-media/viewer` (the slim renderer-core WebGPU
 * viewer) is wired in (task 9 / once the WebGPU `paged-sdk` lands), this renders
 * the viewer over the example's assembled package; on a browser without
 * `navigator.gpu` it shows a one-line note and the raw/annotated/tree views carry
 * the page. No MDX page changes are needed when that swap happens.
 */
export function LivePreview({ example }: { example: string; part: string }) {
  return (
    <div className="not-prose rounded-lg border border-dashed border-fd-border p-6 text-center text-sm text-fd-muted-foreground">
      Live WebGPU preview of <code className="font-mono">{example}</code> is coming
      soon — it will render this exact package with the Paged renderer. For now, use
      the Raw / Annotated / Tree views.
    </div>
  );
}
