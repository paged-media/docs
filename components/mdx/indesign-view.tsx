import { join } from 'node:path';
import type { ExampleManifest } from '@/lib/examples';
import { LivePreview } from './live-preview';

/**
 * InDesign's own rendering of an example beside Paged's live one, with the
 * verification stamp. Rendered only while the stamp matches the package
 * (ExampleEmbed checks partsHash), so a stale claim never ships. The page
 * images are InDesign's PDF rasterised at 96 dpi (FOGRA39), staged into
 * /examples/<id>/ by scripts/stage-verified.mjs.
 */
export function InDesignView({
  example,
  manifest,
  idmlBase64,
}: {
  example: string;
  manifest: ExampleManifest;
  idmlBase64?: string;
}) {
  const v = manifest.verified!;
  const pages = Array.from({ length: v.pages ?? 1 }, (_, i) => `/examples/${example}/p${i + 1}.webp`);
  const version = v.indesignVersion?.split('.').slice(0, 3).join('.');
  return (
    <div className="not-prose">
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="m-0">
          <div className="flex flex-col gap-3 rounded-[2px] border border-fd-border bg-white p-3">
            {pages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt={`InDesign's rendering of ${example}, page ${i + 1}`}
                loading="lazy"
                className="mx-auto block h-auto max-h-[456px] w-auto max-w-full"
              />
            ))}
          </div>
          <figcaption className="mt-2 text-xs text-fd-muted-foreground">InDesign {version}</figcaption>
        </figure>
        <figure className="m-0">
          <LivePreview example={example} part={join(manifest.packageDir, manifest.editable.part)} idmlBase64={idmlBase64} />
          <figcaption className="mt-2 text-xs text-fd-muted-foreground">Paged, live in this browser</figcaption>
        </figure>
      </div>
      <p className="mt-3 text-xs text-fd-muted-foreground">
        Verified with InDesign {version} on {v.verifiedAt}: the package opens and nothing is missing
        {v.roundTrip ? ', and InDesign re-saves it as IDML' : ''}.
        {v.fidelity?.meanDE !== undefined
          ? ` Paged's render differs from InDesign's by a mean ΔE of ${v.fidelity.meanDE} on its worst page.`
          : ''}
        {v.fidelity?.fontsMatched === false
          ? " InDesign set this example's text in a different face from the live view's Open Sans."
          : ''}
      </p>
    </div>
  );
}
