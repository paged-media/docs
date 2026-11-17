import type { ComponentProps } from 'react';

/** Columns at which a prose table is too wide for a phone and scrolls in its own region. */
export const WIDE_TABLE_COLUMNS = 5;

/**
 * The MDX `table`: Markdown tables, wrapped so they never grow past the
 * article's column (app/global.css, "No table is wider than its column").
 * `rehypeTableMeta` (source.config.ts) counts the columns and names the table
 * from the heading above it; a table with WIDE_TABLE_COLUMNS or more sits in a
 * labelled, focusable scroll region instead, the one place a table may scroll
 * sideways.
 */
export function ProseTable({
  'data-cols': cols,
  'data-label': label,
  ...props
}: ComponentProps<'table'> & { 'data-cols'?: string | number; 'data-label'?: string }) {
  const columns = Number(cols ?? 0);
  if (columns >= WIDE_TABLE_COLUMNS) {
    return (
      <div
        className="paged-table-scroll"
        role="region"
        aria-label={label ? `${label} (table)` : 'Table'}
        tabIndex={0}
      >
        <table {...props} />
      </div>
    );
  }
  return (
    <div className="paged-table-wrap">
      <table {...props} />
    </div>
  );
}
