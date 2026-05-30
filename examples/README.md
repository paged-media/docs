# `examples/` — the spine of the project

Every chapter that explains part of the format is anchored on a **first-class
example** here (briefing §6.2). Examples are owned, versioned, and validated
against the real renderer in CI. This is what makes the docs *living* rather than
aspirational: if the renderer stops accepting an example, the page that depends on
it breaks in the same build.

## The contract

- **One example == one directory.** `examples/<id>/` with an `example.json`
  manifest (schema: `_schema/manifest.schema.json`) and a `package/` subtree.
- **Stored unzipped, as human-readable XML parts.** IDML is a ZIP; we store the
  *unzipped* package parts so they are diff-able in review (the clean-room
  "examples are ours" rule is auditable) and so MDX can import the editable part
  as text. The `.idml` is a build artifact, never committed.
- **Minimum viable fragment.** The smallest package that demonstrates one concept.
  No noise.
- **Authored, never copied.** Author parts clean-room (briefing §6.1). The shapes
  are grounded in our own parser (`core/crates/paged-parse`) and the
  `paged-gen` generators — not transcribed from the spec.
- **`editable` is the chapter-relevant part** (the story, the spread, …). It is
  what the reader sees in the raw/annotated/tree views and, later, edits in the
  WebGPU live preview. The rest of `package/` is the complete-but-hidden skeleton
  the renderer needs.

## Validation

`pnpm validate:examples` assembles each package (`scripts/examples/assemble.ts`,
UCF-faithful) and runs it through `paged-inspect --json` (built from the commit in
`../core.pin`), asserting the `expect` counts in each manifest. This is structural
validation (parse + build display list) — no GPU, no font required.

```bash
# local: build the inspector once from a sibling core checkout, then validate
(cd ../core && cargo build --release -p paged-renderer --bin paged-inspect)
pnpm validate:examples            # auto-finds ../core/target/release/paged-inspect
# or point at any build:
PAGED_INSPECT=/path/to/paged-inspect pnpm validate:examples
```

`smallest-valid/` is the worked reference: a one-page, one-story package that
`paged-inspect` reports as `pages:1, frames:1, stories:1, paragraphs:1, runs:1`.
