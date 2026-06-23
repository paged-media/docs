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
import { ScriptingFnsView, ScriptingPathsView } from './scripting-catalog-view';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };

function Functions() {
  const { hostFunctionGroups, hostFunctionCount } = getScripting();
  if (!hostFunctionGroups.length) return <Empty />;
  return <ScriptingFnsView groups={hostFunctionGroups} count={hostFunctionCount} />;
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
  return <ScriptingPathsView paths={settablePaths} count={settablePathCount} />;
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
