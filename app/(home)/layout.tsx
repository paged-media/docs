import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';

// The home pages carry the shared masthead and ribbon (app/layout.tsx) and no
// Fumadocs layout of their own: the page is the edition's front page.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
