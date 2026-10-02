# ADR 803 — The live preview uses the published viewer package

- **Status:** Accepted. Recorded retroactively on 2026-10-02 from the code at `2094ba4`.
- **Scope:** `components/mdx/live-preview.tsx`, `components/mdx/sdk-loader.ts`,
  `components/mdx/sdk-playground-client.tsx`, `scripts/prepare-preview-wasm.mjs`,
  `scripts/verify-preview-wasm.mjs`, the `@paged-media/idml-viewer` entry in `package.json`

## Context

An example can offer a `live` view: the assembled package, drawn in the reader's browser by
the project's own renderer ([ADR 801](801-validated-examples.md)). That needs the engine's
viewer as WebAssembly on a static site.

The first deploy workflow built that wasm itself. Commit `34daa71` (2026-05-30) checked out
`paged-media/core` at the commit in `core.pin`, installed a Rust toolchain with
`wasm-bindgen` and binaryen, and ran `scripts/build-preview-wasm.sh`. Commit `ee5724a`
(2026-06-07) replaced this with the npm package `@paged-media/idml-viewer`, which carries
the wasm. Its message lists effects: the deploy workflow lost the core checkout and the
Rust toolchain, and no wasm is in a page bundle. It states no reason for the change. The
repository does not record why.

The viewer draws with WebGPU only. The repository does not record why.

## Decision

The `live` view and the SDK playground render with the published package
`@paged-media/idml-viewer`, pinned to one exact version. Its wasm is copied into the static
site and loaded from a fixed URL on demand. Without WebGPU nothing is rendered and a note
is shown.

- `package.json` names the version without a range: `0.64.0`.
- `prepare-preview-wasm.mjs` copies `paged_sdk.js`, `paged_sdk_bg.wasm` and `paged_sdk.d.ts`
  from the installed package's `wasm/` directory into `public/preview/`, then runs
  `verify-preview-wasm.mjs`, which fails if the wasm's `__wbindgen_externrefs` export points
  at a table that cannot grow. `pnpm build` runs it before `next build`.
- `sdk-loader.ts` imports the glue from `/preview/paged_sdk.js` at run time, with comments
  that tell the bundler to leave the import alone, and initialises it with
  `/preview/paged_sdk_bg.wasm`. The promise is kept in a module variable, so the wasm is
  initialised once per page; a failed load is not kept.
- `LivePreview` is a client component. It checks `navigator.gpu`, imports the package
  dynamically, calls `createViewer` with its canvas and the loader's session factory, loads
  the package bytes and fits the page. It disposes the viewer on unmount.
- The bytes come from the server component as base64, produced by the same assembler the
  CI gate uses. `SdkPlaygroundClient` uses the same loader and the same package.

## Evidence

- `package.json:10-12`, `:29` — `prepare:preview` runs inside `build`; the exact version
- `scripts/prepare-preview-wasm.mjs:36-45`, `:50-54` — the copy, then the table check
- `components/mdx/sdk-loader.ts:14-19`, `:27-50` — why init runs once; URLs, memoised import
- `components/mdx/live-preview.tsx:15-19`, `:46-49`, `:62-83` — same bytes as the gate and no
  second renderer; the `navigator.gpu` check; `createViewer`, `load`, `fit`
- `components/mdx/sdk-playground-client.tsx:88-96` — the second consumer
- `core.pin:57-59` — the preview is not built from the pinned commit
- `public/_headers:21-23`, `.gitignore:35-36` — the `/preview/*` header; files not committed

## Alternatives considered

Building the wasm from a core checkout was the first form. `scripts/build-preview-wasm.sh`
remains; its header marks it superseded and keeps it for trying engine changes that are not
yet published (`scripts/build-preview-wasm.sh:5-10`). No workflow calls it. A CPU or WebGL
renderer for browsers without WebGPU is absent by statement
(`components/mdx/live-preview.tsx:16-19`).

## Consequences

Two pins have to move together by hand: the viewer version in `package.json` and the
release commit in `core.pin`. No script compares them. At this commit both name 0.64.0.

The site depends on the package's layout and API: a `wasm/` directory beside `dist/` with
the three files above, `createViewer`, the `ViewerSessionLike` type, and a glue module
whose `ViewerSession.new()` returns a session. A reader without WebGPU sees the raw,
annotated and tree views only. When the files are not in `public/preview/`, the view is
written to show a note that the preview is unavailable.

Several comments describe earlier states. `scripts/prepare-preview-wasm.mjs:8` names
version 0.35.0. `.gitignore:35` says the wasm is built by `build-preview-wasm.sh`.
`scripts/examples/assemble.ts:15-16` speaks of the live preview as something that comes
later. `scripts/build-preview-wasm.sh:7` names a workflow,
`pages.yml`, that no longer exists.

## Related

- [ADR 801](801-validated-examples.md), [ADR 804](804-static-export-hosting.md) — the
  packages that are previewed; the static host that serves the wasm
- [ADR 112](https://github.com/paged-media/core/blob/main/docs/adr/112-viewer-sdk-is-a-sibling.md)
  (core) — the viewer SDK renders with WebGPU and carries no second renderer
- [ADR 123](https://github.com/paged-media/core/blob/main/docs/adr/123-viewer-ships-from-core.md)
  (core) — the package and its bundled wasm are published from the engine repository
