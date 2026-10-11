# ADR 805 — Two sites from one app: idml.paged.media and docs.paged.media

- **Status:** Accepted, 2026-10-11.
- **Scope:** `lib/site.ts`, `lib/source.ts`, `source.config.ts`, `app/(docs)/`,
  `app/(home)/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.png/`,
  `components/site-link.tsx`, `scripts/write-redirects.mjs`, `public/_headers`,
  `.github/workflows/{cloudflare-pages,build,links}.yml`

## Context

Until now one site at docs.paged.media held two pillars: the IDML format reference under
`/docs/idml/` and the Paged platform under `/docs/paged/`. They answer different readers. A
person reading about the IDML format may never use Paged, and a format reference reads as
more trustworthy when it is not a section of a product's documentation. Search engines
also rank a site on one topic more clearly than a site with two.

## Decision

The IDML reference moves to its own domain, **idml.paged.media**. **docs.paged.media**
keeps the Paged documentation. Both stay in this repository as one Next app that is built
twice.

- `SITE=idml` or `SITE=paged` (default `paged`) selects the site. `lib/site.ts` holds each
  site's origin, name, home title and description.
- `source.config.ts` defines one collection per site (`content/docs/idml`,
  `content/docs/paged`). `lib/source.ts` loads the one for this build with `baseUrl: '/'`,
  so pages sit at the site root: `idml.paged.media/<chapter>/<page>/`. The landing page
  stays `app/(home)`; docs pages use a required catch-all `app/(docs)/[...slug]`, so the
  two never collide. Each tree's former `index.mdx` is now `overview.mdx`.
- Content keeps writing **site-neutral links**, `/docs/idml/…` and `/docs/paged/…`.
  `resolveHref` turns them into a root path on the owning site or an absolute URL on the
  other one, always with the trailing slash the export serves. Markdown links (the MDX `a`
  component), `components/site-link.tsx` and the components that build hrefs all go
  through it. A chapter can therefore move between sites without its prose changing.
- The engine chapters (`the-renderer`, `parser-internals`, `test-corpus`) describe Paged's
  implementation, not the format. They move to docs.paged.media under `/engine/`.
- Each build emits its own sitemap, robots, canonical URLs, Open Graph card, search index,
  `llms.txt` and JSON-LD (`WebSite` + `Organization` on the home page, `TechArticle` +
  `BreadcrumbList` + `FAQPage` on articles), all on its own origin.
- `scripts/write-redirects.mjs` writes `public/_redirects` per site from the content tree.
  Every former URL — the pre-June single tree and the two-pillar tree — reaches its final
  URL in one 301.
- `public/_headers` marks the `*.pages.dev` hosts `noindex`, so only the custom domains
  rank.
- The deploy workflow builds a matrix: `idml` → Cloudflare Pages project `paged-idml`,
  `paged` → `paged-docs`. The build and link gates run against both sites.

## Alternatives considered

- **A second repository for the IDML site.** It would duplicate the example pipeline, the
  clean-room gate, the live preview and every MDX component. Rejected.
- **A pnpm workspace with two apps.** This gives cleaner separation, but it means
  restructuring the repository first while gaining nothing the `SITE` switch does not
  already provide. Kept as the next step if the two sites' layouts diverge.
- **Keeping `/docs/` in the new URLs.** Rejected: on a single-topic domain the prefix
  carries no information.

## Consequences

Every URL changed. The redirects carry the old ones, and they have to stay. `pnpm dev`
and `pnpm build` produce the Paged site unless `SITE=idml` is set (`pnpm dev:idml`,
`pnpm build:idml`). Two Cloudflare Pages projects and two custom domains must exist.
Cross-site links are absolute, so a local build links to production for the other site.
