# CLAUDE.md — paged-media/docs

Orientation for Claude sessions in **paged-media/docs** — the PUBLIC, living IDML
reference deployed at **docs.paged.media**. Built from the plan in
`thoughts/docs/paged/docs.md`.

## What this is

A standalone public documentation website. **Fumadocs (Next.js App Router +
MDX) + TypeScript + pnpm@9.** Single Next app at the repo root — NOT a pnpm
workspace and NOT a monorepo subtree. It documents the **IDML format** *and* the
**renderer-core** (`core/crates/paged-renderer` and friends). Not the engine
(`core`), not the editor (`editor`), not the assets (`corpus`), not the viewer
(`viewer`).

## The three hard rules

1. **Clean-room (§6.1).** No verbatim text, no close paraphrase, and **no
   structural mirroring** of the IDML spec — wording OR arrangement. Organize by
   reader progression/task; the "reason of record" for any ordering is a reader
   reason, never "that's the spec's order." Element/attribute names are facts and
   may be used freely. **The spec PDF must NEVER be committed here** (it is
   copyrighted vendor material; `.gitignore` guards `*.pdf`). Every content PR
   ticks the clean-room checkbox. See `content/docs/meta/clean-room-protocol.mdx`.

2. **Examples are imported, never inlined.** Every snippet lives in `examples/` as
   hand-authored, human-readable unzipped IDML XML parts and is pulled into MDX via
   `<ExampleEmbed example="…" />`. They are validated against the REAL renderer in
   CI (`paged-inspect` built from the commit in `core.pin`) — a broken example
   breaks the build. Author parts by studying our own parser
   (`core/crates/paged-parse`) and the `paged-gen` generators, never the spec.

3. **Naming line.** `idml` the *format* stays (`.idml`, designmap, element names).
   `idml` the *project* prefix is gone — it's `paged`.

## Page contract

Every page declares ONE tier (🟢 beginner / 🟡 intermediate / 🔴 pro) and ONE
Diátaxis mode (tutorial / how-to / reference / explanation) in frontmatter
(schema: `source.config.ts`). `noindex` is DERIVED from `status` — only
`status: published` pages are indexed (sitemap + robots meta). Stubs are public
but `noindex`'d behind the WIP banner.

## Quick commands

```bash
pnpm install            # runs `fumadocs-mdx` postinstall (generates .source/)
pnpm dev
pnpm build              # also fails on broken example imports / MDX
pnpm typecheck
pnpm examples:index     # cheap manifest integrity check (no renderer)
pnpm validate:examples  # full gate; needs paged-inspect (see examples/README.md)
```

## Engine consumption

The example gate builds `paged-inspect` from `core` at `core.pin` (interim
build-from-core; Decision B open for the inspector). `core.pin` tracks the latest
core RELEASE TAG — bump it per release, not to main (policy lives in the pin's
header comment). The WebGPU live preview is WIRED: `ExampleEmbed`'s `live` slot
renders the assembled package via the PUBLISHED `@paged-media/idml-viewer`
(`createViewer`); its bundled wasm is staged into `public/preview` by
`scripts/prepare-preview-wasm.mjs` (run by `pnpm build`/`prepare:preview`), loaded
lazily client-side with a no-WebGPU fallback. No core checkout for the preview.

## Phase-0 scope / out of scope

In: static example views (raw/annotated/tree), difficulty label, ExampleEmbed,
~5 cornerstone pages, style guide v1, clean-room v1, the IA, CI, analytics
baseline, and the WebGPU `<LivePreview>` (now shipped via the published
`@paged-media/idml-viewer`). OUT: the hosted search upgrade, and the bulk of the
~200-page content.

## Licensing

Content (`content/`, `examples/`) CC BY 4.0 (LICENSE-CONTENT); code MIT
(LICENSE-CODE). Both recommended defaults pending legal review.
