import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/app/layout.config';
import { SiteFooter } from '@/components/site-footer';

// The SiteFooter is a SIBLING of DocsLayout, not a child: a child lands in
// DocsLayout's CSS grid and gets auto-placed in a top cell (which put the block
// at the top of the page), whereas a sibling after it stacks below the whole
// layout — the very bottom of the page, under the article and its prev/next nav.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <DocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </DocsLayout>
      <SiteFooter />
    </>
  );
}
