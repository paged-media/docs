# ADR 808 — Search reaches both sites

- **Status:** Accepted, 2026-11-16.
- **Scope:** `components/search-dialog.tsx`, `app/api/search/route.ts`, `public/_headers`,
  `lib/site.ts` (`resolveHref`), `app/editorial.css`, `tests/browsers/*.spec.ts`.

## Context

[ADR 805](805-two-sites-one-app.md) split the docs into two sites, and each build emits its own
static search index. A reader on docs.paged.media who searches for `TextFrame` finds nothing,
although idml.paged.media has a page for it; a reader of the IDML reference cannot find Paged's
CLI from there. Each site links to the other, but search, the fastest way through either, stops
at the site's edge. The sites are static exports on Cloudflare Pages ([ADR 804](804-static-export-hosting.md)):
there is no server to run one query against both indexes.

## Decision

1. **Each site keeps its own index, built as before** (`app/api/search/route.ts`, the static
   Orama export at `/api/search`). Nothing about indexing changes, so each site's own search
   behaves exactly as it did.
2. **Each origin serves its index to the other.** `public/_headers` sends
   `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin` on
   `/api/search`. The index is public and read without credentials, so a wildcard gives away
   nothing the page does not already show; it also works on the `*.pages.dev` previews. The
   pages stay cross-origin isolated (COEP `credentialless`): a CORS read with that header is
   allowed under it.
3. **The dialog has a scope: "This site" (the default) or "Both sites".** Two native radios in
   a fieldset, so they take Tab, the arrow keys and Space like any radio group; the dialog's
   own Enter and Up/Down handling (the result list) is kept off them.
4. **The other index loads on demand, once.** The first time a reader picks "Both sites", the
   dialog fetches the other site's `/api/search` from its production origin (`SITES` in
   `lib/site.ts`). Until it has loaded, this site's results show alone and a status line says
   the other index is loading. If it cannot be reached (offline, blocked, an old deploy
   without the header), the status line says so and this site's results stay; nothing else
   fails.
5. **Results say where they are.** With both sites in scope, every page row names its site in
   its trail ("IDML Reference › Stories › …"), the other site's in the link colour. The other
   index stores root paths on its own site; the dialog writes them site-neutral
   (`/docs/<site>/…`) and resolves them with `resolveHref`, so they become absolute URLs on the
   other origin, the same rule every cross-site link follows. Ranking is unchanged: an exact
   title match from either site comes first, then this site's pages, then the other's.
6. **Kind filters cover both.** With both sites in scope the footer offers this site's kinds
   and then the other site's (Element, Cookbook, …); a filter applies to both indexes.

## Alternatives considered

- **One merged index built into both sites.** Each build would need the other site's content
  and would carry both indexes on every first search. Rejected: twice the build and twice the
  download for the common case, which stays on one site.
- **A hosted search service.** It would rank the two sites together, but needs a server or a
  third party and an API key on a static site. Rejected for now, as in ADR 804.
- **Open the other site's search in a new tab.** It loses the query and the keyboard flow.

## Consequences

- A local build ("This site") is unchanged. "Both sites" in a local build fetches the
  production index of the other site, and its results link to production.
- The browser tests stand in for the other origin with `page.route`: one test serves an index
  there and checks the labels and absolute links; one aborts the request and checks that the
  dialog keeps this site's results and says why.
- The production sites answer cross-site queries once both have deployed with the new
  `_headers`; until then "Both sites" reports the other index as unreachable.
