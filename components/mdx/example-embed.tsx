import type { ReactNode } from 'react';
import { getExample, type ExampleView } from '@/lib/examples';
import { assembleExampleBase64 } from '@/lib/assemble-example';
import { RawView } from './raw-view';
import { AnnotatedView } from './annotated-view';
import { TreeView } from './tree-view';
import { LivePreview } from './live-preview';
import { ExampleTabs } from './example-tabs';

/**
 * The example wrapper (briefing §6.2). Examples are imported BY ID from the
 * shared `examples/` directory — never inlined — so the docs page can never
 * drift from what the renderer actually accepts in CI. The tab set is driven by
 * the manifest's `views`; the `live` tab is the reserved WebGPU slot (§6.2.1).
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

  // Assemble the full package to bytes only when this example offers the live
  // view — the WebGPU preview renders the same bytes the CI gate validates.
  const idmlBase64 = manifest.views.includes('live') ? assembleExampleBase64(example) : undefined;

  const panels: Partial<Record<ExampleView, ReactNode>> = {
    raw: <RawView code={editableSource} lang={manifest.editable.language} />,
    annotated: <AnnotatedView code={editableSource} annotations={manifest.annotations} />,
    tree: <TreeView code={editableSource} />,
    live: <LivePreview example={example} part={editablePart} idmlBase64={idmlBase64} />,
  };

  return (
    <ExampleTabs
      caption={children ?? manifest.concept ?? manifest.title}
      path={manifest.editable.label}
      code={editableSource}
      tabs={manifest.views}
      panels={panels}
      feature={feature}
    />
  );
}
