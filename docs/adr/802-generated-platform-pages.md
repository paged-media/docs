# ADR 802 — Platform pages are generated from pinned sources in other repos

- **Status:** Accepted. Recorded retroactively on 2026-10-02 from the code at `2094ba4`.
- **Scope:** `sources.pin`, `scripts/generate/`, `lib/generated.ts`, the components that read
  it, `scripts/check-feature-refs.mjs`, `scripts/check-freshness.mjs`, and the build and
  deploy workflows

## Context

Beside the format reference the site has pages about the Paged platform itself: the
capability matrix, the scripting catalog, the command-line reference, the plugin manifest
reference. What they state is decided in other repositories and changes when those change.

The first form kept such data by hand: a committed `badge-manifest.json`, a
`gaps-snapshot.json` and a script that checked them against the capability page. Commit
`842f11d` (2026-06-20) deleted all three and added the pipeline described here.
`sources.pin:2` gives the reason: the docs are generated from machine-readable sources "so
they never go stale by hand". The entry for the command-line tree says the same of one
page: a hand-written reference would be "a second statement of the tree" (`sources.pin:29`).

## Decision

Platform data is pulled at build time from files that other repositories already produce
and is not committed here; the one exception is a fallback seed for the viewer API catalog
(see Alternatives). Prose that describes a moving source can declare which one and when it
was last checked (`describes:` and `reviewed:` in its front matter); three pages do at this
commit.

- `sources.pin` lists seven sources by repository, git ref and file: the feature registry
  with its conformance data, the capability matrix, the engine's scripting catalog, the
  viewer API catalog, the command-line tree, the plugin manifest schema and the server's
  OpenAPI document. It also lists 17 repositories for a feed of recent commits.
- `pull-sources.mjs` is the first stage. It copies each file from a sibling checkout in the
  parent directory when one exists, and otherwise fetches it with `gh api` at the listed
  ref, into `.generated/sources/`. It records the resolved commit of every source in
  `.generated/sources.lock.json`.
- Ten `gen-*` stages read the pulled files and write projections into `.generated/`.
  `pnpm generate:docs` runs all eleven stages; `pnpm dev` and `pnpm build` run it first.
- `lib/generated.ts` loads the projections for server components and returns empty data
  when a file is missing. `<SupportBadge feature="…">` resolves its label this way.
- `check-feature-refs` fails when a `feature=` or `chapter=` in a page is not an id in the
  pulled registry. `check-freshness` fails when a page with `describes:` has no `reviewed:`
  date, or when a described feature changed after that date.
- The deploy workflow rebuilds on a push to `main`, nightly, and on a `source-updated`
  repository dispatch.

## Evidence

- `sources.pin:2`, `:5-58`, `:59-68` — the purpose, the seven sources, the activity list
- `scripts/generate/pull-sources.mjs:2-25`, `:101-126` — local or remote mode, lock entry
- `package.json:9-12` — the eleven-stage chain and the two scripts that run it
- `lib/generated.ts:1-20`, `components/mdx/support-badge.tsx:2-16` — loader, registry badge
- `scripts/check-feature-refs.mjs:2-13`, `scripts/check-freshness.mjs:2-22` — the two guards
- `.github/workflows/cloudflare-pages.yml:15-22` — push, nightly schedule, dispatch
- `.gitignore:13-15` — `.generated/` is never committed

## Alternatives considered

Hand-maintained data with a drift check was the earlier form and was removed in `842f11d`;
`scripts/check-feature-refs.mjs:3-6` calls itself its replacement. One hand-kept copy
remains: `scripts/generate/sdk-catalog.seed.json`, which `gen-sdk.mjs` uses only when the
pulled viewer catalog is absent.

## Consequences

`sources.pin` pins nothing at this commit: every `ref` is `main`. The commit that was used
is written only to the lock file, which is not committed, so two builds of the same commit
of this repository can differ. The JSON shapes of other repositories are inputs of a public
site: the build pulls them at the revisions in `sources.pin`
(`.github/workflows/build.yml:22-23`). A failed pull is a warning: no script or workflow
passes `--strict`, so the build continues with empty data. A workflow comment records one
page whose prerender crashed in that state (`.github/workflows/links.yml:29-32`).

Two sources, the registry and the capability matrix, are read from the `state` repository
at `main` (`sources.pin:5-13`, `:36-43`); the capability pages and the registry-linked
badges show whatever that branch holds when the site is built.

The two guards run only in `.github/workflows/build.yml:33-36`, not in the deploy workflow,
and `check-feature-refs` skips when no registry data was pulled. According to commit
`0617e7e`, `build.yml` could not be parsed from 2026-06-20 until that commit (2026-10-01).

## Related

- [ADR 019](https://github.com/paged-media/core/blob/main/docs/adr/019-capability-catalog-one-contract.md)
  (core) — the catalog the scripting pages are a projection of
- [ADR 303](https://github.com/paged-media/plugin-sdk/blob/main/docs/adr/303-manifest-schema.md)
  (plugin-sdk) — the manifest schema the plugin reference is generated from
- ADR 009, the stage matrix the capability pages render; ADR 032, a proposal for the
  published status feed; [ADR 804](804-static-export-hosting.md), the deploy
