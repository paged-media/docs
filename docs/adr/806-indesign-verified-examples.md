# ADR 806 — Examples are verified in InDesign, and the stamp is tied to the bytes

- **Status:** Accepted, 2026-10-11.
- **Scope:** `scripts/examples/verify-indesign.ts`, `scripts/examples/indesign/verify-example.jsx`,
  `scripts/examples/check-verified.ts`, `lib/parts-hash.ts`, `components/mdx/indesign-view.tsx`,
  `components/mdx/example-embed.tsx`, `scripts/stage-verified.mjs`, `examples/*/_verified/`,
  the `verified` field of `examples/_schema/manifest.schema.json`

## Context

ADR 801 makes every example a real package that the released engine accepts. Acceptance by
our own engine says nothing about Adobe: the engine reads private spellings that InDesign
ignores. The first InDesign run over the 24 examples proved it. Every example declared its
font as an `AppliedFont` attribute, which InDesign ignores, so all of them came out in
InDesign's default face. The hyperlink example used the destination attribute that stops
InDesign 20 opening the file. A reference that claims to describe IDML has to show what the
application that defines IDML does with each example.

## Decision

Each example carries evidence from a run in the real InDesign.

- `pnpm examples:verify-indesign [id…]` runs on a maintainer's Mac with InDesign installed.
  It assembles the package and opens it in InDesign through an AppleScript shim. A run fails
  unless:
  - the file opened;
  - no font or link is missing;
  - InDesign re-saved the file as IDML;
  - the page count is the one the manifest expects.
- The run writes `examples/<id>/_verified/`: InDesign's PDF, each page rasterised at 96 dpi
  with FOGRA39 and stored as lossless WebP, and `verify.json`.
- The same package is rendered with `paged-inspect` and diffed with `paged-diff`. The worst
  page's mean ΔE, p99 ΔE and SSIM are recorded, as is whether InDesign used the face the
  browser preview has (Open Sans).
- The manifest's `verified` block holds `partsHash`: sha256 over the sorted
  `(path, sha256)` list of the package's parts. It hashes the parts rather than the zip, so
  a change to the assembler does not invalidate the evidence, while any edit to a part does.
- The page shows an InDesign tab only while `partsHash` matches the parts as built.
  `pnpm examples:verify` (in `build.yml` and `examples.yml`) fails when a stamp no longer
  matches its package, or when page images are missing.
- An example that cannot be verified on purpose is marked
  `verified.status: "not-applicable"` with a reason. For example, its linked image is
  deliberately absent, or it is pathological by design.

## Consequences

Verification needs InDesign, so it cannot run in CI. CI only checks that each stamp still
matches its bytes, and editing an example means re-running the script locally. The
evidence depends on one InDesign version, 20.0.1, and on the fonts installed on the
verifying machine. The recorded ΔE is a measurement, not a pass/fail gate, and the page
states it as one.
