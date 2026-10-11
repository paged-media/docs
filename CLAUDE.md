# CLAUDE.md — paged-media/docs

Orientation for Claude sessions in **paged-media/docs** — PUBLIC. One app, built as
two sites (ADR 805, `docs/adr/805-two-sites-one-app.md`):

- `SITE=idml` → **idml.paged.media**, the IDML format reference (`content/docs/idml`)
- `SITE=paged` (default) → **docs.paged.media**, the Paged docs (`content/docs/paged`)

Write links site-neutral (`/docs/idml/<path>`, `/docs/paged/<path>`); `lib/site.ts`
`resolveHref` maps them per build. The original plan is archived at
`thoughts/docs/archive/docs/docs.md`; the current record is `docs/` here.

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
   ticks the clean-room checkbox. See `content/docs/idml/meta/clean-room-protocol.mdx`.

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
(schema: `lib/frontmatter.ts`). Every page is indexed regardless of `status`
(`lib/metadata.ts`), so a page is not merged until it can face a search result.

## Quick commands

```bash
pnpm install            # runs `fumadocs-mdx` postinstall (generates .source/)
pnpm dev               # docs.paged.media;  pnpm dev:idml  for idml.paged.media
pnpm build             # also fails on broken example imports / MDX; build:idml / build:paged
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

## SEO contract (idml.paged.media especially)

One URL per page: root-relative, trailing slash, canonical = that URL on the site's own
origin. Every moved URL gets a one-hop 301 in `scripts/write-redirects.mjs` — never a
redirect to the home page, never a chain. Titles are `<Page> · <Site name>`; descriptions
stay at 170 characters or fewer (`pnpm check:seo`). Per-page JSON-LD comes from frontmatter
and the FAQ section, never hand-written.

## Licensing

Content (`content/`, `examples/`) CC BY 4.0 (LICENSE-CONTENT); code MIT
(LICENSE-CODE). Both recommended defaults pending legal review.
