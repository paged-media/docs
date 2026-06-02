import { highlight } from '@/lib/shiki';
import type { ExampleAnnotation } from '@/lib/examples';

/**
 * The "annotated" view (briefing §6.2): the same source with line-by-line
 * callouts. Lines carrying a trailing `<!--#N-->` marker (stripped at highlight
 * time, see lib/shiki.ts) get the brand highlight; the notes sit in a rule-left
 * marginalia column — mono line ref + IBM Plex Sans note — matching the Source
 * Code Panel's annotated mode (SourcePanel.jsx). Collapses on narrow screens.
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
    <div className="paged-annotated">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ol
        className="paged-marginalia"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '18px 20px',
          borderLeft: '1px solid var(--color-rule)',
        }}
      >
        {annotations.map((a, i) => (
          <li key={i} style={{ marginBottom: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '-0.01em',
                color: 'var(--color-accent)',
                marginRight: 8,
                whiteSpace: 'nowrap',
              }}
            >
              L{a.lines}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--color-muted)',
              }}
            >
              {a.note}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
