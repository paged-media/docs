'use client';
/**
 * Client filter view for <PathReference>. Settable paths grouped by theme, each
 * with its IDML type hint + summary where known, and a link to the theme's
 * runnable showcase. A search box filters across name, type, and summary.
 */
import { useMemo, useState } from 'react';

export interface PathRow {
  path: string;
  typeHint?: string;
  summary?: string;
}
export interface PathGroup {
  id: string;
  title: string;
  rows: PathRow[];
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };

export function PathReferenceView({ groups, count }: { groups: PathGroup[]; count: number }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => `${r.path} ${r.typeHint ?? ''} ${r.summary ?? ''}`.toLowerCase().includes(needle)),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, needle]);
  const shown = filtered.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter settable paths — name, type, or description…"
        aria-label="Filter settable paths"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '7px 10px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          border: '1px solid var(--color-rule)',
          borderRadius: 4,
          background: 'var(--color-paper, transparent)',
          marginBottom: 10,
        }}
      />
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .75rem' }}>
        {shown} of {count} settable paths — the second argument to <code style={mono}>paged.set(id, path, value)</code>
        {needle ? ` matching “${q}”` : ', grouped by theme'}.
      </p>

      {filtered.map((g) => (
        <div key={g.id} style={{ margin: '0 0 1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 15, margin: '0 0 4px' }}>
            {g.title}{' '}
            <a
              href={`/docs/paged/scripting/showcases#theme-${g.id}`}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 640, color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              demo ▸
            </a>
          </h3>
          <div style={{ display: 'grid', gap: 2 }}>
            {g.rows.map((r) => (
              <div key={r.path} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '2px 0', flexWrap: 'wrap' }}>
                <code style={{ ...mono, fontWeight: 600 }}>{r.path}</code>
                {r.typeHint ? <code style={{ ...mono, fontSize: 11, color: 'var(--color-muted)' }}>{r.typeHint}</code> : null}
                {r.summary ? (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-ink-soft, var(--color-muted))' }}>{r.summary}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 ? <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No paths match “{q}”.</p> : null}
    </div>
  );
}
