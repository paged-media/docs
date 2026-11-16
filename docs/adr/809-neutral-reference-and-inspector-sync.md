# ADR 809 — The element reference is neutral; Paged support is a separate panel; the Inspector's panes select each other

- **Status:** Accepted, 2026-11-16.
- **Scope:** `scripts/generate/gen-idml-reference.mjs`, `components/mdx/element-reference.tsx`,
  `components/mdx/element-reference.module.css`, `components/mdx/element-index-table.tsx`,
  `content/docs/idml/meta/census.mdx`, `components/inspector/` (`xml-index.ts`,
  `synced-tree.tsx`, `synced-xml.tsx`, `selection-strip.tsx`, `idml-inspector.tsx`,
  `render-pane.tsx`, `inspector.module.css`), `content/docs/idml/tools/inspector.mdx`,
  `tests/browsers/idml.spec.ts`

## Context

idml.paged.media is meant to read as an independent reference to the format (ADR 805). The
element pages did not: each attribute table carried a "Paged" read/write column and a
`paged.set` column beside the format facts, the opening sentence said how many attributes
Paged reads, and the element index had a "Paged" column. A reader could not tell where the
description of IDML ended and the description of one implementation began.

The pages also stated their corpus figures without saying what they measure. The census
observed 281 elements in 305 documents; the reference has 195 entries, chosen by a rule
that lived only in the generator.

The Inspector showed a package's tree, one part at a time as Linked, Raw or Tree, and the
live render, side by side. None of the three followed a selection in another.

## Decision

1. **An entry has a fixed outline, written by the generator.** Each element page is
   Definition, Structure (Relationships, Attributes), Visualization (when a verified
   example shows the element), Behavior (when examples exist), Evidence, then Paged
   support. The generator writes the headings into the page and one
   `<ElementReference name section>` call per section, so every section has the site's
   heading anchor, a permalink and a line in the page's contents. Attribute rows keep
   `#attr-<Name>`; their support rows are `#paged-<Name>`. The order is chosen for a reader
   (what it is, how it is built, what it looks like, what it does, how we know), not taken
   from any other document (ADR 800).
2. **The reference states format facts only.** The attribute table has name, type,
   permitted values, default where one is recorded, and the share of documents that set it,
   with how many vary from the usual value and the census date. The element index lists
   elements, attribute counts and shares; it has no Paged column.
3. **Paged support is one framed panel at the end of the entry**, labelled as describing
   one implementation. It gives parse, render, edit and write: per attribute, whether the
   importer reads it (and from the wrong part, marked as an issue), its `paged.set` path, and
   whether the exporter writes it, each read and write linked to its source line on GitHub
   at the commit the coverage record was read from; per feature, the capability record's
   parse, render and edit claims and its test evidence, for the features of the record's
   format chapters whose title names the element; and, for verified examples, the measured
   difference between Paged's render and InDesign's. The panel says which records it
   reflects: the engine release in `core.pin`, the coverage commit and the date it was
   read, and the capability record's export date.
4. **The census is stated with what it measures.** `/meta/census/` (`<CensusMethod />`)
   gives the date, the documents by group, the parts read, what was observed, what is
   published, and the selection rule with its numbers, all from the generated data. The
   index and every entry link to it, and say "N of the M observed".
5. **Tree and XML select each other through an index of each part.** `xml-index.ts`
   tokenises a part once into elements with the range each covers (opening `<` to the end
   of the closing tag) and a `Self` → element map. Selecting in the tree marks that range in
   the XML and scrolls the XML pane (not the page) to it; a click in the XML maps its offset
   to the innermost element through a binary search over element starts. A second index,
   every `Self` in the package and the part that defines it, turns reference values such as
   `ParentStory` into links that open the defining part with that element chosen. The tree
   is an ARIA tree with roving focus; the selection strip offers the path and the
   references as buttons, so everything the pointer can do the keyboard can too.
6. **Page and element are not linked until the viewer can say where an element is.** The
   published `@paged-media/viewer` (0.74.1; its session is the same on the monorepo's main
   on 2026-11-16) draws pages and reports page geometry, but has no hit test and no element
   bounds. The engine has both (`paged-canvas` hit-tests to an `ElementId`, and the
   introspection catalog keys elements by `Self`). Working positions out from the XML in the
   browser would be a second, partial layout engine and would be wrong for anchored, grouped
   or text-wrapped items, so the Inspector does not; the page pane says page and element are
   not linked, and `docs/status.md` names the viewer API that would close the gap.

## Consequences

- A reader can cite the reference without citing Paged, and can find Paged's support for any
  attribute in one place, with its evidence and its date.
- The support panel is only as fine as its records: render support is per feature, not per
  attribute, and a feature is linked only when its title names the element.
- Visualization shows InDesign's page 1 of the first verified example that declares the
  element, as captured; it does not mark the element on the page, for the reason in
  decision 6.
- When the viewer exposes a hit test returning a `Self` id and the bounds of an element by
  `Self`, the page pane can join the triptych with no change to the tree, the XML or their
  index.
