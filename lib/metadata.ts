import type { Metadata } from 'next';
import type { Status } from '@/lib/frontmatter';

/**
 * `noindex` is derived from `status` in exactly one place — here — and reused by
 * page metadata and the sitemap. Only finished (`published`) pages are indexed
 * (briefing §8). Flip a page to indexable by setting `status: published` in its
 * frontmatter; nothing else to remember.
 */
export function isIndexable(status: Status | undefined): boolean {
  return status === 'published';
}

/** Robots directive for a page given its lifecycle status. */
export function pageRobots(status: Status | undefined): Metadata['robots'] {
  return isIndexable(status) ? undefined : { index: false, follow: false };
}
