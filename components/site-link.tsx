/**
 * The link every component uses. It resolves site-neutral `/docs/idml/…` and
 * `/docs/paged/…` hrefs for this build (lib/site.ts): a root path on the owning
 * site, an absolute URL on the sibling one. Other hrefs pass straight through.
 */
import type { ComponentProps } from 'react';
import FumaLink from 'fumadocs-core/link';
import { resolveHref } from '@/lib/site';

export default function Link({ href, ...props }: ComponentProps<typeof FumaLink>) {
  return <FumaLink href={typeof href === 'string' ? resolveHref(href) : href} {...props} />;
}
