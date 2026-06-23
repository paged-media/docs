'use client';

import { useMemo, useState } from 'react';
import type { SdkGroup } from '@/lib/generated';

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
const TD: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)',
  verticalAlign: 'top',
};
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12 };

const KIND_TONE: Record<string, string> = {
  function: 'var(--valid)',
  method: 'var(--valid)',
  property: 'var(--color-muted)',
  event: 'var(--warn)',
  class: 'var(--color-rule-strong, var(--color-muted))',
  type: 'var(--color-muted)',
};

function KindChip({ kind }: { kind: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 9.5,
        fontWeight: 680,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: KIND_TONE[kind] ?? 'var(--color-muted)',
        border: `1px solid color-mix(in srgb, ${KIND_TONE[kind] ?? 'var(--color-muted)'} 40%, var(--color-rule))`,
        borderRadius: 2,
        padding: '0 5px',
        whiteSpace: 'nowrap',
      }}
    >
      {kind}
    </span>
  );
}

/** Stable anchor id for a member, so cross-links can deep-link to it. */
export function memberAnchor(name: string): string {
  return 'sdk-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function SdkCatalogView({ groups }: { groups: SdkGroup[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        members: g.members.filter(
          (m) =>
            m.name.toLowerCase().includes(needle) ||
            m.summary.toLowerCase().includes(needle) ||
            m.signature.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.members.length > 0);
  }, [groups, needle]);

  const total = filtered.reduce((n, g) => n + g.members.length, 0);

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter the API — name, signature, or description…"
        aria-label="Filter SDK members"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '7px 10px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          border: '1px solid var(--color-rule)',
          borderRadius: 4,
          background: 'var(--color-paper, transparent)',
          marginBottom: 4,
        }}
      />
      <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '0 0 .75rem' }}>
        {total} member{total === 1 ? '' : 's'}
        {needle ? ` matching “${q}”` : ''}.
      </p>

      {filtered.map((g) => (
        <section key={g.key} style={{ margin: '0 0 1.4rem' }}>
          <h3 id={`sdk-group-${g.key}`} style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 16, margin: '0 0 1px' }}>
            {g.title}
          </h3>
          {g.summary ? <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>{g.summary}</p> : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={TH}>Member</th>
                  <th style={TH}>Signature</th>
                  <th style={TH}>Description</th>
                </tr>
              </thead>
              <tbody>
                {g.members.map((m) => (
                  <tr key={m.name} id={memberAnchor(m.name)}>
                    <td style={{ ...TD, ...mono, whiteSpace: 'nowrap' }}>
                      <strong>{m.name}</strong>
                      <div style={{ marginTop: 3 }}>
                        <KindChip kind={m.kind} />
                      </div>
                    </td>
                    <td style={{ ...TD, ...mono, color: 'var(--color-ink-soft, inherit)' }}>{m.signature}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-sans)', fontSize: 13 }}>{m.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No members match “{q}”.</p>
      ) : null}
    </div>
  );
}
