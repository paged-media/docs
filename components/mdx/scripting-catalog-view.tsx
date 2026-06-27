'use client';
/**
 * Client filter views for the generated paged.* scripting catalog. The catalog
 * is large (every host function + ~179 settable paths), so a search box makes it
 * navigable. Server data comes from <ScriptingCatalog> (lib/generated).
 */
import { useMemo, useState } from 'react';
import type { HostFn } from '@/lib/generated';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };
const TH: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 640,
  letterSpacing: '0.04em',
  color: 'var(--color-muted)',
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-rule)',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', verticalAlign: 'top' };

const KIND_TITLE: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  author: 'Author (structural)',
  history: 'History (undo/redo)',
  console: 'Console',
};

function FilterBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        border: '1px solid var(--color-rule)',
        borderRadius: 4,
        background: 'var(--color-paper, transparent)',
        marginBottom: 8,
      }}
    />
  );
}

const fnAnchor = (name: string) => `fn-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

/** Filterable host-function tables, grouped by kind. */
export function ScriptingFnsView({
  groups,
  count,
  exampleFns = [],
}: {
  groups: Array<{ kind: string; functions: HostFn[] }>;
  count: number;
  exampleFns?: string[];
}) {
  const hasExample = new Set(exampleFns);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((g) => ({ ...g, functions: g.functions.filter((fn) => `${fn.name} ${fn.params} ${fn.summary}`.toLowerCase().includes(needle)) }))
      .filter((g) => g.functions.length > 0);
  }, [groups, needle]);
  const total = filtered.reduce((n, g) => n + g.functions.length, 0);

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <FilterBox value={q} onChange={setQ} placeholder="Filter host functions — name or description…" />
      <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 .75rem' }}>
        {total} of {count} host function{count === 1 ? '' : 's'}{needle ? ` matching “${q}”` : ', grouped by kind'}.
      </p>
      {filtered.map((g) => (
        <div key={g.kind} style={{ margin: '0 0 1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 15, margin: '0 0 2px' }}>{KIND_TITLE[g.kind] ?? g.kind}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TH}>Function</th>
                  <th style={TH}>Returns</th>
                  <th style={TH}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {g.functions.map((fn) => (
                  <tr key={fn.name}>
                    <td style={{ ...TD, ...mono, whiteSpace: 'nowrap' }}>
                      <strong>{fn.name}</strong>
                      <span style={{ color: 'var(--color-muted)' }}>{fn.params}</span>
                    </td>
                    <td style={{ ...TD, ...mono, color: 'var(--color-muted)' }}>{fn.returns}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>
                      {fn.summary}
                      {hasExample.has(fn.name) ? (
                        <>
                          {' '}
                          <a
                            href={`/docs/paged/scripting/examples#${fnAnchor(fn.name)}`}
                            style={{ whiteSpace: 'nowrap', fontWeight: 640, color: 'var(--color-accent)', textDecoration: 'none' }}
                          >
                            Try it ▸
                          </a>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {filtered.length === 0 ? <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No functions match “{q}”.</p> : null}
    </div>
  );
}

/** Filterable settable-paths chip cloud. */
export function ScriptingPathsView({ paths, count }: { paths: string[]; count: number }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => (needle ? paths.filter((p) => p.toLowerCase().includes(needle)) : paths), [paths, needle]);

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <FilterBox value={q} onChange={setQ} placeholder="Filter settable paths…" />
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>
        {filtered.length} of {count} settable paths — the second argument to <code style={mono}>paged.set(id, path, value)</code>.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
        {filtered.map((p) => (
          <code key={p} style={{ ...mono, fontSize: 11.5, background: 'color-mix(in srgb, var(--color-rule) 14%, transparent)', borderRadius: 3, padding: '1px 6px' }}>
            {p}
          </code>
        ))}
      </div>
      {filtered.length === 0 ? <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No paths match “{q}”.</p> : null}
    </div>
  );
}
