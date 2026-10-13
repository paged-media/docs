import { join } from 'node:path';
import type { ExampleManifest } from '@/lib/examples';
import { InDesignCompare } from './indesign-compare';

/**
 * InDesign's own rendering of an example beside Paged's live one, with the
 * verification stamp. Both sides open framed on the page's content
 * (InDesignCompare). Rendered only while the stamp matches the package
 * (ExampleEmbed checks partsHash), so a stale claim never ships. The page
 * images are InDesign's PDF rasterised (FOGRA39) at 96 dpi, the record the
 * ΔE is measured on, and at 288 dpi for display; scripts/stage-verified.mjs
 * stages both into /examples/<id>/.
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
  const pages = Array.from({ length: v.pages ?? 1 }, (_, i) => ({
    src: `/examples/${example}/p${i + 1}.webp`,
    sharp: `/examples/${example}/p${i + 1}@3x.webp`,
  }));
  const version = v.indesignVersion?.split('.').slice(0, 3).join('.');
  return (
    <div className="not-prose">
      <InDesignCompare
        example={example}
        pages={pages}
        part={join(manifest.packageDir, manifest.editable.part)}
        idmlBase64={idmlBase64}
        version={version}
      />
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
