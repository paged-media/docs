import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/app/layout.config';

// NOTE: the SiteFooter is rendered at the END of each page's content (see
// app/docs/[[...slug]]/page.tsx), NOT here. DocsLayout lays its children out in
// a CSS grid, so a trailing child lands in a top grid cell instead of below the
// article — which put the whole footer block at the top of the page.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
