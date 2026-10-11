import type { Metadata } from 'next';
import type { Status } from '@/lib/frontmatter';

/**
 * Whether a page is indexable by search engines — also the sitemap filter.
 *
 * Policy: ALL docs pages are indexed and listed in the sitemap, regardless of
 * `status`. (Previously only `status: published` pages were indexed; that gating
 * was dropped on request so nothing is excluded from search engines / robots.)
 * The WIP banner on stubs/drafts is purely visual; it no longer carries noindex.
 */
export function isIndexable(_status: Status | undefined): boolean {
  return true;
}

/** Robots directive for a page given its lifecycle status. */
export function pageRobots(status: Status | undefined): Metadata['robots'] {
  return isIndexable(status) ? undefined : { index: false, follow: false };
}

/**
 * The served path of a page. The export writes `dir/index.html` for every route
 * (trailingSlash), so `/styles` is served as `/styles/`; canonicals, sitemap
 * entries and structured data use this form so each page has one URL.
 */
export function canonicalPath(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

/** The site's social card (app/opengraph-image.tsx renders it at build time). */
export const OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
} as const;
