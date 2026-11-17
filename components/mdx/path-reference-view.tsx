'use client';
/**
 * Client filter view for <PathReference>. Settable paths grouped by theme, each
 * with its IDML type hint + summary where known, and a link to the theme's
 * runnable showcase. A search box filters across name, type, and summary.
 */
import { useState } from 'react';
import { resolveHref } from '@/lib/site';
import s from './scripting-catalog.module.css';

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

export function PathReferenceView({ groups, count }: { groups: PathGroup[]; count: number }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();

  const filtered = needle
    ? groups
        .map((g) => ({
          ...g,
          rows: g.rows.filter((r) => `${r.path} ${r.typeHint ?? ''} ${r.summary ?? ''}`.toLowerCase().includes(needle)),
        }))
        .filter((g) => g.rows.length > 0)
    : groups;
  const shown = filtered.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className={`not-prose ${s.catalog}`}>
      <input
        type="search"
        className={s.filter}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter settable paths: name, type or description"
        aria-label="Filter settable paths"
      />
      <p className={s.count} aria-live="polite">
        {shown} of {count} settable paths, the second argument to <code>paged.set(id, path, value)</code>
        {needle ? ` matching “${q}”` : ', grouped by theme'}.
      </p>

      {filtered.map((g) => (
        <section key={g.id} className={s.group} aria-label={g.title}>
          <h3 className={s.groupTitle}>
            {g.title}
            <span>{g.rows.length}</span>{' '}
            <a className={s.try} href={resolveHref(`/docs/paged/scripting/showcases#theme-${g.id}`)}>
              Run in the lab ▸
            </a>
          </h3>
          <table className={s.table}>
            <colgroup>
              <col className={s.colForm} />
              <col className={s.colExample} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Path</th>
                <th scope="col">Type</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.path}>
                  <td className={s.lead} data-label="Path">
                    <code className={s.form}>{r.path}</code>
                  </td>
                  <td data-label="Type">{r.typeHint ? <code className={s.example}>{r.typeHint}</code> : <span className={s.empty}>—</span>}</td>
                  <td data-label="Meaning" className={s.note}>
                    {r.summary ?? <span className={s.empty}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {filtered.length === 0 ? <p className={s.empty}>No paths match “{q}”.</p> : null}
    </div>
  );
}
