/**
 * <ScriptingCatalog /> — the Boa `paged.*` scripting surface, generated from the
 * engine's catalog (`.generated/scripting.json`). The whole reference is derived:
 * host functions, the id grammar, the settable property paths, and the runtime
 * constraints. Nothing is hand-listed.
 *
 *   <ScriptingCatalog />                 everything
 *   <ScriptingCatalog section="functions" | "grammar" | "paths" | "constraints" />
 */
import { getScripting } from '@/lib/generated';

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
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };

const KIND_TITLE: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  author: 'Author (structural)',
  history: 'History (undo/redo)',
  console: 'Console',
};

function Functions() {
  const { hostFunctionGroups, hostFunctionCount } = getScripting();
  if (!hostFunctionGroups.length) return <Empty />;
  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>{hostFunctionCount} host functions, grouped by kind.</p>
      {hostFunctionGroups.map((g) => (
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
                    <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>{fn.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Grammar() {
  const { idGrammar } = getScripting();
  if (!idGrammar.length) return <Empty />;
  return (
    <ul className="not-prose" style={{ margin: '1rem 0', padding: 0, listStyle: 'none' }}>
      {idGrammar.map((g) => (
        <li key={g.form} style={{ marginBottom: 8 }}>
          <code style={{ ...mono, fontWeight: 600 }}>{g.form}</code>{' '}
          <span style={{ color: 'var(--color-muted)', fontSize: 12.5 }}>
            e.g. <code style={mono}>{g.example}</code> — {g.note}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Paths() {
  const { settablePaths, settablePathCount } = getScripting();
  if (!settablePaths.length) return <Empty />;
  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .5rem' }}>
        {settablePathCount} settable property paths — the second argument to <code style={mono}>paged.set(id, path, value)</code>.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
        {settablePaths.map((p) => (
          <code key={p} style={{ ...mono, fontSize: 11.5, background: 'color-mix(in srgb, var(--color-rule) 14%, transparent)', borderRadius: 3, padding: '1px 6px' }}>
            {p}
          </code>
        ))}
      </div>
    </div>
  );
}

function Constraints() {
  const { constraints } = getScripting();
  if (!constraints.length) return <Empty />;
  return (
    <ul className="not-prose" style={{ margin: '1rem 0', paddingLeft: '1.1rem' }}>
      {constraints.map((c, i) => (
        <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, marginBottom: 6 }}>
          {c}
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
      No scripting catalog data. Run <code>pnpm generate:docs</code>.
    </p>
  );
}

export function ScriptingCatalog({ section }: { section?: 'functions' | 'grammar' | 'paths' | 'constraints' }) {
  if (section === 'functions') return <Functions />;
  if (section === 'grammar') return <Grammar />;
  if (section === 'paths') return <Paths />;
  if (section === 'constraints') return <Constraints />;
  return (
    <>
      <Functions />
      <Grammar />
      <Paths />
      <Constraints />
    </>
  );
}
