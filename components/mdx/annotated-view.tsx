import { highlight } from '@/lib/shiki';
import type { ExampleAnnotation } from '@/lib/examples';

/**
 * The "annotated" view (briefing §6.2): the same source with line-by-line
 * callouts. Callouts are anchored to lines carrying a trailing `<!--#N-->`
 * marker (stripped at highlight time, see lib/shiki.ts), and listed beside the
 * code. The two-column layout collapses on narrow screens.
 */
export async function AnnotatedView({
  code,
  annotations = [],
}: {
  code: string;
  annotations?: ExampleAnnotation[];
}) {
  const html = await highlight(code, 'xml', true);
  return (
    <div className="not-prose grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div
        className="overflow-x-auto rounded-lg border border-fd-border p-4 text-sm [&_[data-callout]]:bg-fd-accent/40"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ol className="space-y-2 text-sm">
        {annotations.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-mono text-fd-muted-foreground">L{a.lines}</span>
            <span>{a.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
