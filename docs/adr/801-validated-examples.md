# ADR 801 — Examples are real packages, validated against the released engine

- **Status:** Accepted. Recorded retroactively on 2026-10-02 from the code at `2094ba4`.
- **Scope:** `examples/`, `scripts/examples/`, `lib/examples.ts`, `lib/assemble-example.ts`,
  `components/mdx/example-embed.tsx`, `core.pin`, `.github/workflows/examples.yml`, and the
  scripting corpus with `scripts/scripting/` and `.github/workflows/scripting.yml`

## Context

A format reference shows fragments of files. `examples/README.md:3-7` states what the
repository wants from them: examples are owned, versioned and validated against the real
renderer in CI, so that a page breaks when the renderer stops accepting its example.

The same file gives the reasons for the storage form. An IDML file is a ZIP; the parts are
kept unzipped so that they can be diffed in review, so that the rule that examples are the
project's own work can be audited ([ADR 800](800-clean-room-documentation.md)), and so that
a page can import one part as text (`examples/README.md:13-16`).

`core.pin` gives the reason for the engine version: the gate builds its tool from the
commit of the latest release tag, so that a validated example is one that a released
renderer accepts (`core.pin:8-10`). Its header also records why that tag's npm packages
must be published first: the pin once named a tag whose release never shipped (`:43-47`).

## Decision

Each example is a directory `examples/<id>/` with a manifest and a complete IDML package
stored as unzipped parts. A page shows it only by id, through `<ExampleEmbed>`. CI assembles
every package and requires the engine at the commit in `core.pin` to accept it.

- The manifest (`example.json`) names the package directory, the one `editable` part the
  reader sees, the views to offer, line annotations and the counts the engine must report.
  There are 24 examples at this commit.
- `ExampleEmbed` is a server component. It reads the manifest and the editable part from
  disk at build time. When the manifest lists the `live` view it also assembles the whole
  package for the preview ([ADR 803](803-live-preview-uses-viewer-package.md)).
- `assembleIdml` writes `mimetype` first and uncompressed, deflates every other part, and
  uses a fixed entry order and fixed timestamps. The gate and the preview call the same
  function, so both see the same bytes.
- `scripts/examples/validate.ts` runs `paged-inspect --json` on each assembled package and
  compares pages, stories, frames, paragraphs and runs with the manifest's `expect`. An
  example marked `pathological` must make the tool fail. Nothing is rendered.
- `examples.yml` builds `paged-inspect` from `paged-media/core` at the commit in `core.pin`,
  on pull requests that touch examples, the gate or the pin, and on pushes to `main`. A
  weekly run uses core's `main` instead. The pin is the commit of the latest core release
  tag whose npm packages are published (`v0.64.0` at this commit).
- `scripts/scripting/validate.ts` does the same for scripts: it executes each entry of
  `data/scripting/examples.ts` in `paged-run`, built at the same pin.

## Evidence

- `examples/README.md:9-32` — one directory each, unzipped parts, what validation asserts
- `components/mdx/example-embed.tsx:10-14`, `:29-33` — taken by id; the live view's bytes
- `scripts/examples/assemble.ts:5-18`, `:42-56` — the byte rules and the shared function
- `scripts/examples/validate.ts:50-78` — assemble, run the tool, compare, `pathological`
- `core.pin:5-11`, `:43-50`, `:60` — pin policy, the published condition, the commit
- `.github/workflows/examples.yml:53-60`, `:76-87` — pinned commit, or `main` on schedule
- `.github/workflows/scripting.yml:45-46`, `:65-69` — the `paged-run` lane

## Alternatives considered

Snippets written inline in a page are ruled out by the second hard rule, "Examples are
imported, never inlined" (`CLAUDE.md:26`). The `.idml` file is not committed: it "is a
build artifact, never committed" (`examples/README.md:16`). Pinning to core's `main` is
rejected in `core.pin:5-11`. `CLAUDE.md:57-58` calls building the inspector from a core
checkout interim; no published binary is consumed.

## Consequences

Every core release needs a pin change here, made by hand. The `pin-freshness` job compares
the pin with core's latest `v*` tag and only warns (`.github/workflows/examples.yml:24-46`).
The gates read three engine outputs: `paged-inspect` JSON (`totals`, `stories`), `paged-run`
JSON-lines commands and the scripting catalog `check:scripting` compares the corpus with,
pulled at `main` (`sources.pin:14-20`). `assemble.ts` repeats byte rules it attributes to
`core: crates/paged-gen/src/package.rs`. A change to any of these has to be followed here.

The gate is structural: it proves that the engine opens a package and builds its display
list with the expected counts, not that the page looks right. The deploy does not wait for
it: `.github/workflows/cloudflare-pages.yml` has no dependency on the `examples` or
`scripting` workflow, and the site build reads an example's files without running the
engine on them. The import rule is not enforced by a script: seven pages under
`content/docs/idml/` contain fenced `xml` blocks. No script validates a manifest against
`examples/_schema/manifest.schema.json`; `scripts/examples/index.ts` checks the id, tier,
views and editable part by hand.

## Related

- [ADR 800](800-clean-room-documentation.md) — examples are authored, not copied
- [ADR 803](803-live-preview-uses-viewer-package.md) — the live view of an example
- [ADR 006](https://github.com/paged-media/core/blob/main/docs/adr/006-protocol-coupled-versioning.md)
  (core) — the release tags and package versions the pin follows
