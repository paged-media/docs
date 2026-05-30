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
 */
export async function ExampleEmbed({
  example,
  children,
}: {
  example: string;
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
    <figure className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border">
      <figcaption className="flex items-baseline justify-between gap-3 border-b border-fd-border bg-fd-card px-4 py-2 text-sm">
        <span>{children ?? manifest.concept ?? manifest.title}</span>
        <span className="font-mono text-xs text-fd-muted-foreground">{manifest.editable.label}</span>
      </figcaption>
      <ExampleTabs tabs={manifest.views} panels={panels} />
    </figure>
  );
}
