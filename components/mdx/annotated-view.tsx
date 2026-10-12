import { highlight } from '@/lib/shiki';
import type { ExampleAnnotation } from '@/lib/examples';
import { AnnotatedPanel } from './annotated-panel';

/**
 * The "annotated" view (briefing §6.2): the same source with line-by-line
 * notes. The code is numbered, and every line an annotation's `lines` covers
 * (or that ends in a `<!--#N-->` marker, stripped at highlight time, see
 * lib/shiki.ts) gets the brand highlight. The notes sit in a rule-left
 * marginalia column — mono line ref + IBM Plex Sans note — matching the Source
 * Code Panel's annotated mode (SourcePanel.jsx); pointing at a note lights its
 * lines and pointing at a marked line lights its note (AnnotatedPanel).
 * Collapses to one column on narrow screens.
 */
export async function AnnotatedView({
  code,
  annotations = [],
}: {
  code: string;
  annotations?: ExampleAnnotation[];
}) {
  const html = await highlight(code, 'xml', true, annotations);
  return <AnnotatedPanel html={html} annotations={annotations} />;
}
