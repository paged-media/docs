# Status

What the documentation site ships and what it does not, read from the code at commit
`2094ba4` (`@paged-media/idml-viewer` 0.64.0, `core.pin` at the engine tag `v0.64.0`). How
the parts fit is in [`architecture.md`](architecture.md).

## Shipped

- **The site.** 171 pages, built as a static export: the IDML reference (111 pages), the
  platform part (59 pages) and the root index. 145 pages are `published`, 25 `draft`, one
  `stub`. Search, `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt` are static
  files. Old URLs redirect to the two-part tree.
- **Examples.** 24 hand-written IDML packages, shown by 36 `<ExampleEmbed>` uses as raw,
  annotated and tree views. CI assembles each package and validates it with the engine's
  `paged-inspect` at the pinned commit.
- **Live preview.** Ten examples offer a `live` view that renders the package with WebGPU
  in the reader's browser; `<SdkPlayground>` adds zoom, page navigation and layout controls
  over the same viewer.
- **Script examples.** A corpus of 117 scripts. Pages show them in a playground that runs
  the edited source in the embedded editor. CI executes every script in the engine's
  `paged-run`.
- **Generated platform pages.** The capability matrix and status headline, the conformance
  table, the scripting catalog and path reference, the command-line reference, the viewer
  API catalog, the surface comparison, the plugin capability reference, the REST reference
  and the activity feed are built from data pulled from other repositories.
- **Demos.** Two `<LiveDemo>` embeds of the running editor and one recorded demo.
- **Checks.** Six workflows: the build with its manifest, reference and freshness checks;
  the example gate; the script gate; the similarity check; the link check; the deploy.

## Limits of what is shipped

- **Most support badges are typed by hand.** 97 of the 120 `<SupportBadge>` uses carry a
  `status=` written in the page; 23 take their status from the registry with `feature=`.
  115 of the 116 `<AttrTable>` uses carry hand-written rows.
- **The freshness check covers three pages.** Only pages that declare `describes:` are
  checked, and three do.
- **The sources are not pinned.** Every `ref` in `sources.pin` is `main`, and the commit a
  build used is recorded only in a file that is not committed. A source that cannot be
  pulled is a warning, and the components that need it get empty data.
- **The registry data follows a branch.** The capability matrix, support badges and
  conformance table read files from the `state` repository at `main` (`sources.pin:5-13`,
  `:36-43`).
- **Checks and deploy are independent.** The deploy workflow runs on every push to `main`
  and does not wait for the example gate, the script gate or `build.yml`. The reference
  and freshness checks run only in `build.yml`.
- **The similarity check needs a file from outside.** Without the baseline, as on a pull
  request from a fork, the step is skipped and the job passes.
- **The import rule for snippets is not enforced.** Seven pages of the IDML reference
  contain fenced `xml` blocks.
- **The live preview and the live demos need WebGPU.** The preview shows a note without it;
  the demos leave the message to the embedded editor. Live demos also depend on the
  playground deployment.
- **Two pins are matched by hand:** the viewer version in `package.json` and `core.pin`.
  A workflow warns when `core.pin` is behind the engine's latest tag; nothing bumps it.
- **Indexing does not follow `status`.** Every page is indexed. The banner on every page
  still says unfinished pages are excluded from search engines, and `README.md:47-48` and
  `CLAUDE.md:40-42` say the same.
- **Stale references to the first host.** Comments in several files, two workflows, the
  dispatch template and one site page (`content/docs/paged/repos/docs.mdx`, status `draft`)
  still name GitHub Pages or `pages.yml` ([ADR 804](adr/804-static-export-hosting.md)).
- **`ownership.yaml` is not read by anything here**, and its paths lack the `idml/` level.
  Every section and every page has the same owner, `paged-docs`.
- **`pnpm check:seo`** exists as a script; no workflow runs it.

## Not built

- Editing in the live view: `LivePreview` receives the editable part's path and does not
  use it; the view shows the package as committed.
- A CPU or WebGL renderer for browsers without WebGPU
  ([ADR 803](adr/803-live-preview-uses-viewer-package.md)).
- A server: no hosted search, no image optimisation, no run-time API
  ([ADR 804](adr/804-static-export-hosting.md)).
- A dark theme: the theme switch is disabled and the light theme is forced.
- Versioned documentation: the optional front matter field `formatVersion` is read by
  nothing.
- A check that the manifests match `examples/_schema/manifest.schema.json`, and a check
  that pages contain no inline snippets ([ADR 801](adr/801-validated-examples.md)).
- A check that the viewer version matches `core.pin`, and an automatic bump of either.
- A committed lock of the pulled sources ([ADR 802](adr/802-generated-platform-pages.md)).
- A script in this repository that produces the similarity baseline
  ([ADR 800](adr/800-clean-room-documentation.md)).
- Unit tests: the repository has no test framework.
