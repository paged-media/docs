'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SortedResult } from 'fumadocs-core/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
  type SearchItemType,
} from 'fumadocs-ui/components/dialog/search';
import { searchKind, searchKinds, type SearchKind } from '@/lib/search-kinds';
import { resolveHref, SITE_ID, SITES, type SiteId } from '@/lib/site';

/**
 * The site search, tuned for a reference: results come one PAGE at a time —
 * the page, with its kind (Element, Cookbook, API, …), and its single best
 * matching passage clamped to two lines — so one long page cannot fill the
 * list. A page whose title IS the query (`TextFrame`, `text frame`) comes
 * first, so an element name lands on the element's page. The footer filters
 * by kind. Same static index and engine as Fumadocs' default dialog.
 *
 * The look is V5's search overlay (docs/adr/810-next-edition-chrome.md): a
 * dark backdrop with a blur, a paper dialog on a 1px ink border, the query in
 * the serif at display size, each page's kind in red mono beside its serif
 * title. Styles: app/global.css (SEARCH) and app/editorial.css (scope).
 *
 * Scope (docs/adr/808-cross-site-search.md): "This site" searches this site's
 * index; "Both sites" also loads the other site's static index from its own
 * origin (served with CORS, public/_headers). The other site's results carry
 * its name and link to it absolutely (resolveHref). Its index loads once, when
 * the reader first asks for both; until it has loaded — or if it cannot be
 * reached — this site's results show on their own and the dialog says why.
 */
/** A result as the index returns it (Markdown text with `<mark>`s). */
type Result = SortedResult;
/** A result with the site it came from and its kind (from the site's own root path). */
type SitedResult = Result & { site: SiteId; kind: SearchKind };
type Scope = 'site' | 'both';
type PeerState = 'idle' | 'loading' | 'ready' | 'failed';

const PEER: SiteId = SITE_ID === 'idml' ? 'paged' : 'idml';
/** The other site's static index (app/api/search/route.ts, built on that site). */
const PEER_INDEX = `${SITES[PEER].origin}/api/search`;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
/** Result text is Markdown with `<mark>` around the matched words. */
const unmark = (s: string) => s.replace(/<\/?mark>/g, '');

/** This site's kinds, then the other site's that this one lacks. */
function kindsFor(scope: Scope): SearchKind[] {
  const mine = searchKinds(SITE_ID);
  if (scope === 'site') return mine;
  const seen = new Set(mine.map((k) => k.value));
  return [...mine, ...searchKinds(PEER).filter((k) => !seen.has(k.value))];
}

function sited(items: Result[], site: SiteId): SitedResult[] {
  return items.map((item) => {
    const kind = searchKind(site, item.url.split('#')[0]);
    if (site === SITE_ID) return { ...item, site, kind };
    // The index stores root paths on its own site; written site-neutral, they
    // resolve to an absolute URL there (lib/site.ts).
    return { ...item, id: `${site}:${item.id}`, url: resolveHref(`/docs/${site}${item.url}`), site, kind };
  });
}

/** One group per page: the page item, then its best section or passage. */
function groupByPage(items: SitedResult[], query: string): SitedResult[] {
  const groups: SitedResult[][] = [];
  for (const item of items) {
    if (item.type === 'page' || groups.length === 0) groups.push([item]);
    else if (groups[groups.length - 1].length < 2) groups[groups.length - 1].push(item);
  }
  const q = norm(query);
  const title = (g: SitedResult[]) => (g[0].type === 'page' && typeof g[0].content === 'string' ? norm(unmark(g[0].content)) : '');
  const rank = (g: SitedResult[]) => (q && title(g) === q ? 0 : q && title(g).startsWith(q) ? 1 : 2);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .flatMap(({ g }) => g);
}

function ResultItem({ item, onClick, both }: { item: SitedResult; onClick: () => void; both: boolean }) {
  if (item.type === 'page') {
    // Every trail opens with the page tree's root (the site itself), which
    // says nothing inside the site — but names it when both sites are listed.
    const crumbs = (item.breadcrumbs ?? []).slice(1);
    const peer = item.site !== SITE_ID;
    return (
      <SearchDialogListItem item={item as SearchItemType} onClick={onClick} className="paged-search-page" data-peer={peer ? '' : undefined}>
        <span className="paged-search-title">
          <span>{typeof item.content === 'string' ? unmark(item.content) : item.content}</span>
          <span className="paged-search-kind">{item.kind.name}</span>
        </span>
        {both || crumbs.length ? (
          <span className="paged-search-crumbs">
            {both ? <span className="paged-search-site">{SITES[item.site].name}</span> : null}
            {both && crumbs.length ? ' › ' : null}
            {crumbs.join(' › ')}
          </span>
        ) : null}
      </SearchDialogListItem>
    );
  }
  return <SearchDialogListItem item={item as SearchItemType} onClick={onClick} className="paged-search-snippet" />;
}

/** Keys the result list and Fumadocs' dialog would otherwise take from a focused radio. */
const KEEP_KEYS = new Set(['Enter', 'ArrowUp', 'ArrowDown']);

function ScopeControl({ scope, onScope, peer }: { scope: Scope; onScope: (s: Scope) => void; peer: PeerState }) {
  const other = SITES[PEER].name;
  const status =
    scope !== 'both'
      ? null
      : peer === 'loading'
        ? `Loading the ${other} index…`
        : peer === 'failed'
          ? `The ${other} index could not be reached; showing ${SITES[SITE_ID].name} only.`
          : null;
  return (
    <div className="paged-search-scope">
      <fieldset onKeyDown={(e) => KEEP_KEYS.has(e.key) && e.stopPropagation()}>
        <legend>Search in</legend>
        {(
          [
            ['site', 'This site'],
            ['both', 'Both sites'],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="paged-search-scope"
              value={value}
              checked={scope === value}
              onChange={() => onScope(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <span className="paged-search-scope-status" role="status" data-state={scope === 'both' ? peer : undefined}>
        {status}
      </span>
    </div>
  );
}

export default function PagedSearchDialog(props: SharedProps) {
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<Scope>('site');
  const [peer, setPeer] = useState<PeerState>('idle');

  // Load the other site's index the first time both sites are asked for.
  useEffect(() => {
    if (scope !== 'both' || peer !== 'idle') return;
    setPeer('loading');
    Promise.resolve(staticClient({ from: PEER_INDEX }).search('paged')).then(
        () => setPeer('ready'),
        () => setPeer('failed'),
      );
  }, [scope, peer]);

  const both = scope === 'both';
  const client = useMemo(() => {
    const local = staticClient({ tag });
    const remote = staticClient({ from: PEER_INDEX, tag });
    const withPeer = both && peer === 'ready';
    return {
      deps: [tag, withPeer],
      async search(query: string) {
        const [mine, theirs] = await Promise.all([
          local.search(query),
          withPeer ? Promise.resolve(remote.search(query)).catch((): Result[] => []) : [],
        ]);
        return [...sited(mine, SITE_ID), ...sited(theirs, PEER)];
      },
    };
  }, [tag, both, peer]);
  const { search, setSearch, query } = useDocsSearch({ client });

  const items = useMemo(() => {
    if (query.data === 'empty' || !query.data) return null;
    return groupByPage(query.data as SitedResult[], search) as unknown as SearchItemType[];
  }, [query.data, search]);

  const kinds = kindsFor(scope);
  const onScope = (next: Scope) => {
    setScope(next);
    // A kind the narrower scope does not offer would filter everything out.
    if (next === 'site' && tag && !searchKinds(SITE_ID).some((k) => k.value === tag)) setTag(undefined);
  };

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay className="paged-search-overlay" />
      <SearchDialogContent className="paged-search-dialog">
        <SearchDialogHeader className="paged-search-header">
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <ScopeControl scope={scope} onScope={onScope} peer={peer} />
        <SearchDialogList
          items={items}
          Item={({ item, onClick }) => <ResultItem item={item as unknown as SitedResult} onClick={onClick} both={both} />}
          Empty={() => (
            <p className="paged-search-empty">
              {query.isLoading
                ? 'Searching…'
                : `No ${tag ? `${kinds.find((k) => k.value === tag)?.name.toLowerCase()} ` : ''}pages match${both && peer === 'ready' ? ' on either site' : ''}.`}
            </p>
          )}
        />
        <SearchDialogFooter className="paged-search-footer">
          <TagsList tag={tag} onTagChange={setTag} allowClear className="paged-search-tags">
            {kinds.map((k) => (
              <TagsListItem key={k.value} value={k.value}>
                {k.name}
              </TagsListItem>
            ))}
          </TagsList>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
