/**
 * <SdkCatalog /> — the @paged-media/viewer API surface (plus the underlying
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
import { SdkCatalogView, SdkTable } from './sdk-catalog-view';

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
      <div className="not-prose">
        <SdkTable members={g.members} anchors={false} />
      </div>
    );
  }

  // The whole catalog → the filterable client view.
  return <SdkCatalogView groups={cat.groups} />;
}
