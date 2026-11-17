import { SITE_ID, SITES, type SiteId } from '@/lib/site';

/**
 * The masthead and footer that paged.media, docs.paged.media and
 * idml.paged.media share (docs/adr/810-next-edition-chrome.md).
 *
 * This list MIRRORS the website's information architecture,
 * paged-media/website apps/site/src/editorial/nav.ts: the same labels, the
 * same order, the same addresses. Change both together. The browser tests pin
 * it (tests/browsers/common.ts `masthead`).
 *
 * Addresses are absolute, as they are on the website. `localHref` turns an
 * address on this site's own origin into a root path, so a link to this site
 * stays on it (and on a preview deployment).
 */
export interface ChromeLink {
  label: string;
  href: string;
  /** The documentation site this link is the home of; marked current there. */
  site?: SiteId;
}

/** The wordmark goes to the front page of paged.media. */
export const HOME_HREF = 'https://paged.media/';

/** The line beside the wordmark. */
export const TAGLINE = 'The open publishing system';

/** The primary navigation, in order. */
export const MASTHEAD_NAV: ChromeLink[] = [
  { label: 'Product', href: 'https://paged.media/product/' },
  { label: 'Solutions', href: 'https://paged.media/designers/' },
  { label: 'Editions', href: 'https://paged.media/editions/' },
  { label: 'Docs', href: 'https://docs.paged.media/', site: 'paged' },
  { label: 'IDML Reference', href: 'https://idml.paged.media/', site: 'idml' },
];

/** The tools beside it; then search, the theme switch and the one action. */
export const MASTHEAD_TOOLS: ChromeLink[] = [
  { label: 'Library', href: 'https://paged.media/library/' },
  { label: 'Studio', href: 'https://paged.media/studio/' },
  { label: 'Site atlas', href: 'https://paged.media/site-atlas/' },
];

/** The masthead's one red action: the real editor. */
export const MASTHEAD_ACTION: ChromeLink = { label: 'Open editor', href: 'https://play.paged.media/' };

/** The footer's line under the wordmark. */
export const FOOTER_STRAP = 'The page belongs to everyone. The future belongs to the makers.';

/** The footer's three columns. */
export const FOOTER_COLUMNS: { title: string; links: ChromeLink[] }[] = [
  {
    title: 'Discover',
    links: [
      { label: 'Product', href: 'https://paged.media/product/' },
      { label: 'Library', href: 'https://paged.media/library/' },
      { label: 'Editions', href: 'https://paged.media/editions/' },
      { label: 'Journal', href: 'https://paged.media/journal/' },
      { label: 'Site atlas', href: 'https://paged.media/site-atlas/' },
    ],
  },
  {
    title: 'Make',
    links: [
      { label: 'Open the editor', href: 'https://play.paged.media/' },
      { label: 'The studio', href: 'https://paged.media/studio/' },
      { label: 'Developers', href: 'https://paged.media/developers/' },
      { label: 'Documentation', href: 'https://docs.paged.media/', site: 'paged' },
      { label: 'Source on GitHub', href: 'https://github.com/paged-media/paged' },
    ],
  },
  {
    title: 'Understand',
    links: [
      { label: 'The Anatomy of a Page', href: 'https://paged.media/anatomy/' },
      { label: 'Technology', href: 'https://paged.media/technology/' },
      { label: 'Open source', href: 'https://paged.media/open-source/' },
      { label: 'IDML reference', href: 'https://idml.paged.media/', site: 'idml' },
      { label: 'Capability record', href: 'https://docs.paged.media/state/' },
      { label: 'Repository activity', href: 'https://docs.paged.media/activity/' },
    ],
  },
];

/** An address on this site's own origin as a root path; any other unchanged. */
export function localHref(href: string): string {
  const own = SITES[SITE_ID].origin;
  return href === own || href.startsWith(`${own}/`) ? href.slice(own.length) || '/' : href;
}

/** Whether a link is the home of the site this build serves. */
export function isCurrentSite(link: ChromeLink): boolean {
  return link.site === SITE_ID;
}
