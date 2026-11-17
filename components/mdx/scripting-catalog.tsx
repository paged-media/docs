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
import { SCRIPTING_EXAMPLES } from '@/data/scripting/examples';
import { ScriptingFnsView, ScriptingPathsView } from './scripting-catalog-view';
import { withCode } from './inline-code';
import s from './scripting-catalog.module.css';

function Functions() {
  const { hostFunctionGroups, hostFunctionCount } = getScripting();
  if (!hostFunctionGroups.length) return <Empty />;
  // Which functions have a runnable example → a "Try it" deep-link into the
  // examples gallery (where the editor boots lazily, one at a time).
  const exampleFns = Array.from(new Set(SCRIPTING_EXAMPLES.map((e) => e.fn)));
  return <ScriptingFnsView groups={hostFunctionGroups} count={hostFunctionCount} exampleFns={exampleFns} />;
}

/** The id grammar: one row per address form, as a ledger. */
function Grammar() {
  const { idGrammar } = getScripting();
  if (!idGrammar.length) return <Empty />;
  return (
    <div className={`not-prose ${s.catalog}`}>
      <table className={s.table}>
        <colgroup>
          <col className={s.colForm} />
          <col className={s.colExample} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Form</th>
            <th scope="col">Example</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {idGrammar.map((g) => (
            <tr key={g.form}>
              <td className={s.lead} data-label="Form">
                <code className={s.form}>{g.form}</code>
              </td>
              <td data-label="Example">
                <code className={s.example}>{g.example}</code>
              </td>
              <td data-label="Meaning" className={s.note}>
                {withCode(g.note)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <ol className={`not-prose ${s.rules}`}>
      {constraints.map((c, i) => (
        <li key={i}>
          <span>{withCode(c)}</span>
        </li>
      ))}
    </ol>
  );
}

function Empty() {
  return (
    <p className={`not-prose ${s.empty}`}>
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
