# Architecture

How the documentation site docs.paged.media is built. It describes what the code does at
commit `2094ba4`. The reason behind each choice is in an ADR under [`adr/`](adr/README.md),
linked where it applies. This folder documents the repository; the site's own pages are in
`content/docs/`.

## Layout

The repository is one Next.js application at its root: the package `paged-docs`, private,
managed with pnpm 9, not a workspace. It uses Next 16 (App Router), Fumadocs
(`fumadocs-ui` 16, `fumadocs-mdx` 15), React 19, Tailwind 4 and TypeScript. There is no Rust
here; two CI workflows check out the engine repository to build tools from it.

| Path | What it holds |
|---|---|
| `content/docs/` | The site's pages: 171 MDX files. `idml/` is the format reference (111 pages in 27 sections and `meta`), `paged/` is the platform part (59 pages), plus the root index. |
| `app/` | The App Router shell: the home page, `docs/[[...slug]]`, and static routes for the search index, `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt`. |
| `components/mdx/` | The components a page may use, registered in `components/mdx/index.tsx`. `components/diagrams/` holds the figures. |
| `lib/` | The content loader, the front matter schema, the example reader, the loader for generated data, metadata and structured data. |
| `examples/` | 24 example packages, each an unzipped IDML package with a manifest, and `_schema/`. |
| `data/` | `scripting/`: 117 script examples with their starter documents. `comparison.json`: an editorial comparison table. |
| `scripts/` | `examples/` (assembler and gate), `scripting/` (script gate), `generate/` (the source pull and ten projections), and single-file scripts. |
| `cleanroom/` | The similarity check: normalizer, checker, vocabulary. |
| `demos/` | Three recorded editor sessions. |
| `public/` | `_headers`, `_redirects`, brand assets. `public/preview/` and `public/demos/` are filled at build time and are not committed. |
| `core.pin`, `sources.pin` | The engine commit the gates build from; the list of cross-repository sources. |
| `.github/workflows/` | Six workflows, described under "Build, checks and deploy". |

Dependencies run one way: a page uses components, a component uses `lib/` or `data/`, and
`lib/` reads files (`examples/`, `.generated/`, `data/`). The scripts are separate programs
run with `tsx` or `node`. One file crosses over: `lib/assemble-example.ts` imports the
assembler from `scripts/examples/assemble.ts`, so the site and the gate share it.

## What goes into a build

```
content/docs/**/*.mdx ── fumadocs-mdx ──────────────> .source/ ───────────┐
examples/<id>/ ── lib/examples.ts, assembleIdml ─────────────────────────┤
sources.pin ── pull-sources ──> .generated/sources/ ── gen-* ──> .generated/*.json
                                                  └─ lib/generated.ts ────┤
@paged-media/idml-viewer (npm) ── prepare-preview-wasm ──> public/preview/ ┤
demos/, editor release assets ── pull-sources ──> public/demos/ ──────────┤
                                                                          v
                                      next build (output: 'export') ──> out/
                                      wrangler pages deploy out ──────> host
```

`pnpm build` is `pnpm generate:docs && pnpm prepare:preview && next build`. The result is
the static directory `out/`. Nothing runs on a server afterwards
([ADR 804](adr/804-static-export-hosting.md)).

## From MDX to a page

1. `source.config.ts` defines one collection: the directory `content/docs`, validated with
   the schema `docsFrontmatter`. `fumadocs-mdx` generates `.source/` from it, at install
   time and through the Next plugin. Two rehype transforms in the same file restyle "In
   short:" paragraphs and lists of links.
2. `lib/source.ts` wraps the collection in the Fumadocs loader with the base URL `/docs`.
   The page tree comes from the `meta.json` file of each folder.
3. `app/docs/[[...slug]]/page.tsx` renders a page: title, description, the difficulty label
   taken from the front matter, the MDX body with the components of
   `components/mdx/index.tsx`, JSON-LD built from the page's own text, and a generated
   block of links between the two parts of the site. `generateStaticParams` lists every page.
4. `app/docs/layout.tsx` declares the two top-level entries, "IDML Reference" and "Paged".
5. Search is a static index emitted by `app/api/search/route.ts` and loaded in the browser.

## The page contract

`lib/frontmatter.ts` extends the Fumadocs schema. `tier` (beginner, intermediate, pro) and
`diataxis` (tutorial, how-to, reference, explanation) are required, so a page without them
fails schema validation. `status` is `stub`, `draft` or `published` and defaults to `stub`.
`owner`, `formatVersion`, `describes` and `reviewed` are optional. At this commit 145 pages
are `published`, 25 `draft` and one `stub`.

The difficulty label under a page title is rendered from `tier` and `diataxis`, not written
in the page. `lib/metadata.ts` decides indexing: `isIndexable` returns true for every
status, so all pages are in the sitemap and none carries a `noindex` tag. The rules a
reviewer applies to prose (short sentences, one concept per page, a summary at the top,
questions at the end) are a published page, `content/docs/idml/meta/style-guide.mdx`. The
pull-request template `.github/PULL_REQUEST_TEMPLATE/content_change.md` repeats the contract.

## Examples

A page shows a fragment of an IDML file through `<ExampleEmbed example="id">`. The component
reads `examples/<id>/example.json` and the one part the manifest marks as `editable`, and
renders it as raw, annotated or tree view. When the manifest lists the `live` view (10 of
the 24 do), it also assembles the whole package and hands the bytes to the preview.

The same assembler feeds the CI gate: `scripts/examples/validate.ts` runs the engine's
`paged-inspect` on each package and compares its counts with the manifest. The script
examples in `data/scripting/examples.ts` are checked the same way with `paged-run`. Both
tools are built from the engine commit in `core.pin`. See
[ADR 801](adr/801-validated-examples.md). The rule that examples and prose are the
project's own work is [ADR 800](adr/800-clean-room-documentation.md).

## Generated platform data

`pnpm generate:docs` runs eleven stages. The first, `pull-sources.mjs`, fetches the files
named in `sources.pin` into `.generated/sources/`; the others project them into the JSON
files that `lib/generated.ts` loads for server components. A missing file loads as empty
data. See [ADR 802](adr/802-generated-platform-pages.md).

| Source in `sources.pin` | Stage | Output in `.generated/` | Read by |
|---|---|---|---|
| `state` | `gen-matrix` | `matrix.json`, `support-map.json`, `conformance.json` | `CapabilityMatrix`, `StatusHeadline`, `SupportBadge`, `StageRow`, `ConformanceTable` |
| `core-catalog` | `gen-scripting`, `gen-idml-schema` | `scripting.json`, `idml-schema.json` | `ScriptingCatalog`, `FunctionPlayground`, `PathShowcase`, `PathReference`, `AttrTable` |
| `sdk-catalog` | `gen-sdk` | `sdk-catalog.json` | `SdkCatalog` |
| `cli-surface` | `gen-cli` | `cli.json` | `CliReference` |
| `capability-matrix` | `gen-surfaces` | `surfaces.json` | `SurfaceReach` |
| `plugin-sdk` | `gen-plugin-sdk` | `plugin-capabilities.json` | `PluginCapabilities` |
| `editor-server` | `gen-api` | `rest-api.json` | `RestApiReference` |
| the `activity` list | `gen-activity` | `activity.json` | `ActivityFeed`, `RepoActivity` |
| `matrix.json` | `gen-crosslinks` | `crosslinks.json` | `RelatedAcrossPillars`, page breadcrumbs |

`ApiReferenceIndex` reads five of these outputs. Two checks work on the same data:
`scripts/check-feature-refs.mjs` (every `feature=`, `chapter=` and `<XRef to=…>` in a page
resolves) and `scripts/check-freshness.mjs` (a page with `describes:` is not older than
what it describes).

## Live preview and demos

The `live` view of an example and `<SdkPlayground>` render in the browser with the npm
package `@paged-media/idml-viewer`. Its wasm is copied to `public/preview/` at build time
and loaded from there on demand; it needs WebGPU
([ADR 803](adr/803-live-preview-uses-viewer-package.md)).

`<LiveDemo>` and `<ScriptingPlayground>` embed the running editor from the playground origin
in an iframe. This is why the host sends cross-origin isolation headers. `<Demo>` plays a
recorded session with the player from `@paged-media/demo-replay`
([ADR 804](adr/804-static-export-hosting.md)).

## Where data is stored

- **Committed:** pages, examples, the script corpus, three demo recordings, the two pin
  files, `data/comparison.json`.
- **Produced by a build and ignored by git:** `.source/`, `.generated/`, `public/preview/`,
  `public/demos/`, `.next/`, `out/`, `dist/`.
- **At run time:** nothing. The site is static files; it has no database and no server
  state. `components/analytics.tsx` adds up to two third-party analytics scripts: one when
  `NEXT_PUBLIC_ANALYTICS` is `1`, one in every production build.

## The boundary to other repositories

| Repository | What this repository takes from it |
|---|---|
| `core` | `paged-inspect` and `paged-run`, built in CI at the commit in `core.pin`; three pulled JSON files (scripting catalog, viewer API catalog, command-line tree); the npm package `@paged-media/idml-viewer` at an exact version; the byte rules that `scripts/examples/assemble.ts` repeats. |
| `plugin-sdk` | The manifest schema `packages/plugin-api/src/manifest.schema.json`, pulled. |
| `editor` | The playground deployment that the iframes embed, with its query parameters and messages; recorded sessions from its release assets. |
| `demo-replay` | The recording player, a git dependency pinned to a commit. |
| `state`, `editor-server` | The feature registry with the capability matrix, and the OpenAPI document, pulled as JSON. |
| a separate baseline repository | The fingerprint file the similarity check compares against. |

In the other direction the repository offers one door: the deploy workflow rebuilds when it
receives a `repository_dispatch` event of type `source-updated`. A step for source
repositories to copy is in `.github/dispatch-docs-rebuild.example.yml`.

`ownership.yaml` maps nine engine crates to the sections that describe them, so that a
change to a crate can point at pages to revisit. Its header calls it advisory. No workflow
or script in this repository reads it, and its paths (`content/docs/parser-internals/**`)
lack the `idml/` level of the content tree. `OWNERSHIP.md` lists the 27 sections with one
owner, `paged-docs`, for all of them.

## Build, checks and deploy

| Workflow | Runs on | What it does |
|---|---|---|
| `build.yml` | every pull request, push to `main` | manifest check, `generate:docs`, the two data checks, `typecheck`, `build` |
| `examples.yml` | pull requests touching examples or the pin, push to `main`, weekly | builds `paged-inspect`, validates every example; warns when the pin is behind |
| `scripting.yml` | pull requests touching the corpus or the pin, push to `main`, weekly | builds `paged-run`, checks the corpus against the catalog, executes every script |
| `cleanroom.yml` | pull requests touching content | the similarity check, when the baseline is available |
| `links.yml` | pull requests touching content, weekly | builds, then checks internal links; external links only on the weekly run |
| `cloudflare-pages.yml` | push to `main`, nightly, dispatch | builds and uploads `out/` |

Locally: `pnpm install` (generates `.source/`), `pnpm dev`, `pnpm build`, `pnpm typecheck`.
`pnpm examples:index` needs nothing else. `pnpm validate:examples` and
`pnpm validate:scripting` need the engine tools, taken from `$PAGED_INSPECT` and
`$PAGED_RUN` or from a sibling checkout of the engine repository. `pnpm generate:docs`
copies from sibling checkouts of the source repositories where they exist and uses the `gh`
CLI otherwise; a source it cannot reach is a warning. The repository has no unit test
framework; the checks above are its tests.
