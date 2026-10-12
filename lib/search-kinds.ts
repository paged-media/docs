import type { SiteId } from '@/lib/site';

/**
 * What kind of page a URL is, for search: the index tags every page with it
 * (app/api/search/route.ts) so the dialog can filter by it, and the dialog
 * labels each hit with it (components/search-dialog.tsx). Root-relative URLs
 * on this site, as the search index stores them.
 */
export interface SearchKind {
  value: string;
  name: string;
}

const IDML: [RegExp, SearchKind][] = [
  [/^\/reference\/.+/, { value: 'element', name: 'Element' }],
  [/^\/cookbook(\/|$)/, { value: 'cookbook', name: 'Cookbook' }],
  [/^\/glossary(\/|$)/, { value: 'glossary', name: 'Glossary' }],
  [/^\/tools(\/|$)/, { value: 'tool', name: 'Tool' }],
];

const PAGED: [RegExp, SearchKind][] = [
  [/^\/(sdk|scripting|cli|plugin-sdk|api)(\/|$)/, { value: 'api', name: 'API' }],
  [/^\/plugins(\/|$)/, { value: 'plugin', name: 'Plugin' }],
  [/^\/engine(\/|$)/, { value: 'engine', name: 'Engine' }],
  [/^\/(state|testing|activity|repos)(\/|$)/, { value: 'state', name: 'Project' }],
];

const GUIDE: SearchKind = { value: 'guide', name: 'Guide' };

export function searchKind(site: SiteId, url: string): SearchKind {
  for (const [re, kind] of site === 'idml' ? IDML : PAGED) if (re.test(url)) return kind;
  return GUIDE;
}

/** The filters the dialog offers, in display order. */
export function searchKinds(site: SiteId): SearchKind[] {
  return [GUIDE, ...(site === 'idml' ? IDML : PAGED).map(([, kind]) => kind)];
}
