'use client';

import { useMemo, useState } from 'react';
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
import { searchKind, searchKinds } from '@/lib/search-kinds';
import { SITE_ID } from '@/lib/site';

/**
 * The site search, tuned for a reference: results come one PAGE at a time —
 * the page, with its kind (Element, Cookbook, API, …), and its single best
 * matching passage clamped to two lines — so one long page cannot fill the
 * list. A page whose title IS the query (`TextFrame`, `text frame`) comes
 * first, so an element name lands on the element's page. The footer filters
 * by kind. Same static index and engine as Fumadocs' default dialog.
 */
type Result = Extract<SearchItemType, { type: 'page' | 'heading' | 'text' }>;

const KINDS = searchKinds(SITE_ID);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
/** Result text is Markdown with `<mark>` around the matched words. */
const unmark = (s: string) => s.replace(/<\/?mark>/g, '');

/** One group per page: the page item, then its best section or passage. */
function groupByPage(items: Result[], query: string): Result[] {
  const groups: Result[][] = [];
  for (const item of items) {
    if (item.type === 'page' || groups.length === 0) groups.push([item]);
    else if (groups[groups.length - 1].length < 2) groups[groups.length - 1].push(item);
  }
  const q = norm(query);
  const title = (g: Result[]) => (g[0].type === 'page' && typeof g[0].content === 'string' ? norm(unmark(g[0].content)) : '');
  const rank = (g: Result[]) => (q && title(g) === q ? 0 : q && title(g).startsWith(q) ? 1 : 2);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .flatMap(({ g }) => g);
}

function ResultItem({ item, onClick }: { item: SearchItemType; onClick: () => void }) {
  if (item.type === 'page') {
    const kind = searchKind(SITE_ID, item.url);
    // Every trail opens with the page tree's root (the site itself), which
    // says nothing inside the site.
    const crumbs = (item.breadcrumbs ?? []).slice(1);
    return (
      <SearchDialogListItem item={item} onClick={onClick} className="paged-search-page">
        <span className="paged-search-title">
          <span>{typeof item.content === 'string' ? unmark(item.content) : item.content}</span>
          <span className="paged-search-kind">{kind.name}</span>
        </span>
        {crumbs.length ? <span className="paged-search-crumbs">{crumbs.join(' › ')}</span> : null}
      </SearchDialogListItem>
    );
  }
  return <SearchDialogListItem item={item} onClick={onClick} className="paged-search-snippet" />;
}

export default function PagedSearchDialog(props: SharedProps) {
  const [tag, setTag] = useState<string | undefined>(undefined);
  const client = useMemo(() => staticClient({ tag }), [tag]);
  const { search, setSearch, query } = useDocsSearch({ client });

  const items = useMemo(() => {
    if (query.data === 'empty' || !query.data) return null;
    return groupByPage(query.data as Result[], search);
  }, [query.data, search]);

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={items}
          Item={ResultItem}
          Empty={() => (
            <p className="paged-search-empty">
              {query.isLoading ? 'Searching…' : `No ${tag ? `${KINDS.find((k) => k.value === tag)?.name.toLowerCase()} ` : ''}pages match.`}
            </p>
          )}
        />
        <SearchDialogFooter>
          <TagsList tag={tag} onTagChange={setTag} allowClear>
            {KINDS.map((k) => (
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
