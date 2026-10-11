import type { ReactNode } from 'react';
import { join } from 'node:path';
import { EXAMPLES_DIR, getExample, type ExampleTab } from '@/lib/examples';
import { partsHash } from '@/lib/parts-hash';
import { assembleExampleBase64 } from '@/lib/assemble-example';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { LivePreview } from './live-preview';
import { ExampleTabs } from './example-tabs';
import { InDesignView } from './indesign-view';

/**
 * The example wrapper (briefing §6.2). Examples are imported BY ID from the
 * shared `examples/` directory — never inlined — so the docs page can never
 * drift from what the renderer actually accepts in CI. The tab set is driven by
 * the manifest's `views`; the `live` tab is the reserved WebGPU slot (§6.2.1).
 * An InDesign tab is added while the example's verification stamp matches its
 * parts (ADR 806): a package edited since InDesign saw it shows no claim.
 *
 * The chrome (the mono file-path strip, the tabs, the copy action, the
 * paper-soft sheet) is the brand Source Code Panel — see `ExampleTabs`. The
 * Shiki-highlighted view panels are rendered here (server) and handed to it.
 */
export async function ExampleEmbed({
  example,
  feature,
  children,
}: {
  example: string;
  feature?: boolean;
  children?: ReactNode;
}) {
  const { manifest, editableSource, editablePart } = getExample(example);

  const v = manifest.verified;
  const verified =
    v?.status === 'verified' && v.partsHash === partsHash(join(EXAMPLES_DIR, example, manifest.packageDir));

  // Assemble the full package to bytes only when a view renders it — the
  // WebGPU preview renders the same bytes the CI gate validates.
  const idmlBase64 = manifest.views.includes('live') || verified ? assembleExampleBase64(example) : undefined;

  const tabs: ExampleTab[] = verified ? [...manifest.views, 'indesign'] : manifest.views;
  const panels: Partial<Record<ExampleTab, ReactNode>> = {
    raw: <RawView code={editableSource} lang={manifest.editable.language} />,
    annotated: <AnnotatedView code={editableSource} annotations={manifest.annotations} />,
    tree: <TreeView code={editableSource} />,
    live: <LivePreview example={example} part={editablePart} idmlBase64={idmlBase64} />,
    indesign: verified ? <InDesignView example={example} manifest={manifest} idmlBase64={idmlBase64} /> : null,
  };

  return (
    <ExampleTabs
      caption={children ?? manifest.concept ?? manifest.title}
      path={manifest.editable.label}
      code={editableSource}
      tabs={tabs}
      panels={panels}
      feature={feature}
    />
  );
}
