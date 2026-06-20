/**
 * <RestApiReference /> — the editor-server REST surface, generated from the
 * server's OpenAPI spec (`.generated/rest-api.json`, itself generated from the
 * server's Zod contracts). Endpoints grouped by tag.
 *
 *   <RestApiReference />            all groups
 *   <RestApiReference tag="files" />   one tag
 */
import { getRestApi } from '@/lib/generated';

const METHOD_COLOR: Record<string, string> = {
  GET: 'var(--valid)',
  POST: 'color-mix(in srgb, var(--valid) 60%, var(--color-muted))',
  PUT: 'var(--warn)',
  PATCH: 'var(--warn)',
  DELETE: 'var(--warn)',
};
const TD: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', verticalAlign: 'top' };
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };

export function RestApiReference({ tag }: { tag?: string }) {
  const { groups, info, endpointCount, sourceCommit } = getRestApi();
  const shown = tag ? groups.filter((g) => g.tag === tag) : groups;
  if (!shown.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No API data{tag ? ` for tag “${tag}”` : ''}. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <p style={{ fontSize: 11.5, color: 'var(--color-muted)', margin: '0 0 .75rem' }}>
        {info.title ?? 'API'} {info.version ? `v${info.version}` : ''} · OpenAPI {info.openapi ?? ''} · {endpointCount} endpoints
        {sourceCommit ? ` · @ ${sourceCommit.slice(0, 8)}` : ''}
      </p>
      {shown.map((g) => (
        <div key={g.tag} style={{ margin: '0 0 1.25rem' }}>
          <h3 id={`api-${g.tag}`} style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 15, margin: '0 0 1px', textTransform: 'capitalize' }}>
            {g.tag}
          </h3>
          {g.description ? <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: '0 0 .25rem' }}>{g.description}</p> : null}
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <tbody>
              {g.endpoints.map((e) => (
                <tr key={`${e.method} ${e.path}`}>
                  <td style={{ ...TD, width: 70 }}>
                    <span style={{ ...mono, fontWeight: 700, fontSize: 11, color: METHOD_COLOR[e.method] ?? 'var(--color-muted)' }}>{e.method}</span>
                  </td>
                  <td style={{ ...TD, ...mono, whiteSpace: 'nowrap', textDecoration: e.deprecated ? 'line-through' : 'none' }}>{e.path}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-sans)', color: 'var(--color-muted)' }}>{e.summary ?? e.operationId ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
