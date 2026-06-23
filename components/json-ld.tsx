/**
 * <JsonLd> — renders a schema.org JSON-LD block. The payload is built per page
 * from frontmatter + the page's own Markdown (lib/structured-data.ts); this is
 * just the <script> carrier. Safe to inline in the body under static export.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped; close out any stray </script> defensively.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
