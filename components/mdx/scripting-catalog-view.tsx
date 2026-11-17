'use client';
/**
 * Client filter views for the generated paged.* scripting catalog. The catalog
 * is large (every host function and settable path), so a search box makes it
 * navigable. Server data comes from <ScriptingCatalog> (lib/generated).
 *
 * Styled by scripting-catalog.module.css: fixed column widths, so a long
 * signature or return type wraps in its cell and the table is never wider
 * than its column (tests/browsers/tables.spec.ts); on a narrow column each row
 * stacks under its column names (`data-label`).
 */
import { useState } from 'react';
import type { HostFn } from '@/lib/generated';
import { resolveHref } from '@/lib/site';
import { withCode } from './inline-code';
import s from './scripting-catalog.module.css';

const KIND_TITLE: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  author: 'Author (structural)',
  history: 'History (undo/redo)',
  console: 'Console',
};


function FilterBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <input
      type="search"
      className={s.filter}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
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
  const filtered = needle
    ? groups
        .map((g) => ({ ...g, functions: g.functions.filter((fn) => `${fn.name} ${fn.params} ${fn.summary}`.toLowerCase().includes(needle)) }))
        .filter((g) => g.functions.length > 0)
    : groups;
  const total = filtered.reduce((n, g) => n + g.functions.length, 0);

  return (
    <div className={`not-prose ${s.catalog}`}>
      <FilterBox value={q} onChange={setQ} placeholder="Filter host functions: name or description" label="Filter host functions" />
      <p className={s.count} aria-live="polite">
        {total} of {count} host function{count === 1 ? '' : 's'}
        {needle ? ` matching “${q}”` : ', grouped by kind'}.
      </p>
      {filtered.map((g) => {
        const title = KIND_TITLE[g.kind] ?? g.kind;
        return (
          <section key={g.kind} className={s.group} aria-label={`${title} functions`}>
            <h3 className={s.groupTitle}>
              {title}
              <span>{g.functions.length}</span>
            </h3>
            <table className={s.table}>
              <colgroup>
                <col className={s.colSignature} />
                <col className={s.colReturns} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Function</th>
                  <th scope="col">Returns</th>
                  <th scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {g.functions.map((fn) => (
                  <tr key={fn.name}>
                    <td className={s.lead} data-label="Function">
                      <code className={s.signature}>
                        <span className={s.name}>{fn.name}</span>
                        <span className={s.params}>{fn.params}</span>
                      </code>
                    </td>
                    <td data-label="Returns">
                      <code className={s.returns}>{fn.returns}</code>
                    </td>
                    <td data-label="Summary" className={s.summary}>
                      {withCode(fn.summary)}
                      {hasExample.has(fn.name) ? (
                        <a className={s.try} href={resolveHref(`/docs/paged/scripting/examples#${fnAnchor(fn.name)}`)}>
                          Try it ▸
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      {filtered.length === 0 ? <p className={s.empty}>No functions match “{q}”.</p> : null}
    </div>
  );
}

/** Filterable settable-paths list. */
export function ScriptingPathsView({ paths, count }: { paths: string[]; count: number }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = needle ? paths.filter((p) => p.toLowerCase().includes(needle)) : paths;

  return (
    <div className={`not-prose ${s.catalog}`}>
      <FilterBox value={q} onChange={setQ} placeholder="Filter settable paths" label="Filter settable paths" />
      <p className={s.count} aria-live="polite">
        {filtered.length} of {count} settable paths, the second argument to <code>paged.set(id, path, value)</code>.
      </p>
      <ul className={s.paths}>
        {filtered.map((p) => (
          <li key={p} className={s.path}>
            {p}
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? <p className={s.empty}>No paths match “{q}”.</p> : null}
    </div>
  );
}
