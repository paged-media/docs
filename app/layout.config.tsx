import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { SITE_ID } from '@/lib/site';

/** The edition's label, as the V5 sidebar names its handbook. */
const LABEL = { paged: 'The technical handbook', idml: 'The format atlas' } as const;

/**
 * Fumadocs' layout options. The shared masthead (components/masthead.tsx,
 * rendered by app/layout.tsx above every layout) carries the wordmark, the
 * sections, search and the theme switch, so the docs layout shows none of its
 * own: its title is the edition's label at the head of the sidebar and of the
 * phone bar that opens the sidebar drawer, linking to this site's front page.
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <span className="paged-sidebar-title">{LABEL[SITE_ID]}</span>,
  },
  searchToggle: { enabled: false },
  themeSwitch: { enabled: false },
};
