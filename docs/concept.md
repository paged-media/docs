# Concept

Why this repository exists, what it is for, and what it will never do. Each paragraph names
its source in a comment. `README.md` and `CLAUDE.md` describe an early state of the site in
places; where they and the code disagree, this page follows the code and
[`status.md`](status.md) lists the difference.

## Why it exists

The repository is the source of docs.paged.media: an independent reference for the IDML
file format and for the Paged renderer. It is written from first principles, from small
files the project builds itself and from what its own renderer learns when it reads them.
<!-- source: README.md:3-6 -->

IDML is a published file format owned by its vendor. The site is an independent description
of it and is not affiliated with or endorsed by the vendor. Paged is a native renderer for
paged media that starts with IDML; it is a different project from the CSS-based Paged.js.
<!-- source: README.md:8-13 -->

The reference is meant to stay true as the renderer changes. The rule is that every chapter
explaining a part of the format rests on an example the real renderer validates in CI, so
that an example the renderer no longer accepts fails a check; at this commit three sections
(sections, numbering and variables; tagged XML; companion formats) embed no example.
<!-- source: examples/README.md:3-7; README.md:41-43 -->

## What it is for

**One public site.** A single Next.js application at the repository root, built with
Fumadocs and MDX. It is not a workspace and not part of a larger tree. It documents the
IDML format and the renderer that reads it.
<!-- source: CLAUDE.md:9-14; README.md:15-18 -->

**A reference ordered for readers.** Sections follow the reader's progression, not the
order of the vendor specification. Every page declares exactly one reader tier (beginner,
intermediate, pro) and one Diátaxis mode (tutorial, how-to, reference, explanation).
<!-- source: README.md:31; CLAUDE.md:36-40 -->

**Examples as the spine.** Snippets are hand-written IDML packages kept in `examples/` as
unzipped XML parts. Pages import them; CI assembles and validates them against the engine
at a pinned release ([ADR 801](adr/801-validated-examples.md)).
<!-- source: README.md:32, 41-43; CLAUDE.md:26-31, 57-59 -->

**A second part about the platform.** Beside the format reference, the site has pages
about Paged itself. Their data is generated from machine-readable sources in other
repositories, so that it does not go stale by hand
([ADR 802](adr/802-generated-platform-pages.md)).
<!-- source: sources.pin:2; app/docs/layout.tsx:8-31 -->

**Named ownership.** Each top-level section has an owner who answers for its quality,
completeness and freshness. One bootstrap owner, `paged-docs`, holds every section until
others are assigned. The sections about the renderer are tied to engine crates in
`ownership.yaml`, so that a change to a crate can point at the pages that describe it.
<!-- source: OWNERSHIP.md:3-9, 41-43; ownership.yaml:1-10 -->

## What it will never do

- **Copy the vendor specification.** No verbatim text, no close paraphrase and no mirroring
  of its structure. The specification file is never committed here
  ([ADR 800](adr/800-clean-room-documentation.md)).
- **Order the reference by the specification.** The reason of record for any ordering is a
  reader reason.
- **Inline a snippet in a page.** The rule is that every snippet lives in `examples/` and
  is imported.
- **Use `idml` as a project name.** `idml` names the format (`.idml`, element names). The
  project is `paged`.
- **Be the engine, the editor, the asset corpus or the viewer.** Those are other
  repositories; this one is a documentation site.
- **Claim a connection to the vendor.** The independence statement is part of the site.
- **Keep platform facts by hand.** The stated rule is that a page is either generated from
  its source or guarded by a declaration of what it describes and when it was last checked.
<!-- source, in list order: CLAUDE.md:18-24; CLAUDE.md:19-21; CLAUDE.md:26-28;
     CLAUDE.md:33-34; CLAUDE.md:11-14;
     README.md:11-13, content/docs/idml/meta/clean-room-protocol.mdx:72-74; sources.pin:2,
     scripts/check-freshness.mjs:3-11, content/docs/paged/repos/docs.mdx:23-24 -->
