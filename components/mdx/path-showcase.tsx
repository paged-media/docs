/**
 * <PathShowcase theme="fills" /> — a themed, runnable demo of a group of
 * settable paths. Renders the theme's paths as chips above a seeded
 * <ScriptingPlayground> that writes a few of them with a visible result.
 * Server component; the playground is the client island.
 */
import { getScripting } from '@/lib/generated';
import { themeById, themeForPath } from '@/data/scripting/themes';
import { ScriptingPlayground } from './scripting-playground';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5 };

export function PathShowcase({ theme }: { theme: string }) {
  const t = themeById(theme);
  if (!t) return null;

  const { settablePaths } = getScripting();
  const paths = settablePaths.filter((p) => themeForPath(p).id === t.id);
  const demo = new Set(t.demoPaths);
  const anchor = `theme-${t.id}`;

  return (
    <section id={anchor} className="not-prose" style={{ margin: '1.75rem 0', scrollMarginTop: '5rem' }}>
      <h3 style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 18, margin: '0 0 4px' }}>
        {t.title}{' '}
        <a href={`#${anchor}`} style={{ textDecoration: 'none', color: 'var(--color-muted)', fontSize: 14 }} aria-label={`Link to ${t.title}`}>
          #
        </a>
      </h3>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--color-ink-soft, var(--color-muted))', margin: '0 0 8px' }}>
        {t.summary} <span style={{ color: 'var(--color-muted)' }}>· {paths.length} paths</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginBottom: 4 }}>
        {paths.map((p) => (
          <code
            key={p}
            title={demo.has(p) ? 'demonstrated below' : undefined}
            style={{
              ...mono,
              background: demo.has(p)
                ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)'
                : 'color-mix(in srgb, var(--color-rule) 14%, transparent)',
              color: demo.has(p) ? 'var(--color-accent)' : 'inherit',
              borderRadius: 3,
              padding: '1px 6px',
              fontWeight: demo.has(p) ? 640 : 400,
            }}
          >
            {p}
          </code>
        ))}
      </div>
      <ScriptingPlayground script={t.script} seed={t.seed} lookFor={t.lookFor} />
    </section>
  );
}
