/**
 * <FunctionPlayground fn="paged.set" /> — an editable, working showcase for one
 * paged.* host function. Renders the function's signature card (from the
 * generated engine catalog, so it never drifts) above a seeded
 * <ScriptingPlayground> whose snippet demonstrates the function against a
 * starter document. Server component; the playground itself is the client island.
 *
 *   <FunctionPlayground fn="paged.set" />              first example for the fn
 *   <FunctionPlayground fn="paged.set" example="…" />  a specific example by id
 */
import { getScripting, type HostFn } from '@/lib/generated';
import { examplesForFn, exampleById, type ScriptingExample } from '@/data/scripting/examples';
import { ScriptingPlayground } from './scripting-playground';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };

const KIND_LABEL: Record<string, string> = {
  read: 'read',
  write: 'write',
  author: 'author',
  history: 'history',
  console: 'console',
};

function findHostFn(name: string): HostFn | undefined {
  const { hostFunctionGroups } = getScripting();
  for (const g of hostFunctionGroups) {
    const hit = g.functions.find((f) => f.name === name);
    if (hit) return hit;
  }
  return undefined;
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 10.5,
        fontWeight: 640,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--color-accent)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
        borderRadius: 3,
        padding: '1px 6px',
      }}
    >
      {KIND_LABEL[kind] ?? kind}
    </span>
  );
}

export function FunctionPlayground({ fn, example }: { fn: string; example?: string }) {
  const host = findHostFn(fn);
  const ex: ScriptingExample | undefined = example ? exampleById(example) : examplesForFn(fn)[0];

  const anchor = `fn-${fn.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  return (
    <section id={anchor} className="not-prose" style={{ margin: '1.5rem 0', scrollMarginTop: '5rem' }}>
      {/* Signature card */}
      <div
        style={{
          border: '1px solid var(--color-rule)',
          borderBottom: 0,
          borderRadius: '6px 6px 0 0',
          padding: '10px 12px',
          background: 'color-mix(in srgb, var(--color-rule) 8%, transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ ...mono, fontSize: 14, fontWeight: 680 }}>
            {fn}
            <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>{host?.params ?? '(…)'}</span>
          </code>
          {host ? <KindChip kind={host.kind} /> : null}
          {host?.returns ? (
            <code style={{ ...mono, color: 'var(--color-muted)' }}>→ {host.returns}</code>
          ) : null}
          <a
            href={`#${anchor}`}
            style={{ marginLeft: 'auto', textDecoration: 'none', color: 'var(--color-muted)', fontSize: 13 }}
            aria-label={`Link to ${fn}`}
          >
            #
          </a>
        </div>
        {host?.summary ? (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-ink-soft, var(--color-muted))', margin: '6px 0 0' }}>
            {host.summary}
          </p>
        ) : null}
      </div>

      {/* Seeded, editable playground */}
      {ex ? (
        <div style={{ border: '1px solid var(--color-rule)', borderTop: 0, borderRadius: '0 0 6px 6px', padding: '10px 12px 2px' }}>
          {ex.summary ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, margin: '2px 0 0' }}>{ex.summary}</p>
          ) : null}
          <ScriptingPlayground script={ex.script} seed={ex.seed} lookFor={ex.lookFor} title={ex.title} />
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--color-rule)',
            borderTop: 0,
            borderRadius: '0 0 6px 6px',
            padding: '12px',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--color-muted)',
          }}
        >
          No runnable example authored for <code style={mono}>{fn}</code> yet.
        </div>
      )}
    </section>
  );
}
