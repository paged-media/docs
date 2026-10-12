import { SITES, SITE_ID, type SiteId } from '@/lib/site';

const ORDER: SiteId[] = ['paged', 'idml'];

/**
 * The two-site switch in the masthead (ADR 805: one app, two sites): both
 * sites named side by side, the one you are on marked, the other one link
 * away. It replaces a lone "IDML Reference" link that read as just another
 * page of this site.
 */
export function SiteSwitcher() {
  return (
    <nav aria-label="Documentation sites" className="paged-site-switch">
      {ORDER.map((id) =>
        id === SITE_ID ? (
          <span key={id} aria-current="page" className="paged-site-switch-item is-current">
            {SITES[id].name}
          </span>
        ) : (
          <a key={id} href={`${SITES[id].origin}/`} className="paged-site-switch-item">
            {SITES[id].name}
          </a>
        ),
      )}
    </nav>
  );
}
