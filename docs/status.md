# Status

What the documentation sites ship and what they do not. Last updated 2026-10-13 (the
follow-up to the reading and navigation pass below); before that 2026-10-11
(`@paged-media/idml-viewer` 0.71.1, `core.pin` at the engine tag `v0.71.1`), when the IDML
reference moved to its own site ([ADR 805](adr/805-two-sites-one-app.md)). How the parts fit
is in [`architecture.md`](architecture.md).

## Shipped

- **Two sites from one app.** `SITE=idml` builds idml.paged.media from
  `content/docs/idml` (99 pages: 97 `published`, one `draft`, one `stub`). `SITE=paged`
  builds docs.paged.media from `content/docs/paged` (72 pages, including the engine chapters
  moved from the IDML reference: 48 `published`, 24 `draft`). Each site has its own search
  index, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, social card and
  canonical URLs. Every older URL reaches its new home in one 301.
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
- **Reading and navigation pass (2026-10-12).** Both sites:
  - *Examples.* The Live and InDesign views open framed on the page's content (the ink is
    measured on a small render, or on InDesign's raster, and both sides show the same
    region), with a Whole page switch. Raw and Annotated code is numbered; an annotated
    line is marked from the manifest's `lines`, and a note and its lines light each other.
  - *Element reference.* An attribute discussed in a section of the reference links to it,
    and 72 carry the sentence that explains them, found by the generator in our own prose
    (`gen-idml-reference.mjs`, `explanationOf`). The index filters by element or attribute
    name; the sidebar folds the element pages into one group per package part; table
    headers stay in view.
  - *Inspector.* Package tree, part and render side by side; a part opens in the Linked view.
  - *Search.* One row per page with its kind (Guide, Element, Cookbook, API, …), its best
    passage, kind filters, and an exact title match first (`components/search-dialog.tsx`).
  - *Navigation.* A two-site switch in the masthead; a section's own page is "Overview" in
    the sidebar; pages that are not `published` carry a Draft mark; card lists show the
    linked page's tier mark (`lib/tiers.ts`); the IDML home has its own frontispiece.
  - *Reading.* Running text keeps the 66ch measure; docs pages end on a one-line footer
    (the full colophon closes the two home pages); a night-paper dark theme behind the
    theme switch, paper by default.
- **Follow-up (2026-10-13).**
  - *Attribute notes.* `data/idml-reference-overrides.json` gives 2466 of the 3175
    attribute rows a line saying what the attribute is, and 163 of the 194 element pages an
    opening summary. Notes are shared by every element with the attribute (`*@Name`, with an
    `except` list) or one element's own (`Cell@Name`); a description harvested from the
    chapters takes precedence. Each entry names its `source`: Paged's code, our chapters,
    the census or corpus, an InDesign probe, or general DTP knowledge. Where the sources
    disagreed, InDesign 20.0.1 decided: letter spacing is a percentage of the font's space
    width, a rule's offset reaches its near edge, superscript and subscript shifts are a
    percentage of the type size.
  - *Sharper InDesign crops.* Verification also writes each page at 288 dpi
    (`p<N>@3x.webp`; `pnpm examples:verify-indesign --rasters` redoes them from the kept
    PDF); a crop is drawn from it, and both sides of the comparison stop at the live
    preview's 1.8 px per point. `pnpm examples:verify` requires the display copies.
  - *Script playground.* The JavaScript features that would ask for a TypeScript worker
    are off, so the editor no longer throws "Missing requestHandler" while typing.
  - *Browsers.* `tests/browsers/` runs each export in Chromium, Firefox and WebKit
    (Playwright 1.63, `pnpm test:browsers`; the `browsers` job of `build.yml`, on macOS so
    WebKit needs no system packages): search, the element filter and notes, annotated code,
    the InDesign comparison and its caption, the playground, the theme, and no sideways
    scroll at 390px. WebKit draws the live preview through WebGPU without cross-origin
    isolation (it ignores `credentialless`).
  - *Theme.* Follows the reader's system setting; the switch offers light, dark and system.
  - *paged.media.* The docs deploy starts a build of `paged-website` through the Pages API
    (or calls `SITE_DEPLOY_HOOK` when set), so a new capability record reaches the site.
- **Checks.** Six workflows: the build with its manifest, reference and freshness checks,
  then the browser tests; the example gate; the script gate; the similarity check; the link check; the deploy.

## Limits of what is shipped

- **Most support badges are typed by hand.** 97 of the 120 `<SupportBadge>` uses carry a
  `status=` written in the page; 23 take their status from the registry with `feature=`.
  115 of the 116 `<AttrTable>` uses carry hand-written rows.
- **The freshness check covers three pages.** Only pages that declare `describes:` are
  checked, and three do.
- **Only the engine sources are pinned.** The three `core` sources read the commit in
  `core.pin` (`ref: "core.pin"`), never a local working tree. The others still follow
  `main`, and the commit a build used is recorded only in a file that is not committed. A
  source that cannot be pulled is a warning, and the components that need it get empty
  data.
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
- **Indexing does not follow `status`.** Every page is indexed, drafts included.
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
- Versioned documentation: the optional front matter field `formatVersion` is read by
  nothing.
- A check that the manifests match `examples/_schema/manifest.schema.json`, and a check
  that pages contain no inline snippets ([ADR 801](adr/801-validated-examples.md)).
- A check that the viewer version matches `core.pin`, and an automatic bump of either.
- A committed lock of the pulled sources ([ADR 802](adr/802-generated-platform-pages.md)).
- A script in this repository that produces the similarity baseline
  ([ADR 800](adr/800-clean-room-documentation.md)).
- Unit tests: the repository has no test framework.
