import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * The ONE attribution line — the only vendor-related boilerplate anywhere on the
 * site (briefing §6.1). Vendor names appear descriptively only, never in titles
 * or branding.
 */
export const ATTRIBUTION =
  'IDML is a published file format owned by its vendor. This documentation is an ' +
  'independent description by the Paged project and is not affiliated with or ' +
  'endorsed by the vendor.';

/**
 * The ONE prominent differentiation from the CSS-based Paged.js project
 * (briefing §6.1 / §10). We arrive as a sibling in the paged-media family and
 * never imply a fork or affiliation.
 */
export const DIFFERENTIATION =
  'Paged is a native renderer for paged media, starting with IDML — a separate ' +
  'project from the CSS-based Paged.js polyfill.';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Paged · IDML Reference',
  },
  // Search uses the Fumadocs default (Orama) wired in app/api/search/route.ts.
};
