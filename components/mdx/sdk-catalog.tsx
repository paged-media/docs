/**
 * <SdkCatalog /> — the @paged-media/idml-viewer API surface (plus the underlying
 * ViewerSession and Inspector), generated into `.generated/sdk-catalog.json` by
 * gen-sdk.mjs. Every exported function, method, property, event, and type is
 * listed with its signature and a one-line summary; nothing is hand-listed here.
 *
 *   <SdkCatalog />                 the whole API, with a live filter box
 *   <SdkCatalog group="camera" />  one group (no filter box)
 *
 * The server component reads the catalog; the filterable table is the client
 * <SdkCatalogView>.
 */
import { getSdkCatalog } from '@/lib/generated';
import { SdkCatalogView } from './sdk-catalog-view';

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
const TD: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', verticalAlign: 'top' };
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12 };

export function SdkCatalog({ group }: { group?: string }) {
  const cat = getSdkCatalog();
  if (!cat.groups.length) {
    return (
      <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        No SDK catalog data. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }

  // One named group → a plain server-rendered table (used inline on topic pages).
  if (group) {
    const g = cat.groups.find((x) => x.key === group);
    if (!g) return null;
    return (
      <div className="not-prose" style={{ margin: '1rem 0', overflowX: 'auto' }}>
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
              <tr key={m.name}>
                <td style={{ ...TD, ...mono, whiteSpace: 'nowrap' }}>
                  <strong>{m.name}</strong>
                </td>
                <td style={{ ...TD, ...mono, color: 'var(--color-ink-soft, inherit)' }}>{m.signature}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-sans)', fontSize: 13 }}>{m.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // The whole catalog → the filterable client view.
  return <SdkCatalogView groups={cat.groups} />;
}
