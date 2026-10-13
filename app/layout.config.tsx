import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SiteSwitcher } from '@/components/site-switcher';
import { Wordmark } from '@/components/wordmark';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Wordmark />,
  },
  links: [
    // Both sites, the current one marked (components/site-switcher.tsx).
    { type: 'custom', children: <SiteSwitcher /> },
  ],
  // A plain link to the organisation: no star or fork counts in the masthead.
  githubUrl: 'https://github.com/paged-media',
  // Light, dark, or the reader's system setting (the default, app/layout.tsx).
  themeSwitch: { mode: 'light-dark-system' },
  // Search: components/search-dialog.tsx over the static index from app/api/search/route.ts.
};
