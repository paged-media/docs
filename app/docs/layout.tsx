import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/app/layout.config';
import { SiteFooter } from '@/components/site-footer';
import { Pic } from '@/components/icons';

// The two top-level entries — the IDML format reference and the Paged platform —
// rendered as a sidebar root-toggle. Declared explicitly (rather than auto-derived
// from the `root: true` folders) so the labels, order, and brand glyphs are fixed
// regardless of meta.json ordering. The icon wrapper mirrors Fumadocs'
// defaultTransform so the glyph sits in a bordered chip on mobile.
const tabIcon = (name: string) => (
  <div className="size-full [&_svg]:size-full max-md:p-1.5 max-md:rounded-md max-md:border max-md:bg-fd-secondary">
    <Pic name={name} size={16} />
  </div>
);
const docsTabs = [
  {
    title: 'IDML Reference',
    description: 'The file format',
    url: '/docs/idml',
    icon: tabIcon('book'),
  },
  {
    title: 'Paged',
    description: 'The platform',
    url: '/docs/paged',
    icon: tabIcon('package'),
  },
];

// The SiteFooter is a SIBLING of DocsLayout, not a child: a child lands in
// DocsLayout's CSS grid and gets auto-placed in a top cell (which put the block
// at the top of the page), whereas a sibling after it stacks below the whole
// layout — the very bottom of the page, under the article and its prev/next nav.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <DocsLayout tree={source.pageTree} tabs={docsTabs} {...baseOptions}>
        {children}
      </DocsLayout>
      <SiteFooter />
    </>
  );
}
