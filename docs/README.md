# Documentation of this repository

This folder documents the repository itself: how the documentation site docs.paged.media
is built and why. It is not site content. The pages of the site are in `content/docs/`, and
nothing in this folder is published on the site.

What this folder holds.

- [`concept.md`](concept.md): why the repository exists, what it is for, and what it will
  never do.
- [`architecture.md`](architecture.md): how the site is built. The layout, what goes into a
  build, the path from an MDX file to a page, the page contract, examples, generated data,
  the boundary to other repositories, and the workflows.
- [`status.md`](status.md): what ships today, the limits of what ships, and what is not
  built.
- [`adr/`](adr/README.md): the decision records of this repository, 800–804.

## Decisions in other repositories that bind this one

These records live in other public paged-media repositories. The code here rests on each of
them. The last column says what the decision means for this site.

| ADR | Repository | Decision | What it means here |
|---|---|---|---|
| [006](https://github.com/paged-media/core/blob/main/docs/adr/006-protocol-coupled-versioning.md) | core | Protocol-coupled package versioning (`0.<protocol>.<patch>`) | One release tag names the engine commit and the version of every engine package. `core.pin` holds the commit of tag `v0.64.0`, and `package.json` pins `@paged-media/idml-viewer` to `0.64.0`; the two are moved together by hand. |
| [019](https://github.com/paged-media/core/blob/main/docs/adr/019-capability-catalog-one-contract.md) | core | Capability catalog: one generated contract, projected to every surface | The site is one of the projections. `sources.pin` pulls `crates/paged-introspect/catalog.json`; `scripts/generate/gen-scripting.mjs` and `gen-idml-schema.mjs` turn it into the scripting catalog and the generated attribute tables, and `scripts/scripting/check-corpus.ts` fails when a script example names a function or path the catalog does not have. |
| [112](https://github.com/paged-media/core/blob/main/docs/adr/112-viewer-sdk-is-a-sibling.md) | core | The read-only viewer SDK is a sibling of the editor wasm, enforced by a dependency audit | The live preview can show a document and cannot change it, and it renders with WebGPU only. `components/mdx/live-preview.tsx` checks `navigator.gpu` and shows a note when it is absent. |
| [123](https://github.com/paged-media/core/blob/main/docs/adr/123-viewer-ships-from-core.md) | core | The viewer ships from core | `@paged-media/idml-viewer` carries its own wasm. `scripts/prepare-preview-wasm.mjs` copies it from the installed package into `public/preview/`; nothing is built from an engine checkout for the preview. The viewer API catalog the site renders is pulled from `web/idml-viewer/api-catalog.json`. |
| [212](https://github.com/paged-media/editor/blob/main/docs/adr/212-one-automation-surface.md) | editor | One automation surface for tests, demos and the playground | `<LiveDemo>` and `<ScriptingPlayground>` embed the editor's playground in an iframe: `?script=<id>` plays a demo script, and `?embed=script` accepts `paged:run` messages and answers with `paged:ready` and `paged:result`. The site's host sends cross-origin isolation headers for these iframes. |
| [303](https://github.com/paged-media/plugin-sdk/blob/main/docs/adr/303-manifest-schema.md) | plugin-sdk | The manifest is a closed-vocabulary schema; the CLI mirrors it without dependencies | `sources.pin` pulls `packages/plugin-api/src/manifest.schema.json`, and `scripts/generate/gen-plugin-sdk.mjs` turns its capability and contribution vocabularies into the plugin reference. A new enum value appears on the site at the next build. |
