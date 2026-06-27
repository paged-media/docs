/**
 * <PathReference /> — the full settable-path reference (the second argument to
 * `paged.set`), grouped by theme and enriched from the IDML schema: where a path
 * maps to a known IDML attribute we surface its type hint + one-line summary and
 * a link to the theme's runnable showcase. Server component; the filterable view
 * is the client island.
 */
import { getScripting, getIdmlSchema } from '@/lib/generated';
import { PATH_THEMES, themeForPath } from '@/data/scripting/themes';
import { PathReferenceView, type PathRow, type PathGroup } from './path-reference-view';

export function PathReference() {
  const { settablePaths, settablePathCount } = getScripting();
  if (!settablePaths.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No scripting catalog data. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }

  // Invert the IDML schema: settablePath → { typeHint, summary }.
  const info: Record<string, { typeHint: string; summary: string }> = {};
  for (const el of getIdmlSchema().elements) {
    for (const attr of el.attributes) {
      if (attr.settablePath && !info[attr.settablePath]) {
        info[attr.settablePath] = { typeHint: attr.typeHint, summary: attr.summary };
      }
    }
  }

  // Group paths by theme (catalog order preserved within a group).
  const byTheme = new Map<string, PathRow[]>();
  for (const path of settablePaths) {
    const t = themeForPath(path);
    const row: PathRow = { path, typeHint: info[path]?.typeHint, summary: info[path]?.summary };
    (byTheme.get(t.id) ?? byTheme.set(t.id, []).get(t.id)!).push(row);
  }

  const groups: PathGroup[] = PATH_THEMES.filter((t) => byTheme.get(t.id)?.length).map((t) => ({
    id: t.id,
    title: t.title,
    rows: byTheme.get(t.id)!,
  }));

  return <PathReferenceView groups={groups} count={settablePathCount} />;
}
