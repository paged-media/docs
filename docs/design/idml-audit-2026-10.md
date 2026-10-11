# IDML reference audit — October 2026

Every page of the IDML reference (content/docs/idml) checked against the engine at
core v0.71.1 and the IDML adapter in plugin-publish, before the reference moved to
idml.paged.media (ADR 805). Written from our own code, tests, generators and
InDesign-exported fixtures; the Adobe specification was not consulted (ADR 800).

Verdicts: **current** (publishable as is), **fix** (targeted corrections),
**rewrite** (the page teaches a wrong model or is mostly stale), **merge**, **delete**.
This file is the work list for the chapter rewrites; each wave closes its rows.

## Progress

| Wave | Chapters | State |
|---|---|---|
| 1 | stories & text, text variables | rewritten, live (docs `5928d7f`) |
| 2 | overview, foundations, package anatomy, glossary fixes, meta | rewritten |
| 3 | geometry, layout model, frames & paths, masters, layers | rewritten |
| 4 | styles, typography, tables | rewritten |
| 5 | colour, images, anchored objects, effects & transparency (new), colour management (new) | rewritten |
| 6 | cross-references & hyperlinks, sections, conditional text, tagged XML, table of contents (new) | rewritten |
| 7 | companion formats, round-tripping, edge cases, comparisons, cookbook, glossary, home | in progress |

Every example is verified in InDesign 20.0.1 (ADR 806).

## Totals

| Group | Pages | Current | Fix | Rewrite | Merge / finish / delete |
|---|---|---|---|---|---|
| A — foundations, package, geometry, layout, frames, masters, layers, glossary, meta | 37 | 3 | 21 | 9 | 4 |
| B — stories & text, styles, typography, tables | 23 | 1 | 17 | 2 | 3 |
| C — colour, images, anchored objects, references, sections, conditions, tagged XML, lifecycle, comparisons, cookbook | 40 | 7 | 23 | 9 | 1 |

## Findings that cut across the whole reference

1. **The text model is taught wrong.** `<Br/>` is the paragraph mark, not a forced
   line break; a forced line break is U+2028 inside `<Content>`; a tab is a literal
   U+0009 (`<Tab/>` is a legacy private spelling InDesign ignores); a
   `ParagraphStyleRange` is a style run that can span several paragraphs. The docs
   examples `two-paragraphs` and `tab-stops` encode the old model and must be redone.
2. **Coordinates.** Page items live in spread coordinates (spine at x = 0); pages are
   placed by their own `ItemTransform`. A missing `ItemTransform` is not identity to
   InDesign, which writes one on every spread, page and item.
3. **Shipped features documented as gaps, and the reverse.** Many pages were half
   updated: a body says "supported" while the in-short block and FAQ still say "not
   yet". Every claim must be re-derived from the current code.
4. **Dead code citations.** The parser and writer moved from core to plugin-publish
   (`idml-import`, `idml-export`, ADR 022). Every `paged-parse`, `Document::open` and
   `pipeline.rs:N` citation is dead. The format prose should not cite file:line at all.
5. **Implementation pages in a format reference.** `foundations/how-the-renderer-reads-it`,
   the edge-cases chapter and parts of round-tripping, tagged-xml and conditional-text
   describe Paged's behaviour; they move to docs.paged.media or become marked
   "In Paged" asides.
6. **Badges.** Support badges still come from the retired state source or are typed
   by hand; they move to the feature registry.
7. **Duplicates.** Merge the two override-resolution pages (into
   master-spreads-overrides) and the two text-variable pages (into
   sections-numbering-variables).

## Missing topics

InDesign's paragraph model; spread coordinates; frames inside frames; the full
`TextFramePreference`; keep options, span columns and lists; composer choice and
OpenType features; drop-cap character styles; table overset and cell fill tint;
`<Tint>` swatches and the `FillTint="-1"` sentinel; an effects & transparency chapter;
colour management; save-back and the `.paged` container; table of contents; what a
writer must include for InDesign to open a file (InDesign as the oracle, ADR 120).

## Engine findings raised by the audit

Not documentation work; reported to the engine:

- Gradient direction: InDesign draws `GradientFillAngle="90"` with the first stop at the
  bottom (the angle turns counter-clockwise from left-to-right). Paged draws it top-down,
  and `cookbook/apply-a-gradient` describes Paged's direction. Found by the InDesign
  verification of `examples/gradient-fill` (ADR 806, worst-page mean ΔE 4.0).
- Gradient `Midpoint` is applied to the blend after its stop; InDesign's files put
  non-default midpoints on later stops (usually the last), so it governs the blend before.
- `FillTint` on a process colour previews too light (blended in linear RGB, not through
  the profile); InDesign renders a 40 % `<Tint>` and `FillTint="40"` identically
  (`examples/named-tint`).
- Opacity and effects in `Fill`/`Stroke`/`ContentTransparencySetting` are applied to the
  whole object; graphic-line opacity and blend mode, `IsolateBlending`, `KnockoutGroup`,
  `GradientFillStart` (linear) and `AnchorSpaceAbove` are not read or applied.
- Placement the importer does not read (found from the census during wave 2):
  `ColorGroup` (InDesign writes it in the design map with `ColorGroupSwatch` children),
  `NumberingList` (design map), `DocumentPreference` / `FootnoteOption` / `GridPreference`
  (`Preferences.xml`), stroke styles such as `DashedStrokeStyle` (`Graphic.xml`); the
  importer looks for each in another part. `Ink`, `MixedInk` and `StrokeStyle` are not read.
  Vertical writing is read from `Story@StoryDirection`; InDesign writes `StoryPreference`
  `StoryOrientation`.
- Nested styles: InDesign writes `<Properties><AllNestedStyles>`; the importer reads only a
  `<NestedStyle>` element InDesign does not write.
- Paragraph styles: `Ligatures`, `KerningMethod` and the `OTF…` attributes are not read on
  `ParagraphStyle` (InDesign writes them there).
- `<BasedOn type="string">$ID/[No paragraph style]</BasedOn>` (InDesign's form for the
  built-in roots) is stored without its `ParagraphStyle/` prefix, so the chain stops a step
  early.
- A table sharing a `CharacterStyleRange` with the text around it is drawn after the
  following paragraph.
- Cell `FirstBaselineOffset` is parsed but not applied.
- `paged-inspect` counts a forced line break (U+2028) as a paragraph; InDesign counts 3
  paragraphs in `examples/paragraph-marks`, the inspector 4. The rendering agrees with
  InDesign.
- `examples/object-style` differs from InDesign's rendering by a mean ΔE of 2.1.
- Bold from a character style: `examples/local-override` asks for Open Sans Bold, and
  InDesign's PDF contains only Open Sans Regular. Check what InDesign substitutes before
  documenting how `FontStyle` resolves.

- `KerningMethod` values arrive as `$ID/None` / `$ID/Optical`; the renderer matches
  only `None` / `Optical`, so text InDesign set to no kerning is drawn kerned.
- `CenterJustified` and `RightJustified` paragraphs are set ragged, not justified.
- Conditional text, MEASURED (InDesign 20.0.1, `examples/conditional-two-conditions`): a
  run carrying several conditions prints while ANY of them is visible. Paged hides it when
  any is hidden (wrong rule). Observed too: straight after opening that minimal file,
  InDesign composed it with the hidden condition showing, until a condition's visibility
  changed.
- Table of contents: Paged reads `AppliedTOCStyle` only on `TextFrame`; InDesign writes it
  on `Story` (91 documents), so InDesign's TOCs are never regenerated. TOC styles sit
  directly under `idPkg:Styles` in InDesign's files, not in a `RootTOCStyleGroup`.
- Condition sets: the importer ignores each `VisibilityPair`'s `Visibility`.
- Bookmarks: nothing writes a PDF outline, although the registry lists bookmarks as shipped.


## Group A — detail

Audited against core **v0.71.1** (`paged-media/core`, `6adb3b7`), plugin-publish
(`paged-media/plugin-publish`, `bd2d7c9`), and the feature registry. Doc line
numbers come from `cat -n` of each `.mdx`. "PP" means `plugin-publish`,
"core" means `core`. The Adobe specification was not consulted (clean-room).

### Facts that make many pages stale

1. **The IDML parser and writer are no longer in core.** ADR 022 (PP
   `docs/adr/022-idml-relocates-to-plugin-publish.md`) renamed `paged-parse` to
   `idml-import` and `paged-write` to `idml-export`, and moved both to plugin-publish.
   `Document::open` is now `idml_import::import_idml` (PP
   `crates/idml-import/src/lib.rs:177`). Core has no `paged-parse` crate (`core/crates/`).
   On load, the native model part `paged/core/model/document.pgm` wins over the IDML
   parts (core ADR 118). Every "`core/crates/paged-parse`" or "`paged-scene` via
   `Document::open`" claim is wrong.
2. **Page items sit in spread coordinates, not page coordinates.** Items are children
   of `<Spread>`. Each `<Page>` is placed by its own `ItemTransform`. The spine is at
   x = 0, and real exports also put the spread origin halfway down the page (test
   `page_carries_item_transform_for_multi_page_spreads`, PP
   `idml-import/src/spread.rs:4304-4330`, pages at `-612 -396` / `0 -396`; generator
   convention in core `paged-gen/src/builders/spread.rs:192-203`). The renderer assigns
   each item to the page that contains its centroid (core `paged-scene/src/lib.rs:825`).
   "Origin = page top-left" holds only inside a page's own bounds.
3. **A missing `ItemTransform` does not mean identity to InDesign.** InDesign 20.0.1
   does not read an absent `ItemTransform` as identity, and its own files spell one on
   every Spread, Page and item. It also needs `PageCount` and `BindingLocation`, or it
   opens a one-page spread as a facing pair with an extra empty page (PP
   `idml-export/src/emit.rs:1105-1119`). Our importer does treat absent as identity.
   The pages present that reading as a fact of the format.
4. **InDesign-compliance spellings the pages get wrong:**
   - `<Br/>` is the **paragraph mark** (PP `idml-import/src/story.rs:253-258`, `:1548`).
   - A forced line break is a literal **U+2028** inside `<Content>` (`story.rs:1762-1768`).
   - A tab is a literal U+0009. `<Tab/>` is a legacy private spelling, still accepted
     on import (`story.rs:1617`).
   - A named tint is a `<Tint BaseColor=…>` element (PP `idml-import/src/graphic.rs:76-92`).
   - `InsetSpacing` is a typed `<Properties><InsetSpacing type="list">` child. InDesign
     ignores and never writes the attribute form (`spread.rs:679-690`).
   - `<Oval>` is an ellipse only through its four mid-edge anchors (exporter fix
     9ee3c1c).
   - A `<Group>` without `ItemLayer` lands on the document's first layer and takes its
     members with it (PP `idml-export/src/rewrite.rs:2379-2385`).
5. **Features shipped since June:**
   - Group transparency is composited (core `paged-renderer/src/pipeline/build_engine.rs:2282-2294`, `module/group.rs`).
   - Text frames inside groups and paste-into children are lifted (`spread.rs:22-31`, `:760-800`).
   - Master items stamp in document order, and groups are expanded to their members (`build_engine.rs:7983-8020` `master_paint_order`).
   - `ShowMasterItems` is honoured as a spread attribute (`spread.rs:641-650`, `:1109`).
   - `MasterPageTransform` is applied as a full matrix.
   - Spread `ItemTransform` is applied (registry `layout-model.spread-item-transform`).
   - Nested layer groups are supported (registry `layers.nested-groups`).
   - Vertical writing renders (`build_engine.rs:2975`; registry `typography.cjk-vertical-writing`).
   - All five corner options render (registry `frames-paths.corner-options`).
   - Arrowheads are drawn (registry `frames-paths.arrowheads`).
   - Text variables are re-resolved at render (core `paged-renderer/src/pipeline/links.rs:36-42`).
   - `Preferences.xml` is opened (PP `idml-import/src/lib.rs:199-201`).
   - Page-item names are read (ADR 131, `spread.rs:620-623`).
   - Master names are read and renameable (ADR 129).

   The June pages often record the new behaviour in a badge or in the body text while
   the AttrTable rows and FAQs still describe the old behaviour. **Many pages now
   contradict themselves.**

### Summary table

| Path | Tier / Diátaxis | Verdict | Inline ```xml | Implementation-voiced? |
|---|---|---|---|---|
| overview.mdx | beginner / explanation | fix | no | partly |
| foundations/index.mdx | beginner / explanation | fix | no | no |
| foundations/what-is-paged-media.mdx | beginner / explanation | current | no | no |
| foundations/what-is-idml.mdx | beginner / explanation | fix (voice) | no | partly |
| foundations/binary-to-xml-lineage.mdx | beginner / explanation | fix | no | yes (§What we read first) |
| foundations/why-a-package.mdx | beginner / explanation | current | no | no |
| foundations/read-one-by-hand.mdx | beginner / tutorial | fix (minor) | no | no |
| foundations/how-the-renderer-reads-it.mdx | intermediate / explanation | rewrite + move to Paged engine docs | no | **yes, entirely** |
| package-anatomy/index.mdx | beginner / explanation | fix (minor) | no | slightly |
| package-anatomy/zip-container.mdx | beginner / explanation | fix (minor) | no | slightly |
| package-anatomy/the-design-map.mdx | intermediate / reference | fix | no | partly |
| package-anatomy/resource-parts.mdx | intermediate / reference | rewrite (format-first) | no | yes |
| package-anatomy/content-parts.mdx | intermediate / reference | fix | no | partly |
| package-anatomy/how-parts-reference.mdx | intermediate / explanation | fix (minor) | no | partly |
| geometry-coordinates/index.mdx | intermediate / explanation | fix | no | slightly |
| geometry-coordinates/units-and-origin.mdx | beginner / explanation | **rewrite** (origin is wrong) | no | partly |
| geometry-coordinates/geometric-bounds.mdx | intermediate / reference | fix (minor) | no | slightly |
| geometry-coordinates/item-transform.mdx | intermediate / reference | fix | no | slightly |
| geometry-coordinates/path-geometry.mdx | pro / reference | fix (minor) | **yes** (L26) | slightly |
| geometry-coordinates/compound-paths.mdx | pro / explanation | fix (voice) | no | yes (§Why boundaries) |
| layout-model/index.mdx | intermediate / explanation | fix (minor) | no | no |
| layout-model/spreads-and-pages.mdx | intermediate / reference | fix (table rows contradict body) | no | partly |
| layout-model/page-items-and-stacking.mdx | intermediate / explanation | fix | no | partly |
| layout-model/master-spreads.mdx | intermediate / reference | merge / trim (overlaps MSO stamping) | no | partly |
| layout-model/override-resolution.mdx | pro / explanation | **merge** into MSO/override-resolution, then delete | no | partly |
| master-spreads-overrides/index.mdx | intermediate / explanation | fix (minor) | no | slightly |
| master-spreads-overrides/master-items-and-stamping.mdx | pro / reference | rewrite | no | **yes** (stamping pass = renderer internals) |
| master-spreads-overrides/override-resolution.mdx | pro / explanation | rewrite (absorb the layout-model twin) | no | yes |
| frames-paths/index.mdx | intermediate / explanation | fix | no | slightly |
| frames-paths/page-item-types.mdx | pro / reference | fix (several stale rows) | no | partly |
| frames-paths/text-frames.mdx | intermediate / reference | fix (**wrong XML**) | **yes** (L26) | partly |
| frames-paths/groups.mdx | intermediate / explanation | rewrite | no | yes (cites spread.rs lines) |
| layers/index.mdx | beginner / explanation | fix (minor) | no | slightly |
| layers/the-layer-model.mdx | intermediate / reference | fix | no | partly |
| layers/visibility-and-printing.mdx | intermediate / explanation | fix (self-contradiction) | no | yes |
| glossary/index.mdx | beginner / reference | fix + split renderer terms out | no | yes (renderer terms) |
| meta/clean-room-protocol.mdx | beginner / explanation | fix | no | n/a |
| meta/style-guide.mdx | beginner / explanation | fix (minor) | no | n/a |

Only two pages carry inline ```xml blocks: `geometry-coordinates/path-geometry.mdx:26`
(correct) and `frames-paths/text-frames.mdx:26` (wrong `InsetSpacing` spelling). Everything
else uses `<ExampleEmbed>`.

### Per-page findings

#### overview.mdx — fix
- **Stale or wrong:**
  - L20-23 and L46-50 define the reference as being "for the IDML file format and the
    open-source Paged renderer" (L47-48). With the split to idml.paged.media, the scope
    should be the format only, with Paged as the reference implementation.
  - L49 says pages are written "from how our own parser behaves". Core ADR 120 makes
    **InDesign's own output** the oracle, so state that examples are checked against
    the renderer **and** behaviour is measured against InDesign (paged-gen authors,
    InDesign exports, a diff gates).
- **Missing:**
  - The description promises to explain "how its examples are validated against a
    working renderer", but the body never does. Needed: the `core.pin`, the examples
    gate, and an explanation of the SupportBadge legend (supported / parsed-not-rendered /
    not-yet-parsed).
  - The new chapters are not listed.
  - A note that IDML import/export lives in an adapter.
- **Badges:** none.

#### foundations/index.mdx — fix
- **Stale or wrong:** the L24-32 list omits `what-is-paged-media`, which `meta.json`
  orders first.
- **Missing:** nothing else.

#### foundations/what-is-paged-media.mdx — current
- **Stale or wrong:** nothing found. Generic and correct.
- **Missing:** optionally, one line linking to automatic page growth (registry
  `layout-model.page-growth`) as the paged-media answer to "content must break".

#### foundations/what-is-idml.mdx — fix (voice)
- **Stale or wrong:**
  - L54-57 ("what our renderer actually has to *do* with it… this entire reference is
    quietly about") contradicts the neutral, format-first framing the split needs.
  - L61-64 is editorialising ("a real pleasure to build a renderer against").
- **Missing:**
  - IDML's companion formats (ICML/IDMS) in one line.
  - The fact that a `.paged` file is itself a valid IDML package (core ADR 118). Link
    it, but keep it in the Paged docs.

#### foundations/binary-to-xml-lineage.mdx — fix
- **Stale or wrong:**
  - L55-56 says the container open is in "`core/crates/paged-parse`". It is now
    `idml_import::open_source_archive` (PP `idml-import/src/lib.rs:112-150`).
  - L62 says "`Document::open` (`core/crates/paged-scene`)". Now `import_idml` (PP
    `lib.rs:177-197`, "moved out of `paged-scene` (N9)").
  - L86-87 says "Our reader honors that by capturing the resolved result faithfully
    rather than recomputing it". The renderer re-resolves every variable kind (core
    `paged-renderer/src/pipeline/links.rs:36-42`), so this contradicts
    how-the-renderer-reads-it L72-78.
- **Voice:** the whole §"What we read first" (L53-67) is implementation material. Move
  it to Paged's parser-internals page, or make it generic ("a reader identifies the
  package, then reads the manifest").
- **Missing:** nothing else.

#### foundations/why-a-package.mdx — current
- **Stale or wrong:** nothing found.
- **Missing:** optionally, that private parts can ride unreferenced by `designmap.xml`
  (the EPUB/ODF idiom InDesign ignores; ADR 118). This is a real format property.

#### foundations/read-one-by-hand.mdx — fix (minor)
- **Stale or wrong:** L32-36 and L55-59 describe the PSR → CSR → Content nesting but
  never mention the paragraph mark. Readers editing by hand will produce
  one-PSR-per-paragraph files that InDesign merges.
- **Missing:**
  - `<Br/>` ends every paragraph except the last.
  - A literal U+2028 is a forced line break; a literal tab is U+0009.
  - Entity escaping in `<Content>`.

#### foundations/how-the-renderer-reads-it.mdx — rewrite and move
- **Stale or wrong:**
  - L28-38 says `paged-parse` owns open and parse. Wrong: `idml-import` lives in
    plugin-publish and is linked into the engine wasm at a pinned revision (PP ADR 651,
    core ADR 118).
  - L42-43 says "`paged-scene` assembles… via `Document::open`". Wrong: the importer
    builds the `paged_scene::Document` (PP `idml-import/src/lib.rs:192-307`).
  - L59-66 omits load from the native `document.pgm`, the `paged-model` crate,
    whole-document build (core ADR 107), flow and page growth (`paged-flow`, ADRs
    026-028), and the WebGPU/Vello versus CPU rasterisers (ADR 100).
  - L98-103 (FAQ) says "live per-page recomputation is still a future task". This
    contradicts the page's own badge at L78 and the code (`links.rs:36-42`).
- **Badges:** L78 `supported` is correct per the code. The registry row
  `sections-numbering-variables.text-variables` still says dates and running headers
  keep `ResultText`; that row is the stale one.
- **Voice:** the page is entirely about Paged's implementation. It belongs under
  `/docs/paged/engine/`. The IDML reference should keep one neutral paragraph ("what a
  consumer must do: open, resolve references, cascade styles, thread stories, compose")
  and link to it.

#### package-anatomy/index.mdx — fix (minor)
- **Stale or wrong:**
  - L34-38 lists the contents as `designmap.xml`, Resources, content folders, mimetype
    and META-INF. It omits the `XML/` folder (`BackingStory.xml`, `Tags.xml`,
    `Mapping.xml`) and `META-INF/metadata.xml`.
  - L17 and L47-48 say the order is "the order our parser meets each part". The actual
    order is the designmap, then Preferences, Graphic, Styles, masters, spreads,
    stories (PP `lib.rs:197-256`). Either drop the claim or make it generic.
- **Missing:** unreferenced private parts (ADR 118).

#### package-anatomy/zip-container.mdx — fix (minor)
- **Stale or wrong:** L24-25 and L47-48 say "Our renderer checks this entry". The
  importer checks only that the entry is present and its content is exact (PP
  `lib.rs:127-137`). It does not verify that the entry is first or stored. State what
  is checked.
- **Missing:**
  - `META-INF/metadata.xml`.
  - What a writer must do: mimetype first and stored. The exporter does this (ADR 118).
  - A link to the `.paged` container: same mimetype, `paged/` prefix and
    `manifest.json`, kept in the Paged docs.

#### package-anatomy/the-design-map.mdx — fix
- **Stale or wrong:**
  - L59 (`idPkg:Fonts`, `parsed-not-rendered`) contradicts resource-parts L109
    (`not-yet-parsed`). The importer never opens `Fonts.xml`. The exporter writes and
    rewrites it, because InDesign needs every applied face declared (PP
    `idml-export/src/fonts.rs:15-60`).
  - L61 (`idPkg:Preferences`, `not-yet-parsed`) is stale: `ChapterNumberPreference`
    is read (PP `lib.rs:199-201`; `designmap.rs:548-590`).
  - L52-53 says the parser "resolves the rest lazily". Not true: Graphic, Styles and
    Preferences are opened by fixed path, and masters, spreads and stories eagerly (PP
    `lib.rs:197-256`).
- **Missing:**
  - The designmap's own non-reference children, which the importer now reads (PP
    `designmap.rs:109-126`, `:144-160`, `:203-222`): `<Layer>` (nested), `<Section>`,
    `<TextVariable>`, `<Hyperlink*>`, `<Bookmark>`, `<DocumentPreference>`,
    `<FootnoteOption>`, and `<Condition>`/`<ConditionSet>`. InDesign writes conditions
    **in designmap.xml**, not Styles.xml (`lib.rs:211-218`).
  - The `<?aid?>` processing instruction.
  - `idPkg:Tags` and `idPkg:Mapping`.
  - Colour-settings attributes (`SolidColorIntent` etc., `designmap.rs:136-141`).

#### package-anatomy/resource-parts.mdx — rewrite (format-first)
- **Stale or wrong:**
  - L21-26 says "`Fonts.xml` and `Preferences.xml` are not opened at all today".
    Preferences is opened (`lib.rs:199`).
  - L48 presents `TintValue` as a `<Color>` attribute. A named tint is a separate
    `<Tint BaseColor=… TintValue=…>` element (PP `graphic.rs:76-92`). Writing
    `TintValue` on `<Color>` was a private convention InDesign discards.
  - L94 says Condition/ConditionSet live in Styles.xml. InDesign writes them in
    designmap.xml (`lib.rs:211-218`).
  - L106-109: "informational and currently unread" is true for import. But InDesign
    **requires** `Fonts.xml` declarations (`idml-export/src/fonts.rs`), so calling the
    part "informational" is wrong as a statement about the format.
  - L113-118 says Preferences "read past, not acted on". `ChapterNumberPreference` is
    acted on. `TextPreference`, `TextDefault` and `[Normal Text Frame]` defaults
    (e.g. `AutoSizingReferencePoint=CenterPoint`) matter to InDesign (PP
    `idml-export/src/preferences.rs:1-30`).
- **Badges:**
  - L109 `not-yet-parsed` (Fonts.xml) is OK for import but should say why the part
    matters.
  - L118 `not-yet-parsed` (Preferences.xml) is wrong: partially parsed.
  - L65 (`feature=package-anatomy.graphic-part`) resolves to shipped; OK.
- **Missing:**
  - The `<Tint>`, `<MixedInk>`/`<Ink>` and `<StrokeStyle>` swatch kinds.
  - The ColorGroup member list (`ColorGroupSwatches`, `graphic.rs:254-270`).
  - Which preference elements matter to InDesign on open.
  - The L92 TOC row: check against the TOC chapter.
- **Voice:** "how much of it our parser reads today" (L18-19) frames the page around
  the implementation.

#### package-anatomy/content-parts.mdx — fix
- **Stale or wrong:**
  - **L94:** "A sibling `<Br/>` is a forced line break within the paragraph; a new
    `<ParagraphStyleRange>` starts a new paragraph". **Wrong on both counts.** `<Br/>`
    is the paragraph mark, and a PSR is a style run over one or more paragraphs (PP
    `story.rs:253-258`, `:1548`). A forced line break is U+2028 in `<Content>`
    (`story.rs:1762-1768`).
  - L64-66 says "A text frame nested inside a `<Group>` is currently skipped". Stale:
    such frames are lifted with composed transforms, and paste-into children are lifted
    too (`spread.rs:22-31`). Only a Group pasted into a container is still counted
    (`spread.rs:1030-1039`).
  - L45 and L57: "Absent ⇒ identity". Describe this as the importer's reading, not
    InDesign's (`idml-export/src/emit.rs:1112-1115`).
  - L95 (`StoryDirection`, `parsed-not-rendered`): vertical writing renders
    (`build_engine.rs:2975`; registry `typography.cjk-vertical-writing` shipped).
- **Badges:** L66 `parsed-not-rendered` is wrong; should be `supported`, with a
  residual note about a pasted-in group.
- **Missing:**
  - `<Properties><Label>` (page and item labels; ADR 129 page metadata).
  - Item `Name` (ADR 131).
  - Element-level `Visible`/`Locked` on page items (`spread.rs:350-413`).
  - `PreviousTextFrame`.
  - The `<Page>` children `<MarginPreference>` and guides.

#### package-anatomy/how-parts-reference.mdx — fix (minor)
- **Stale or wrong:**
  - L31-34: the fixed-path resource list should include `Preferences.xml`
    (`lib.rs:199`).
  - L67-72 frames the `BasedOn` walk as run → character style → paragraph style. That
    mixes the style-application cascade with the `BasedOn` chain; separate the two.
  - L45-47 ("following a `Swatch` indirection one level"): add `<Tint>` → `BaseColor`
    resolution (`graphic.rs:80-92`).
- **Missing:**
  - Hyperlink/text-anchor destinations resolved from story markers (`lib.rs:243-260`).
  - `ItemLayer` → `Layer`.
  - `AppliedObjectStyle` → ObjectStyle.

#### geometry-coordinates/index.mdx — fix
- **Stale or wrong:**
  - L15-17 and L33-37: "origin sits at the page's top-left… ItemTransform slides [it]
    onto the page". Items map into **spread** space (key fact 2).
  - L65-68 ("same orientation throughout… only the origin shifts between a page's
    space and an item's own inner space") omits spread space entirely.
- **Missing:**
  - A three-space model (item inner → parent: group, spread or host frame → spread;
    page inner → spread).
  - Image content transform (registry `geometry-coordinates.image-content-transform`).

#### geometry-coordinates/units-and-origin.mdx — rewrite
- **Stale or wrong:**
  - L16-17, L34, L80-83 say "The origin `(0, 0)` of a page is its top-left corner".
    True only for a page's own `GeometricBounds`. Item coordinates are spread
    coordinates, with the origin at the spine (and, in InDesign's own exports,
    half-way down the page) (`spread.rs:4304-4330`; `paged-gen/src/builders/spread.rs:192-203`).
  - L63-71 ("ItemTransform places that whole little space onto the page") has the same
    error.
- **Missing:**
  - Spread space and pasteboard.
  - Facing-page geometry (verso at negative x).
  - How a consumer assigns an item to a page (centroid; `paged-scene/src/lib.rs:825`).

#### geometry-coordinates/geometric-bounds.mdx — fix (minor)
- **Stale or wrong:**
  - L81-84 ("the item's ItemTransform maps that space onto the page") should say the
    parent space.
  - L64-69 is correct (derive bounds from the path). Add that InDesign's own exports
    serialise the path almost exclusively (`spread.rs:117-121`).
- **Missing:** nothing else significant.

#### geometry-coordinates/item-transform.mdx — fix
- **Stale or wrong:**
  - L15 says "into its parent's space: the page, an enclosing `Group`, or the spread".
    Items are never children of `<Page>`. The parent space is the spread, a group, or
    a host frame for paste-into children, which IDML serialises relative to the parent
    item (`spread.rs:760-766`).
  - L29-31 and L110-112 ("treated as absent (identity)") describe the importer's
    behaviour (`spread.rs:2893-2901`). InDesign does not treat absent as identity
    (`emit.rs:1112-1115`). Writers must always spell it.
  - L63 (Spread/MasterSpread row, `parsed-not-rendered`, "Per-page rendering does not
    need it") is stale. The translation cancels per page and rotation/scale are applied
    (registry `layout-model.spread-item-transform`, shipped).
- **Badges:** the L63 row status is wrong.
- **Missing:**
  - The `<Image>` inner `ItemTransform` (content transform).
  - Paste-into nesting.
  - Precision: the f32 round-trip defect class (PP
    `idml-export/tests/item_transform_precision.rs`).

#### geometry-coordinates/path-geometry.mdx — fix (minor)
- **Stale or wrong:**
  - L99-116: the CornerOption table says "all five corner options"; matches registry
    `frames-paths.corner-options`. OK.
  - L118-120 ("decorative *path* and *stroke* treatments… are not generated either")
    contradicts shipped dashed, striped and wavy strokes (registry
    `frames-paths.stroke-striped-wavy`).
- **Inline XML:** the L26 block is correct.
- **Missing:**
  - How an `<Oval>`'s path is spelled (four mid-edge anchors with κ·r handles). The
    exporter and generator both had to be fixed for InDesign.
  - `PathPointType` handles on ovals.
  - Text-on-path (`<TextPath>`, registry `frames-paths.text-on-path`).

#### geometry-coordinates/compound-paths.mdx — fix (voice)
- **Stale or wrong:** nothing found on substance.
- **Voice:** §"Why contour boundaries have to be recorded" (L44-62) and FAQ L88-93 are
  parser internals (subpath offsets). Recast as a consumer requirement ("each
  `GeometryPathType` must be closed independently").
- **Missing:** nonzero vs even-odd (does InDesign ever write even-odd?), and
  Pathfinder output.

#### layout-model/index.mdx — fix (minor)
- **Stale or wrong:** L27-30: "The geometry of every frame is expressed relative to a
  page" is wrong. Frames are expressed relative to the spread (key fact 2).
- **Missing:**
  - Page growth / generated pages (registry `layout-model.page-growth`).
  - Guides and margins.

#### layout-model/spreads-and-pages.mdx — fix
- **Stale or wrong:**
  - L22-26 and L32 (Spread `ItemTransform` row, `parsed-not-rendered`, "not yet
    applied") contradict the page's own L41-45 and registry (shipped).
  - L33-34 (`PageCount`/`BindingLocation`, `not-yet-parsed`): fine for the importer,
    but the exporter must write both or InDesign adds an empty page
    (`emit.rs:1105-1111`). Document that as format behaviour.
  - L36 (`ShowMasterItems`, `parsed-not-rendered`, "stamps regardless") is stale. It
    is honoured, and it is a **spread** attribute; InDesign ignores it on `<Page>`
    (`spread.rs:641-650`).
  - L59 ("Absent ⇒ identity, so the page sits at the spread origin") does not match
    InDesign (`emit.rs:1112`).
  - L61 (`MasterPageTransform`, `parsed-not-rendered`, "only the offset is currently
    used") contradicts layout-model/override-resolution L43-47 and
    master-items-and-stamping L136-140 (full matrix applied).
  - L71-75 says "the right page sits at the spread origin". In InDesign's own files,
    pages are also offset by −H/2 vertically (`spread.rs:4317-4320`).
- **Badges:**
  - L45 `feature=` resolves to shipped; OK.
  - L87 `supported` (section numbering); OK.
  - The AttrTable `support` values on L32, L36 and L61 are wrong.
- **Missing:**
  - `<MarginPreference>` and `<Guide>` children.
  - Page `Properties/Label` metadata (ADR 129).
  - `PageColor` on master pages.

#### layout-model/page-items-and-stacking.mdx — fix
- **Stale or wrong:**
  - L22-23 ("sorted into one vector per shape type") is an implementation detail;
    `frames_in_order` is what drives z-order.
  - L54-57 says layer groups are flattened. Stale: they nest (registry
    `layers.nested-groups` shipped; PP `designmap.rs:44-46`, `:203-222`).
  - L60-67 (nested text frames "counted as skipped") is stale (`spread.rs:22-31`).
- **Badges:** L57 `parsed-not-rendered` is wrong; L67 `parsed-not-rendered` is wrong.
  Both should be `supported`.
- **Missing:**
  - Cross-layer order direction: the designmap lists layers bottom to top
    (`build_engine.rs:1512-1523`).
  - Group members follow the group's layer (`rewrite.rs:2379-2385`).
  - Paste-into (nested children clipped by the host).

#### layout-model/master-spreads.mdx — merge / trim
- **Stale or wrong:**
  - L51-53 (Name/NamePrefix/BaseName, "informational"): `Name` is read (core ADR 129,
    `ParsedMasterSpread::name`; PP `lib.rs:290-305`), renameable, and written as the
    three-way split (PP `idml-export/src/emit.rs:1125-1140`).
  - L54 (MasterSpread `ItemTransform`, `parsed-not-rendered`) is stale (applied).
  - **L112-114 (FAQ) says `ShowMasterItems` is not honoured.** This contradicts the
    page's own L80-84 and the code.
- **Badges:** L84 `supported`; OK.
- **Missing:**
  - Masters based on masters (`AppliedMaster` on a master page).
  - Master editing and creation are Paged ops (ADR 129); link them, not the format.
- **Recommendation:** fold into master-spreads-overrides as its intro section, or
  reduce to a 1-screen concept page with no AttrTable. The MasterSpread AttrTable is
  duplicated at master-items-and-stamping L114-126.

#### layout-model/override-resolution.mdx — merge
See the duplicate-pair section below.
- **Stale or wrong:** L61 says "the page reports exactly two frames". Fine.
- **Badges:**
  - L73 (`parsed-not-rendered`, "partially tested") misuses the status; registry
    `master-spreads-overrides.override-resolution` is shipped.
  - L79 (`OverriddenPageItemProps`, `not-yet-parsed`) is still true (no hit in PP
    `idml-import`).

#### master-spreads-overrides/index.mdx — fix (minor)
- **Stale or wrong:**
  - L62-64 ("the `MasterPageTransform` offset") should be "matrix".
  - L72: "(clean-room §6.1)" is an internal reference. Drop it in a public page.
- **Missing:** nothing else.

#### master-spreads-overrides/master-items-and-stamping.mdx — rewrite
- **Stale or wrong:**
  - L66-82 ("stamped per shape type… not in document order") is stale.
    `master_paint_order` walks `frames_in_order` with groups expanded depth-first, and
    uses kind-by-kind order only for unreached items (`build_engine.rs:7983-8020`).
  - L83-87 ("A `Group` on the master is not stamped… no group arm") is stale for the
    same reason: members reach the page. Check whether group transparency is
    bracketed on stamped masters before you claim it is.
  - L101 (`MasterPageTransform` row, "Only the translation is added") contradicts
    L136-140 on the same page.
  - L118-119 (MasterSpread `ItemTransform` and `ShowMasterItems`, "Not honored") is
    stale.
  - L144-148 says `ShowMasterItems` is consulted "on both the body Spread and the
    MasterSpread". The body spread's value is what governs; the importer folds the
    spread flag into each page (`spread.rs:1109-1111`).
  - L151-154 should explain why the master's own `false` has no effect.
  - L194-197 (FAQ: "`ShowMasterItems` is parsed but not honored") contradicts L142-149.
  - L200-203 (FAQ: groups not stamped) is stale.
- **Badges:**
  - L82 `parsed-not-rendered` is wrong (now document order).
  - L87 `not-yet-parsed` is wrong (groups are stamped as members).
  - L140 and L149 `feature=` resolve to shipped; OK.
- **Missing:**
  - Master text frames whose stories carry page markers, re-flowed per body page
    (`build_engine.rs` `story_prints_page_context`, around :7969).
  - The layer interaction of master items.
  - `OverriddenMasterPageItem` on the promoted body copy: the format's back-link from
    override to master. Our code does not read it; flag it as an open topic.
- **Voice:** the "four steps" (L42-59), with centroid routing and a full-page
  background heuristic, describe Paged's algorithm. The format part is only:
  - `AppliedMaster` selects the master;
  - the body page takes from the master page at the same ordinal;
  - `MasterPageTransform` maps the master page onto the body page;
  - master items paint behind page items.

#### master-spreads-overrides/override-resolution.mdx — rewrite
- **Stale or wrong:**
  - L139-141 ("`ShowMasterItems` flag is not honored") is stale.
  - L58-63 ("across all five shape types") is now `frames_in_order` and group-aware.
  - L83-92 (`AllowOverrides` not read) is still true; no hit in PP `idml-import`.
  - L96-101 (`OverriddenPageItemProps` not read) is still true.
- **Badges:**
  - L92 and L101 `not-yet-parsed`; OK.
  - L110 `feature=…override-resolution` resolves to shipped, but the note says
    "partially tested". Reconcile: either downgrade the registry claim or drop the
    caveat.
- **Missing:** `OverriddenMasterPageItem` (see above); detached versus overridden items.

#### frames-paths/index.mdx — fix
- **Stale or wrong:**
  - L48 (Group, `parsed-not-rendered`) is stale. Group transparency is composited
    (`build_engine.rs:2282-2294`; `module/group.rs`). Cockpit
    `effects-transparency.transparency-groups` is shipped for the renderer, partial
    elsewhere.
  - L15-16: page items are direct children of a Spread, and also of a Group or a host
    frame (paste-into).
  - L16 links "Spread" to the-design-map; it should link to spreads-and-pages.
  - L66-73 ("ItemTransform that places it on the page"): in the parent space.
- **Missing:**
  - Paste-into (nested content) (registry `frames-paths.nested-content`).
  - Element `Visible`/`Locked`/`Name`.
  - `<TextPath>`.
  - Placed images (cross-link).

#### frames-paths/page-item-types.mdx — fix
- **Stale or wrong:**
  - L37 ("Affine placement onto the page") should say the parent space.
  - L40 (`FillTint` "-1 inherits"): add that −1 is InDesign's unset sentinel and that a
    tint ramps in Lab for Lab spots (tint-sentinel round-trip test, PP
    `idml-export/tests/tint_sentinel_roundtrip.rs`).
  - L43 (`StrokeType`: "custom StrokeStyle defs fall back to solid") contradicts
    resource-parts L93 and registry (dashed, dotted, striped and wavy shipped).
  - L78 (`CornerOption`, `parsed-not-rendered`, "drawn as Rounded for now") is stale
    (registry `frames-paths.corner-options`: all five emit geometry).
  - L79 (`StrokeAlignment` "approximated"): registry says rectangles are supported, while
    polygons and open paths stay centred. Say that.
  - L87-89 and L163-166: "Oval… ellipse *inscribed* in the path's bounding box" is a
    renderer shortcut. In the format, an `<Oval>` is an ellipse **through its path**
    (four mid-edge anchors). A four-corner `<Oval>` path draws as a rectangle in
    InDesign (exporter fix 9ee3c1c).
  - L103-105 (GraphicLine "endpoints are the top-left and bottom-right corners of the
    path's bounding box"): a GraphicLine is a two-anchor open path, which can be
    curved. The bbox-corner reading is wrong for any line drawn right-to-left or
    bottom-to-top.
  - **L168-172 (FAQ)**: corner options "drawn as Rounded" and arrowheads "not yet
    drawn" contradict L117 and registry.
- **Badges:**
  - The L78 AttrTable status should be `supported`.
  - L117 `feature=frames-paths.arrowheads` is shipped with calibration pending; OK.
- **Missing:**
  - Element-level `Visible`, `Locked`, `Name`.
  - `LeftLineEnd`/`RightLineEnd` and `*ArrowHeadScale` (`spread.rs:440-460`).
  - `GradientFillStart`/`Length` (ADR 129 radial fix).
  - `StrokeTint`, gap colour, overprint (registry rows).
  - Effects settings (pointer to the effects chapter: Size = band width, Choke/Spread
    as fractions, Angle = light direction; core ADR 104).

#### frames-paths/text-frames.mdx — fix (wrong XML)
- **Stale or wrong:**
  - **L31-36 (inline XML) and L46-57**: `InsetSpacing="6 8 10 12"` as an attribute is
    the private spelling InDesign **ignores and never writes**. The format spells it as
    `<TextFramePreference><Properties><InsetSpacing type="list"><ListItem
    type="unit">…` (or a `type="unit"` scalar) (PP `idml-import/src/spread.rs:679-690`).
    Fix the XML block and the table.
  - L94-111 says AutoSizingType "lets a frame's bounds grow". InDesign auto-sizing is a
    **fit**: it shrinks as well as grows; `WidthOnly` keeps a fixed line budget; the
    default reference point is CenterPoint (core `paged-renderer/src/pipeline/auto_size.rs`;
    PP `preferences.rs`). Rows L104-107 describe the old estimate ("estimates the longest
    line"); proportional sizing is not "as HeightAndWidth".
  - **L145-149 (FAQ)** says height growth is "still on the roadmap". This contradicts
    L105 and the badge at L111.
  - L123-129 says the generated `<AttrTable element="TextFrame" />` "grows with the
    renderer". The catalog `TextFrame` element lists only 7 attributes (core
    `paged-introspect/catalog.json`), none from `TextFramePreference`, so the table
    undersells it.
- **Badges:** the L111 note's "remaining piece" may itself be stale. Check
  `auto_size.rs` (fit via probe + bisection) before keeping the caveat.
- **Missing:**
  - `TextColumnCount`, `TextColumnGutter`, `TextColumnFixedWidth`, `UseFixedColumnWidth`
    (registry `layout-model.text-columns`).
  - `VerticalBalanceColumns`, which levels the **line count**.
  - `AutoSizingReferencePoint`, `MinimumHeightForAutoSizing`, `IgnoreWrap`,
    `VerticalThreshold`.
  - Text in non-rectangular frames (the inset erodes the outline).

#### frames-paths/groups.mdx — rewrite
- **Stale or wrong:**
  - L52-79 (group transparency "parsed-not-rendered… still on the roadmap") is stale
    (`build_engine.rs:2282-2294`, `module/group.rs`).
  - L79 cites "spread.rs:207–224" and L84 cites "spread.rs:116–119". These are dead
    line references into a renamed, moved crate.
  - L81-86: `skipped_nested_frames` is now non-zero only for a Group pasted into a
    container (`spread.rs:1030-1039`).
  - L102-106 (FAQ) is stale.
- **Badges:** L79 `parsed-not-rendered` is wrong; should be `supported` (renderer).
- **Missing:**
  - Group layer semantics (members follow the group's `ItemLayer`; a group without one
    lands on the first layer).
  - Group-level effects beyond opacity, blend and shadow.
- **Voice:** the "lifted out onto the spread's normal page-item lists" passage
  (L36-48) is parser architecture. Restate it as the format rule (members are child
  elements; their transforms are relative to the group).

#### layers/index.mdx — fix (minor)
- **Stale or wrong:** L16-17 ("the rest are authoring conveniences a renderer can
  ignore") is fine. Add that nested layer groups exist.
- **Missing:** element-level `Visible` on page items, which also hides an item
  independently of its layer (`spread.rs:350-354`).

#### layers/the-layer-model.mdx — fix
- **Stale or wrong:**
  - L49-52 ("The exact top-vs-bottom direction of that key is an internal detail") is
    wrong: it is a format fact. The designmap lists layers bottom to top, so
    `designmap[0]` paints first (`build_engine.rs:1512-1523`).
  - L56-59 and L101-104: group members do not keep their own `ItemLayer` in InDesign;
    they follow the group's layer (`rewrite.rs:2379-2385`).
  - L64 and L68-71: "Absent ⇒ default layer". InDesign places an item (at least a
    group) without `ItemLayer` on the document's **first** layer.
- **Missing:**
  - Nested `<Layer>` elements as the spelling of layer groups (`designmap.rs:44-46`,
    `:203-222`).
  - Other Layer attributes (guides, `IgnoreWrap`, UI colour) as not-modelled.

#### layers/visibility-and-printing.mdx — fix
- **Stale or wrong:**
  - L16-17 ("nested layer folders are flattened") and **L122-127 (FAQ: "No… flattens
    them")** contradict the page's own L78-87 and registry `layers.nested-groups`
    (shipped).
  - L78 heading "Layer folders are flattened" says the opposite of its body.
  - L46-49 ("precomputes a single `visible && printable`"): the current code is
    `build_layer_render_map` (core `build_engine.rs:1050-1058`). It is an
    implementation detail either way.
  - L35-36 and L111-114 (no separate printing pass): still true in the renderer.
    Re-check against PDF export (core ADR 119) before claiming it for export.
- **Badges:**
  - L38 `supported`; OK.
  - L72 (Locked, `parsed-not-rendered`) is acceptable; note it now drives editor
    selection (registry `layers.ops`).
  - L87 `feature=layers.nested-groups`; OK.
- **Missing:** item-level `Visible="false"` and `Locked`.

#### glossary/index.mdx — fix and split
- **Stale or wrong:**
  - L302-305 (`ResultText`: "The renderer inlines that snapshot verbatim; it does not
    recompute") is wrong (`links.rs:36-42`).
  - L34-37 and L355-358: BackingStory and tagged XML are "not read". Still true
    (registry `package-anatomy.tagged-xml-backing-store` planned); OK.
  - L144-146: GraphicLine "an open path" is right, but page-item-types L103-105
    contradicts it.
  - L235-236 (Oval "closed elliptical shape"): add that this holds through its path.
  - L230-233 and L427-432 (overset "our renderer drops the overset lines"): mention
    that a story with a grow rule adds pages instead (registry `layout-model.page-growth`).
  - L240-241 says "items sit on the spread but are read against the pages". Good, and
    consistent with key fact 2. The geometry chapter contradicts it.
  - L374-377 (Tint: "a swatch-level `TintValue` scales the color where it is defined")
    repeats the private `<Color TintValue>` convention.
  - L112, L300, L334, L393, L400, L407: link display text reads "/docs/the-renderer"
    and "/docs/test-corpus" (old paths). The hrefs are newer, but the text is stale.
- **Missing terms:**
  - `<Br/>` (paragraph mark), forced line break (U+2028), tab character (U+0009) vs
    `TabList`/tab stop.
  - `AppliedMaster`, `OverrideList`, `MasterPageTransform`, `ShowMasterItems`.
  - `InsetSpacing`, `TextFramePreference`, `Properties`, `Label`, `ContentType`.
  - `PageCount`/`BindingLocation`, spread space / pasteboard.
  - `Tint` (element), `FillTint` sentinel −1.
  - Paste-into / nested content, `StoryDirection`, `Section`.
  - Effect settings (`DropShadowSetting` and friends), `VerticalBalanceColumns`.
- **Voice:** move the renderer terms (display list, renderer-core, Vello, WebGPU,
  SSIM, ΔE2000, Knuth–Plass "our composer") to a Paged glossary. L434-440 ("written
  from the renderer's point of view") conflicts with the format-first split.

#### meta/clean-room-protocol.mdx — fix
- **Stale or wrong:**
  - L51-60: the sourcing order omits **InDesign as oracle** (core ADR 120: generator
    authors, InDesign exports, diff gates; plus probe scripts). Our own round-trip
    cannot detect interchange bugs; the paragraph mark, tint, tab, InsetSpacing and
    Oval findings came only from InDesign. Observed InDesign output belongs at #2,
    above "observed renderer behavior".
  - L54: the "`examples/`" link points to `/docs/paged/engine/test-corpus`. It should
    point to the docs repo's `examples/` (the CI-validated packages).
  - L64-68: enforcement claims ("rotating senior reviewer", similarity check in CI).
    `.github/workflows/cleanroom.yml` and the PR template exist. The "rotating senior
    reviewer" is a process claim to verify or drop.
- **Missing:** that observation of InDesign is also clean-room (behaviour, not text).

#### meta/style-guide.mdx — fix (minor)
- **Stale or wrong:** the frontmatter description (L3) says "five non-negotiables",
  but the body lists six (L22-35).
- **Missing:**
  - A neutral-voice rule: describe the format; put "Paged does X" in a marked aside or
    a SupportBadge.
  - The rule that AttrTable `support`, SupportBadges and FAQs must agree. Most of the
    contradictions found here are drift between those three.

### Duplicate pairs: merge recommendations

1. **`layout-model/override-resolution.mdx` and `master-spreads-overrides/override-resolution.mdx`.**
   - Same title.
   - Same example (`master-override`).
   - Same "two frames" walkthrough (layout-model L49-65 vs MSO L112-134).
   - Same limits (`AllowOverrides`, `OverriddenPageItemProps`).
   - The MSO page even says it defers its walkthrough to the layout-model page (L20-21,
     L29-31).

   **Merge into `master-spreads-overrides/override-resolution`.** Lead with the
   worked example, then the semantics (removal without a replacement = deletion;
   `AllowOverrides` is a gate the format records; `OverriddenMasterPageItem` on the
   promoted copy; `OverriddenPageItemProps` property-level overrides), then a short
   "support in Paged" box. Delete the layout-model page and add a redirect. In
   layout-model/index, replace the bullet with a one-line link.
2. **`layout-model/master-spreads.mdx` and `master-spreads-overrides/master-items-and-stamping.mdx`.**
   They overlap heavily: the MasterSpread AttrTable is duplicated, and so are
   `ShowMasterItems`, facing-master routing and the two-page-spread example. Keep
   master-spreads as a one-screen concept page in layout-model (no AttrTable), or move
   it into MSO as the chapter's first page. Make master-items-and-stamping the single
   reference.
3. **Minor overlap: `package-anatomy/content-parts.mdx` Page/TextFrame AttrTables and
   `layout-model/spreads-and-pages.mdx` / `frames-paths/page-item-types.mdx`.** The
   Page and TextFrame rows are repeated with diverging support values (content-parts
   L42-60 vs spreads-and-pages L57-63). Keep the tables in the element chapters and
   link to them from content-parts.

### Neutral-voice candidates (about Paged rather than the format)

**Move out or recast entirely:**
- `foundations/how-the-renderer-reads-it` — move out entirely.
- `foundations/binary-to-xml-lineage` §"What we read first".
- `package-anatomy/resource-parts` (framed as "how much our parser reads").
- `master-spreads-overrides/master-items-and-stamping` (the renderer's stamping
  algorithm, centroid routing, background heuristic).
- `master-spreads-overrides/override-resolution` §"What the renderer does not check".
- `frames-paths/groups` (lift-and-compose, `skipped_nested_frames`, line citations).
- `geometry-coordinates/compound-paths` §"Why contour boundaries have to be recorded".
- `layers/visibility-and-printing` (the "precomputes a flag" passage).
- `glossary` renderer terms.

**Lighter edits:**
- `foundations/what-is-idml` L54-57.
- `overview` L46-50.
- Every "our parser…" sentence in package-anatomy and geometry.

The pattern to apply: format fact in the body, Paged behaviour in `SupportBadge` or a
labelled "In Paged" aside.

### Missing topics for these chapters

**Foundations / package**
1. The paragraph model as InDesign writes it: `<Br/>` ends every paragraph except the
   last; a PSR can span many paragraphs; empty PSR + `<Br/>` is a blank paragraph;
   U+2028 forced break; literal U+0009 tab. (Belongs in stories-text too, but must
   appear in read-one-by-hand and content-parts.)
2. Unreferenced private parts and the `.paged` container: valid IDML, `paged/` prefix,
   `manifest.json`, `document.pgm` (ADR 118). Format note in package-anatomy, detail in
   the Paged docs.
3. The designmap's non-reference children: Layers (nested), Sections, TextVariables,
   Hyperlinks/Bookmarks, Conditions (InDesign writes them here), DocumentPreference,
   FootnoteOption, colour settings, the `<?aid?>` PI.
4. What InDesign requires of a written package: `Fonts.xml` declarations, `PageCount`
   and `BindingLocation`, an explicit `ItemTransform` everywhere, relevant
   Preferences.xml defaults. A "writing IDML that InDesign accepts" page, or
   round-tripping cross-links.
5. `META-INF/metadata.xml`, and the `XML/` folder parts (Tags, Mapping, BackingStory).

**Geometry / layout**

6. Spread coordinate space: spine origin, vertical centring in InDesign exports,
   pasteboard, assigning items to a page by centroid.
7. Paste-into / nested content: frames inside frames, transforms relative to the host,
   clipping by the host path.
8. The image content transform (`<Image ItemTransform>`, frame fitting).
9. `<Oval>` path spelling.
10. Margins, columns and guides (`MarginPreference`, `Guide`); page growth and
    generated pages (`FlowGrowRule`).

**Frames**

11. Element-level `Visible`, `Locked`, `Name` and `Properties/Label` metadata on items
    and pages (ADRs 129 and 131).
12. TextFramePreference in full: columns, `VerticalBalanceColumns` (levels line count),
    `AutoSizingReferencePoint` (default CenterPoint), auto-size as fit, `IgnoreWrap`,
    `InsetSpacing` typed spelling, text in non-rectangular frames.
13. Text on a path (`<TextPath>`), and line ends with arrowhead scale.

**Masters and layers**

14. `OverriddenMasterPageItem` (override back-link), masters based on masters, master
    page `PageColor`.
15. Layer order direction (designmap bottom to top), group-member layer inheritance,
    first-layer default, nested `<Layer>` spelling.

**Glossary and meta**

16. Glossary entries for all of the above.
17. Clean-room: InDesign-as-oracle sourcing (ADR 120).
18. Style rule: AttrTable, badge and FAQ must agree.

**Outside these chapters (seen in passing)**

- The docs example `examples/tab-stops` still uses the private `<Tab/>` and
  `<TabStop>` spellings.
- No example in `examples/` uses `<Br/>`, so the CI gate cannot catch the
  paragraph-mark misconception.
- Cockpit `sections-numbering-variables.text-variables` understates what the renderer
  now resolves.

### Summary

1. All 37 pages in group A are audited. 3 are current, 21 need fixes, 9 need rewrites
   (including units-and-origin, resource-parts, both master pages, groups, and
   how-the-renderer-reads-it, which should move to the Paged engine docs), 2 should be
   merged and 1 deleted after a merge. Only path-geometry and text-frames have inline
   ```xml, and text-frames shows the `InsetSpacing` attribute spelling, which InDesign
   ignores.
2. The biggest format errors:
   - `<Br/>` is called a forced line break (content-parts L94). It is the paragraph
     mark; a forced line break is U+2028.
   - The pages claim item coordinates start at the page's top-left. Items are in
     spread space.
   - "Absent ItemTransform ⇒ identity" is presented as fact. InDesign does not read it
     that way.
   - Tints are described as `<Color TintValue>` instead of the `<Tint>` element.
   - Ovals are "inscribed in the bbox".
   - Layer order is called an "internal detail". The designmap lists layers bottom to
     top.
3. Many pages contradict themselves: badges or body text were updated after June, but
   the AttrTable rows and FAQs were not. Examples:
   - `ShowMasterItems` and `MasterPageTransform` (spreads-and-pages, master-spreads,
     master-items-and-stamping).
   - Nested layer groups (visibility-and-printing).
   - Auto-sizing (text-frames).
   - Corner options and arrowheads (page-item-types).
   - Text variables (how-the-renderer-reads-it vs glossary).
4. Shipped since June but still documented as gaps:
   - Group transparency.
   - Grouped and paste-into text frames.
   - Master stamping in document order, including groups.
   - Spread `ItemTransform`.
   - Vertical writing.
   - `Preferences.xml` reading.
   - Master names.

   Every `paged-parse` / `Document::open` crate claim is obsolete: IDML import and
   export moved to plugin-publish as `idml-import` / `idml-export` (ADR 022).
5. Merge the two override-resolution pages into master-spreads-overrides and trim
   layout-model/master-spreads to a short concept page. Move the renderer-internal
   material (stamping algorithm, parser lifting, renderer glossary terms) behind a
   neutral, format-first voice. Add the missing topics: the InDesign paragraph model,
   spread space, paste-into, full TextFramePreference, the `.paged` container note,
   InDesign-as-oracle in the clean-room page, and what a writer must spell for
   InDesign.

## Group B — detail

Audited 2026-10-11 against core **v0.71.1** (`paged-media/core`, tag `6adb3b7`), the IDML adapter in
`paged-media/plugin-publish` (`crates/idml-import`, `crates/idml-export`), and the registry
feature registry (the feature registry). Read-only; clean-room (no Adobe spec opened).

Path shorthand: `imp/` = `plugin-publish/crates/idml-import/src/`, `exp/` =
`plugin-publish/crates/idml-export/src/`, `core/` = `core/crates/`, `pipe/` =
`core/paged-renderer/src/pipeline/`.

### Cross-cutting findings (these hit most pages)

1. **Every `paged-parse/...` citation is dead.** `paged-parse` no longer exists in core. The IDML
   parser is `imp/` (plugin-publish, ADR 022/651), and the style resolver plus `MAX_BASED_ON_DEPTH`
   moved to `core/paged-model/src/lib.rs:5950`. `paged-renderer/src/pipeline.rs:NNNN` is dead too,
   because `pipeline` is now a directory (`pipe/*.rs`). `Document::frame_chain` is at
   `core/paged-scene/src/lib.rs:288`, not `:253`. Since the site is moving to idml.paged.media,
   the better fix is to **drop file:line citations from format prose entirely** rather than
   re-point them.
2. **`<Br/>` is the paragraph mark, not a forced line break.** A `ParagraphStyleRange` is a
   style run over one or more paragraphs, not "one paragraph". See `imp/story.rs:1526-1552`
   ("`<Br/>` is the paragraph MARK…") and `exp/emit.rs:192-201` ("In IDML a
   `<ParagraphStyleRange>` is a style run over one or more paragraphs, and what separates
   paragraphs is the `<Br/>` character… opened in InDesign, an eleven-entry table of contents
   came back as ONE paragraph"). The forced line break is **U+2028 inside `<Content>`** and stays
   one paragraph (`imp/story.rs:1762-1776`). Only U+2029 reads as a paragraph break.
3. **The tab is a literal U+0009 in `<Content>`. `<Tab/>` is a private Paged spelling that InDesign
   ignores.** See `exp/rewrite.rs:6041-6047`. The importer still accepts `<Tab/>` for legacy parts
   (`imp/story.rs:1614-1621`). In a 40-file corpus sample, `<Tab/>` appears only in our own
   `corpus/idml/generated/text-advanced.idml`. `TabList`/`TabStop` are the stop *records*, which
   is a separate thing from the tab *character*.
4. **The docs examples teach the private conventions.** `examples/two-paragraphs` uses two
   sibling PSRs with no `<Br/>`. InDesign reads that as one paragraph, but our reader rebuilds
   paragraphs from PSR boundaries, so the validator still says `paragraphs: 2`.
   `examples/tab-stops` uses `<Tab/>`. Both examples, and their `example.json` annotations ("A new
   paragraph means a new range"), need rewriting to InDesign's spelling. This is outside this
   audit's chapters but is embedded by story-structure, extract-all-text and drop-caps-and-tabs.
5. **`<?ACE 19?>` is the section marker, not the next-page number.** The next and previous page
   numbers are `<?ACE 18?>` inside a range carrying `PageNumberType="NextPageNumber"` /
   `"PreviousPageNumber"`, measured on InDesign 20.0.1 (`imp/story.rs:1729-1748`; markers at
   `core/paged-model/src/lib.rs:6471-6484`: E018 auto, E019 next, E01A previous, E01B section).
6. **Text variables are recomputed and, since v0.71, created and instanced.** Several FAQs still
   say "never recomputed" (see the text-variables rows). See `pipe/links.rs:20-44` and core
   `docs/status.md` ("a custom text variable can be created and instanced in text"). The export
   writes the definition with InDesign's typed `…VariablePreference` child and a custom value as
   `<Properties><Contents type="string">` (`exp/text_variables.rs`). The importer reads
   `TextVariablePreference` (`imp/designmap.rs:112-250`).
7. **Possible engine bug, not just docs: `KerningMethod` tokens.** Real InDesign writes
   `KerningMethod="$ID/Metrics" | "$ID/Optical" | "$ID/None"` (corpus sample: 7/3/8
   occurrences). The renderer matches only bare `"None"` / `"Optical"` (`pipe/metrics.rs:83-88`),
   and the importer passes the raw string (`imp/story.rs:1008`). So `$ID/None` from InDesign
   renders *with* kerning. The docs list the bare tokens.
8. **Implementation-vs-format drift.** About half the prose describes what "our parser" or "the
   renderer" does: lookup keys, private-use markers, merge loops, depth caps, Swatch/None
   normalisation. For idml.paged.media, the format semantics should lead and the Paged behaviour
   should drop to a "Support in Paged" aside or badge.

### Summary table

| Page | Tier / Diátaxis | Verdict | Wrong-looking SupportBadge `status=` (vs registry/code) | Inline ```xml? |
|---|---|---|---|---|
| stories-text/index.mdx | beginner / explanation | fix | none | no |
| stories-text/your-first-story.mdx | beginner / tutorial (draft) | finish (or fold into index) | none | no (ExampleEmbed) |
| stories-text/story-structure.mdx | pro / reference | **rewrite** | ruby `parsed-not-rendered` (registry: renderer partial, GroupRuby drawn); conditional `supported` here contradicts conflict-resolution | no (`text` tree) |
| stories-text/threading-and-overset.mdx | pro / explanation | fix | none wrong, but prose contradicts its own `feature=` badge | no |
| stories-text/text-variables.mdx | intermediate / reference | **merge** into sections-numbering-variables/text-variables + rewrite | `supported` ok; markers table wrong | no |
| stories-text/extract-all-text.mdx | intermediate / how-to | **rewrite** | none | no |
| stories-text/why-ranges-not-spans.mdx | pro / explanation (stub) | **finish, retitled** (the premise is now wrong) or delete | none | no |
| styles/index.mdx | intermediate / explanation | fix (minor) | none | no |
| styles/the-cascade.mdx | intermediate / explanation | fix | none | no |
| styles/paragraph-styles.mdx | pro / reference | fix (large) | `Position` and `NextStyle` `parsed-not-rendered` wrong/stale | **yes** (uses non-InDesign `AppliedFont` attribute form) |
| styles/character-styles.mdx | pro / reference | fix | `VerticalScale`, `Position` `parsed-not-rendered` wrong | yes |
| styles/object-styles.mdx | intermediate / reference | fix | `CornerOption` `parsed-not-rendered` wrong; `AppliedParagraphStyle` should be `not-yet-parsed` | yes |
| styles/table-and-cell-styles.mdx | pro / reference | fix | badges ok; FAQ contradicts body | no |
| styles/conflict-resolution.mdx | pro / explanation | fix | conditional `parsed-not-rendered` wrong (enforced) | no |
| typography/index.mdx | intermediate / explanation | fix (implementation framing) | legend only | no |
| typography/fonts-and-faces.mdx | pro / reference | fix; mostly about Paged | `Fonts.xml` `parsed-not-rendered` should be `not-yet-parsed` (not read at all) | no |
| typography/spacing-and-leading.mdx | pro / reference | fix | `KerningMethod` row `parsed-not-rendered` should be `supported` with partial note | no |
| typography/justification-and-linebreaking.mdx | pro / explanation | fix | `CenterJustified` / `RightJustified` rows `supported` should be partial (not justified at all) | no |
| typography/drop-caps-and-tabs.mdx | pro / reference | fix | none | no |
| tables/index.mdx | intermediate / explanation | current (minor) | none | no |
| tables/the-table-model.mdx | pro / reference | fix | stroke-type rows `parsed-not-rendered` wrong (dashed and double drawn); gap colour `not-yet-parsed` wrong (parsed) | yes |
| tables/rows-columns-cells.mdx | pro / reference | fix | `AutoGrow`/`KeepWithNextRow` `not-yet-parsed` wrong (parsed and honoured); `FirstBaselineOffset` `parsed-not-rendered` wrong | no |
| tables/tables-in-text-flow.mdx | pro / explanation | fix | note says keep-together not honoured (it is) | yes |

### Per-page detail

#### stories-text/index.mdx — fix
- L12-14, L20-23, L47-50: "nested ranges: runs that share a paragraph style" is right, but the
  FAQ (L48-50) says "`ParagraphStyleRange` blocks (one per paragraph)". **Wrong**: one PSR is a
  style run that can hold many paragraphs, separated by `<Br/>` (finding 2).
- L28-33: tier emoji list. why-ranges-not-spans is listed as an explanation page, but it is a stub.
- L35-37: "also the reference's demonstration of the difficulty tiers": meta, can stay.
- Missing: paragraph mark, forced line break, special characters (PIs), footnotes, notes,
  hidden text, tracked changes (`<Change>`), XML tagging wrappers, inline anchored objects.

#### stories-text/your-first-story.mdx — finish or fold
- Draft. L21-22 "once the live preview lands": the live preview has shipped (idml-viewer
  consumed by docs, core.pin v0.71.1), so this is stale.
- L41-42: placeholder "next steps being written".
- The single-paragraph example is fine, because a one-paragraph story correctly has no `<Br/>`.
  The "longer stories just add more ranges" (L39, L57-60) teaches the wrong model, though: a
  second paragraph is a `<Br/>` plus more `<Content>`, and a new PSR only where the
  *paragraph style or local override* changes.
- Recommendation: finish it as a 3-step tutorial (one line, then a second paragraph via `<Br/>`,
  then a style change via a new PSR/CSR). That also teaches the paragraph-mark rule early. If
  nobody owns it, fold the minimal example into stories-text/index.

#### stories-text/story-structure.mdx — REWRITE
- L15, L23, L31, L118-124, L130, L159-161, L170-172: "`Br` is a forced line break…becomes a
  newline". **Wrong**: `<Br/>` is the paragraph mark (`imp/story.rs:1526-1552`,
  `exp/emit.rs:192-201`).
- L65-67, L157-161 (FAQ): "paragraph count = number of `ParagraphStyleRange` blocks, not a count
  of line breaks". **Inverted**: paragraphs are delimited by `<Br/>`, and the PSR count is the
  count of style runs.
- L32, L122, L131: `Tab` element as the tab character. **Wrong**: a literal U+0009 in
  `<Content>` (`exp/rewrite.rs:6041-6047`). `<Tab/>` is legacy/private.
- L129: "U+2028 / U+2029 inside it are normalised to newlines". **Wrong**: U+2028 stays as a
  forced line break in the same paragraph. Only U+2029 maps to a paragraph break
  (`imp/story.rs:1762-1776`).
- L74 / FullyJustified note: still true that it composes like LeftJustified (`pipe/metrics.rs:117`).
  Missing: CenterJustified and RightJustified compose as ragged centre/right with no
  justification (`pipe/metrics.rs:113-116`). Duplicates the typography page; link instead.
- L96-98, L105, L110: the `AppliedFont`/`Leading` Properties-child note is right. L110
  "Absent means Auto (point size × 1.2)": IDML also writes `<Leading type="enumeration">Auto`.
- L114: `AppliedConditions` "if any is hidden, the run is dropped" matches code
  (`pipe/build_engine.rs:5187-5210`, `.all(visible)`). **Verify against InDesign** (ADR 120): the
  engine's any-hidden-hides rule has no InDesign probe cited.
- L142-148 footnotes: the prose (separator rule, per-run styling) matches code (`pipe/footnotes.rs`
  rule band). The registry note for `stories-text.footnotes` is stale (it says no separator rule),
  so fix registry, not the docs. Use `feature="stories-text.footnotes"` instead of the static badge.
- L149-150 ruby: `parsed-not-rendered` conflicts with registry `typography.ruby` (renderer
  *partial*, GroupRuby drawn). Use `feature="typography.ruby"`. The citation
  `pipeline.rs:4208` is dead.
- L151-153: the citation `paged-parse/src/story.rs:913` is dead.
- L174-177: "parser reads exactly the four-level shape". Stale: the parser reads tables,
  anchored objects, footnotes, notes, hyperlink sources and destinations, index markers,
  `PageNumberType`, keep and span attributes, OTF features, list attributes and more (attribute
  list in `imp/story.rs`).
- The PSR attribute table (L70-84) omits the attributes now modelled and settable:
  `KeepLinesTogether`/`KeepAllLinesTogether`/`KeepFirstLines`/`KeepLastLines`/`KeepWithNext`,
  `StartParagraph`, `SpanColumnType`/`SpanSplitColumnCount`/`SpanColumnMin…`, `LeftIndent`/
  `RightIndent`, `Composer`, the hyphenation family, list attributes (`AppliedNumberingList`,
  `NumberingExpression`, …). Catalog `settablePaths` has `paragraphKeep*` and `paragraphSpan*`
  (v64).
- No inline ```xml. A minimal hand-written multi-paragraph PSR with `<Br/>`, U+2028 and a literal
  tab would be the single most useful addition.

#### stories-text/threading-and-overset.mdx — fix
- L47: `paged-scene/src/lib.rs:253` is now `:288`. L48: `paged-parse/src/spread.rs:1714` is dead
  (now `imp/spread.rs`). L68: `pipeline.rs:3909` is dead.
- L74-78 and FAQ L111-112: "There is no diagnostic that says this story overset". **Wrong, and
  contradicts the page's own badge (L72).** `DiagnosticCode::OversetTextDropped`
  (`core/paged-renderer/src/diagnostics.rs:46`), plus `StorySummary.overset` on the read surface
  (registry `stories-text.overset`).
- L72 badge note mentions auto-height frames growing. The page body never explains it, and the
  story grow rule (`setFlowGrowRule`, ADR 026, v64) is missing.
- L85-88 conditional text: right (enforced), and it contradicts conflict-resolution L112-117.
- L89-90: `HiddenText`/`Note` suppressed. Matches code, but registry `stories-text.hidden-text`
  is `experimental`/partial and the static `supported` badge overstates it. Use
  `feature="stories-text.hidden-text"`.
- Format content (NextTextFrame/PreviousTextFrame/`n` sentinel/ParentStory) is current. The
  head-finding walk (L42-48) is implementation and belongs in an aside.
- Missing: `TextFramePreference` column balancing. **`VerticalBalanceColumns` levels the LINE
  COUNT, not equal heights**. It belongs in
  frames-paths but deserves a cross-link here. Also missing: threading across pages and
  spreads; text-on-path and anchored-frame stories in chains.

#### stories-text/text-variables.mdx — MERGE (see duplicate section below) and rewrite
- L15, L22-24, L59-66: the body says variables are re-derived (correct). FAQ L112-116 says
  "No… renderer inlines that snapshot rather than re-deriving it". **Self-contradiction; the FAQ
  is wrong** (`pipe/links.rs:20-44`).
- L32: citation `paged-parse/src/designmap.rs:227` is dead (now `imp/designmap.rs:226-250`).
  L47 `story.rs:1643` is dead.
- L39 `VariableType` "(running header, file name, page number, …)": a variable does not do
  "page number". Current and next page are markers, not variables. `LastPageNumberType` is a
  variable.
- L70-74, L86-87, L119-121, L125-129: "`<?ACE 19?>` for the next page number". **Wrong**: ACE 19
  is the section marker. The next and previous page numbers are `<?ACE 18?>` + `PageNumberType`
  on the range (`imp/story.rs:249-252, 1729-1748`).
- L79-81: marker table omits `PREVIOUS_PAGE_NUMBER_MARKER` (U+E01A) and `SECTION_MARKER` (U+E01B).
- L91, L121-122: "picked from a Unicode **tag block**". **Wrong**: U+E018–E01B are Private Use
  Area. More importantly, these codepoints are Paged-internal. A reader walking raw IDML sees
  `<?ACE 18?>` PIs, never U+E018. The extraction advice (L96-102) mixes the two.
- Missing: text variable *authoring* (v0.71 `createTextVariable`/`insertField`), the typed
  `<…VariablePreference>` child on `TextVariable`, custom `Contents`, `TextVariableInstance`
  placement inside `<Content>` vs as a sibling, and `PageNumberType` values.

#### stories-text/extract-all-text.mdx — REWRITE
- L15, L35-37: "`Br`… emit `\n`" (as a line break). It is the paragraph break. L38-40: "End each
  paragraph with a newline. Each `ParagraphStyleRange` is one paragraph". **Wrong**: adding `\n`
  per PSR inserts breaks mid-paragraph wherever the style changes, and doubles the `<Br/>`.
- L35-36: "A `Tab`… emit `\t`". A real InDesign tab is already a literal U+0009 in `<Content>`.
- L27-29, L61-62, L78-81: "`StoryList` gives you the stories in document/reading order". **No
  code backs this.** The importer discovers stories from `idPkg:Story` refs and never reads
  `StoryList` (`imp/designmap.rs:469`). Reading order in a layout comes from frames on spreads
  (frame chains, page order). Ask InDesign (ADR 120) before asserting it, or reframe it as
  "StoryList enumerates stories; derive reading order from spreads".
- L67-69: "visible characters are the frozen `ResultText`". Fine for raw XML; note it may be
  stale.
- Missing cases: U+2028 forced line break; `<?ACE n?>` processing instructions (page number,
  section marker, and other special characters), which a raw walker must map or drop; XML
  entities; `<Footnote>` bodies (include or skip?); text in anchored-frame stories (separate
  `Story` parts referenced from inline frames); `<Table>` cells (mentioned). The worked example
  (L44-57) depends on the non-compliant two-paragraphs example.

#### stories-text/why-ranges-not-spans.mdx — stub; finish with a corrected premise, or delete
- L13-17, L29-33, L35-39: "A `ParagraphStyleRange` is exactly one paragraph". **Wrong** (finding
  2). That breaks the stub's whole argument: PSR/CSR *are* style runs, effectively flat
  non-overlapping spans keyed to style changes, with paragraphs delimited by an in-band `<Br/>`.
- Worth finishing because the true story is interesting and under-documented: ranges are
  non-overlapping style runs (no arbitrary nesting); paragraph boundaries are in-band characters;
  a style change mid-paragraph splits the PSR and the CSR; this is why "count PSRs" is the wrong
  paragraph count. Otherwise fold a corrected FAQ into story-structure and delete the page.

#### styles/index.mdx — fix (minor)
- L79-86 FAQ: "IDML has five style kinds" but links four groups (table and cell are counted as
  two, which is fine). It omits TOC styles (`TOCStyleDef`), stroke styles (`StrokeStyleDef`) and
  numbering lists (`NumberingListDef`), all parsed (`imp/styles.rs:47-51` re-exports).
- L18-19 "a small resolution the parser performs": the resolver now lives in core's model
  (`core/paged-model/src/lib.rs`), not the parser. This is implementation framing; the page
  should describe the format.
- Missing: `<…StyleGroup>` nesting semantics, `$ID/` names, `%3a` escaping, the `Name` vs `Self`
  contract, condition sets.

#### styles/the-cascade.mdx — fix
- L57-63, L86, L181: citations to `crates/paged-parse/src/styles.rs:51` are dead. Now
  `core/paged-model/src/lib.rs:5950` (`const MAX_BASED_ON_DEPTH: usize = 16`). The value is still 16.
- The content is right as a description of resolution. L57-63 (`resolve_paragraph`/
  `merge_below`) is implementation and belongs in an aside.
- Missing: InDesign's own `BasedOn` serialisation is the `<Properties><BasedOn type="object">`
  child (mentioned only in passing); the "Reset to base" and `[Basic Paragraph]` defaults.

#### styles/paragraph-styles.mdx — fix (large)
- L38-47 ```xml: shows `AppliedFont="Open Sans"` as an attribute on `<ParagraphStyle>`. That is
  not InDesign's spelling: InDesign writes `<Properties><AppliedFont type="string">`, and the
  docs' own fonts page says so. The same is true of `examples/based-on-chain/…/Styles.xml`.
  Replace it with the Properties form.
- L78: `Capitalization`: "SmallCaps approximated until OpenType smcp lands". **Stale**: `smcp` /
  `c2sc` are driven (`core/paged-text/src/shape.rs:212-218`, `pipe/metrics.rs:103-106`).
- L79, L140-141: `Position` `parsed-not-rendered`, "not yet scaled or shifted". **Wrong**:
  applied (`pipe/metrics.rs:31-41`). Cockpit `typography.position-super-subscript` is stable.
- L95: FullyJustified is still true. Add that CenterJustified and RightJustified are not
  justified (`pipe/metrics.rs:113-116`).
- L106-111: "Those belong to the typography and [lists](/docs/idml/stories-text) chapters".
  **There is no lists page**; the link points at stories-text/index. Bullets and numbering
  (registry `styles.bullets-numbering` stable), paragraph rules, shading and borders (registry
  stable), keep options, span and split columns, and `StartParagraph` are documented nowhere in
  the IDML reference.
- L114-116, L139: `NextStyle` "read and deliberately not acted on". It is now modelled and
  settable (`paragraphStyleNextStyle` in catalog `settablePaths`; registry
  `styles.next-style-overrides` stable). It is format-relevant, since the authoring chain
  survives round-trip. Reword; the badge should be `supported` with an "authoring-only" note.
- Missing: keeps (`KeepLinesTogether`, `KeepAllLinesTogether`, `KeepFirstLines`,
  `KeepLastLines`, `KeepWithNext`), `StartParagraph`, `SpanColumnType` and the split-column
  family (v64), `LeftIndent`/`RightIndent`/`LastLineIndent`, `Composer`, letter and glyph
  spacing, hyphenation detail attrs, `RuleAbove*`/`RuleBelow*`, `ParagraphShading*`,
  `ParagraphBorder*`, `<NestedStyle>`, `AppliedNumberingList`, the list attribute family, and
  `KinsokuSet`/`MojikumiTable`.

#### styles/character-styles.mdx — fix
- L50-51, L121-123 FAQ: "`Leading` is read from the run/range rather than the style". **Wrong**:
  `parse_character_style` reads `Leading` (`imp/styles.rs:761`) and `ResolvedCharacter.leading`
  exists (`core/paged-model/src/lib.rs:~4422`).
- L72: `VerticalScale` `parsed-not-rendered`, "per-glyph y-scale not yet applied". **Wrong**:
  applied (`vertical_scale_pct`, `pipe/build_engine.rs:5900`, `pipe/tables.rs:2461`). Cockpit
  `typography.vertical-scale` is stable.
- L74: `Position` `parsed-not-rendered`. **Wrong** (see paragraph-styles).
- L78: `KerningMethod` `Metrics | Optical | None`. InDesign writes `$ID/Metrics | $ID/Optical |
  $ID/None` (finding 7).
- L69: Capitalization note is fine. Add SmallCaps/CapToSmallCap = `smcp`/`c2sc`.
- Missing: the OTF feature attributes (`OTFFraction`, `OTFOrdinal`, `OTFSwash`,
  `OTFDiscretionaryLigature`, `OTFSlashedZero`, `OTFTitling`, `OTFContextualAlternate`,
  `OTFFigureStyle`, `OTFStylisticSets`; all parsed, `imp/story.rs:60-75`, and honoured,
  `pipe/metrics.rs:90-102`), `AppliedLanguage`, `Underline*`/`StrikeThrough*` sub-attributes,
  kenten, ruby, `OverprintFill`/`OverprintStroke`.

#### styles/object-styles.mdx — fix
- L64-66, L111-112: "`Enable*` toggles and transparency/drop-shadow blocks not yet acted on".
  Still true: `ObjectStyleDef` has fill, stroke, tint, corner only
  (`core/paged-model/src/lib.rs:3762-3784`). Keep it.
- L79: `CornerOption` `None | Rounded | InverseRounded | Inset | Bevel | Fancy`,
  `parsed-not-rendered`, "fall back to Rounded". **Wrong twice.** InDesign's tokens are
  `RoundedCorner`, `InverseRoundedCorner`, `InsetCorner`, `BevelCorner`, `FancyCorner`
  (`core/paged-model/src/lib.rs:466-480`; the comment notes `BevelCorner` is what InDesign
  writes). All five are drawn (`pipe/shapes.rs:1841` for Fancy).
- L81: `AppliedParagraphStyle` `parsed-not-rendered`. `ObjectStyleDef` has no such field, so it
  is not parsed: use `not-yet-parsed`.
- L85-86: citation `paged-parse/src/styles.rs:216-243` is dead.
- The ```xml block (L45-54) is fine apart from `CornerOption="None"`.
- Missing: object-style categories (text frame options, anchored object, text wrap), effects on
  object styles, `ObjectStyle` default for text frames vs graphic frames, and the save-back fact
  that object styles survive (registry `plugin-publish.save-back-defects`).

#### styles/table-and-cell-styles.mdx — fix
- L62, L91: citations to `paged-parse/src/styles.rs` are dead.
- L64-70 body: column fills and skip counts are read (correct). FAQ L121-125: "column fills, and
  skip-alternating counts are stored but not yet read". **Contradicts the body and the code**
  (`imp/styles.rs:883-930`).
- L78-89 CellStyle table omits `RotationAngle`, `FillTint`?, and the `*EdgeStrokeType` family,
  all parsed (`CellStyleDef`, `core/paged-model/src/lib.rs:3802-3826`). L93-97: insets,
  `AppliedParagraphStyle`, diagonals and gap colours are still not read on CellStyle. Correct.
- Badges: `StrokeOrder not-yet-parsed` is right (registry `tables.style-cascade` "StrokeOrder
  pending"). Divider gap colours on TableStyle: `GapColor` is parsed somewhere in
  `imp/styles.rs:1040` (stroke styles). Verify before keeping "not-yet-parsed".
- Missing: the cell fill tint gap is a *model* gap (`cellFillTint` reads null, ADR 132 L98-102,
  status.md "A cell's fill tint is not modelled"). Document that a cell's `FillTint` is not
  supported.

#### styles/conflict-resolution.mdx — fix
- L34, L92: citations to `paged-parse/src/styles.rs:51` and `resolved_run_attrs` (scene layer)
  are dead.
- L112-117 + badge: "visibility gating is not yet enforced, conditioned runs render as if always
  visible". **Wrong**: enforced (`pipe/build_engine.rs:5187-5210`). Contradicts
  story-structure L114 and threading L85-88.
- L148-153 FAQ: "renderer does not yet split runs at nested-style boundaries or gate visibility
  on conditions". **Wrong on both counts and contradicts the body (L105-111).**
- L80-85: Swatch/None normalised to unset. That is still the implementation
  (`imp/styles.rs:748-751, 886, 935, 968, 1064`). For a *format* reference, though, this is a
  Paged divergence: in the format, `Swatch/None` is a real "no paint" value that overrides a
  parent. Lead with the format semantic, then flag the Paged deviation as a known limitation
  (ADR 120: InDesign is the oracle).
- L86-89: "unknown Justification ⇒ falls through to left". Fine.
- L118-122: "complex cascade… merits verification", badged `supported`. That is a hedge, not a
  fact; drop it or cite the `styles_cascade` paged-gen fixture
  (`core/paged-gen/src/samples/styles_cascade.rs`).
- Missing: PSR-level *character* attributes (a PointSize on the PSR) in the precedence order;
  nested-style and GREP-style precedence; list-marker character styles.

#### typography/index.mdx — fix (framing)
- L10-19, L27-33: the page explains "what the renderer does with a run", which is about Paged's
  implementation, not the format. For idml.paged.media, reframe it as "what IDML's typographic
  attributes mean", with support as badges.
- L54-65 pipeline steps are fine. L81 "TabList of TabStops a `Tab` snaps to": the tab is the
  U+0009 character.
- L97-101: right (fonts are not read from the package).
- Missing chapter pages: OpenType features, capitalization and position, scale and skew,
  underline/strikethrough options, hyphenation settings, composer selection, keeps and breaks,
  span and split columns, CJK (kinsoku, mojikumi, kenten, ruby, vertical, bidi). Cockpit lists
  23 typography features; the chapter covers about 8.

#### typography/fonts-and-faces.mdx — fix; mostly about Paged
- L36-52, L103-108: the lookup-key algorithm is Paged implementation (`core/paged-renderer/src/
  asset.rs:222-227`, still accurate). Move it to an aside.
- L93: `Fonts.xml` badged `parsed-not-rendered` while saying "the parser does not load it".
  Should be `not-yet-parsed` (no reference in `imp/`).
- L103-108, L132-137: composite fonts and synthesised bold/italic are still absent (no
  `CompositeFont` in core). Accurate.
- Missing: `CompositeFont` structure in `Fonts.xml`, `FontStyle` naming vs PostScript name
  matching, missing-font behaviour in InDesign, and that scene-layer text resolves weight/italic
  (ADR 126; plugin text only).

#### typography/spacing-and-leading.mdx — fix
- L52-53, L118-119: AutoLeading is not read per document. Still true (no `AutoLeading` in
  `imp/`). But IDML carries `AutoLeading` on paragraph styles/ranges, not only per document.
  Reword.
- L80-86, L93, L98, L123-126: `KerningMethod` values written bare. InDesign writes the
  `$ID/`-prefixed tokens, and Paged currently fails to recognise them (finding 7; engine bug to
  file). The row badge `parsed-not-rendered` is misleading; use `feature="typography.tracking-
  kerning"` (registry: renderer partial).
- L100-105, L128-132 FAQ: "discretionary ligatures, fractions… not exposed; rest of the OpenType
  surface not in scope". **Stale**: fractions, ordinals, swash, dlig, slashed zero, titling,
  calt, figure style and stylistic sets are parsed and passed to the shaper
  (`pipe/metrics.rs:90-102`; registry `typography.ligatures-opentype` shipped). Mojikumi is in
  registry as stable/partial.
- Missing: `HorizontalScale`/`VerticalScale`/`Skew`, `KerningValue` (manual pair kerning *is* an
  IDML attribute on a range; verify in code before adding), leading model (`LeadingModel`,
  baseline grid), `AutoLeading` %.

#### typography/justification-and-linebreaking.mdx — fix
- L41-42, L126: `CenterJustified` → Center, `RightJustified` → Right, badged `supported`. These
  are not justified at all (`pipe/metrics.rs:113-116`). Badge should be partial; this is a real
  engine gap.
- L43, L51-53: FullyJustified = LeftJustified. Still true (`pipe/metrics.rs:117`; last line not
  forced).
- L55, L100: citations `core/crates/paged-parse/src/story.rs` are dead.
- L90-94: "InDesign uses Proximity… which we do not ship". Accurate; registry title says
  "Proximity licensed", but code logs "Proximity dictionary not licensed"
  (`core/paged-text/src/compose.rs:613-628`). The registry title should be fixed.
- L96-100 kinsoku: `KinsokuSet` is now plumbed to layout (`pipe/geom.rs:653`). Check how far
  named sets are honoured before keeping "only built-in hard set".
- Missing: **`Composer`** (`"HL Composer"` vs `"HL Single"`, both implemented: the single-line
  composer in `core/paged-text/src/compose.rs:268-272`, fixture `paged-gen/src/samples/
  composer.rs`); **forced line break (U+2028)**, where the line before justifies to full measure
  and the paragraph does not end (`imp/story.rs:1762-1767`, `pipe/build_engine.rs:5998`); letter
  spacing and glyph scaling (registry `typography.justification-spacing`); the hyphenation
  attribute family (`HyphenateWordsLongerThan`, `HyphenateAfterFirst`, `HyphenationZone`,
  `HyphenateCapitalizedWords`, ladder limit; all parsed); `SingleWordJustification`; keeps
  (v64) as line-breaking constraints; and a cross-link to `VerticalBalanceColumns` (line-count
  balancing).

#### typography/drop-caps-and-tabs.mdx — fix
- L15-16, L25, L56-57, L92-94: "A tab needs a `Tab` marker… `Tab` in a run is a single tab
  character (leaf alongside Content and Br)". **Wrong**: the tab is U+0009 inside `<Content>`;
  `<Tab/>` is a private legacy spelling. The tab-stops example (`examples/tab-stops`) must change
  to a literal tab (`&#9;` or a real tab) inside `<Content>`.
- L60-63: "`TabList` inside the paragraph's `Properties`, each a `TabStop` record". Right
  (`<TabList type="list"><ListItem type="record">`). Good to state the record shape explicitly,
  since this is exactly the tab-char vs tab-stop distinction.
- L61, L68: `Position` "from the column's left edge". Unverified; check against InDesign whether
  it is measured from the paragraph's left indent or the frame inset edge.
- L75-77, L116: default 36 pt grid. Matches `core/paged-text/src/layout.rs` tests. InDesign's
  default grid comes from document preferences, so note that.
- Drop caps L29-52: fine. **Missing**: `DropCapStyle` (character style applied to the drop
  cap). It is not parsed anywhere in `imp/` or the model, which is a gap worth a
  `not-yet-parsed` badge. Also missing: drop cap + nested styles, `DropCapDetail` bit semantics
  (model calls it "an arbitrary integer", `core/paged-model/src/lib.rs:4602-4604`), and
  right-indent tab / "indent to here" special characters (PIs).

#### tables/index.mdx — current (minor)
- Accurate format description. L44-45: `Name="col:row"`. Fine.
- Could mention that the host paragraph's `<Br/>` follows the `<Table>` (the table takes the
  paragraph mark: `exp/emit.rs:202-205`), and table overset.

#### tables/the-table-model.mdx — fix
- L61, L65-71: `AppliedTableStyle` badged `parsed-not-rendered`. It resolves region cell styles,
  borders, fills and alternating strokes (registry `tables.style-cascade` shipped). Should be
  `supported` with a "StrokeOrder pending" note.
- L103, L123, L162-165 FAQ: border and divider `StrokeType` "drawn solid today". **Wrong**: the
  per-edge stroke style is drawn, including double borders as two rules (`pipe/tables.rs:835-865,
  1602`; status.md "a cell edge draws in its stroke style (a double border as two rules)",
  protocol 70).
- L105: `…StrokeGapColor / GapTint` `not-yet-parsed`. **Wrong**: parsed (`TopBorderStrokeGapColor`
  etc. in `imp/story.rs`). Whether the gap is painted needs a check; badge at least as parsed.
- L135-140: StrokeOrder not read, row wins. Still true (`pipe/tables.rs:1263`).
- L82-83: `RepeatingHeader`/`RepeatingFooter` parsed. OK.
- Missing: table overset (rows the last frame cannot hold; `paged-gen/src/samples/
  tables_overset.rs` documents the InDesign answer), `TableDirection`, space before/after table,
  `BreakHeaders`/`BreakFooters`/`SkipFirstHeader`/`SkipLastFooter` (still unread; correct
  elsewhere).

#### tables/rows-columns-cells.mdx — fix
- L70-73 + badge: "`AutoGrow`, `KeepWithNextRow`, `StartRow` not read". **Wrong for two of
  three**: `AutoGrow` and `KeepWithNextRow` are parsed and honoured (`pipe/tables.rs:2035-2053`;
  a fixed row holds its height and oversets the rest, measured against InDesign). `StartRow` is
  still unread.
- L119-120: `FirstBaselineOffset`/`MinimumFirstBaselineOffset` `parsed-not-rendered`, "Ascent
  semantics today". **Wrong**: applied per cell (`pipe/tables.rs:2299-2320`).
- L117, L124-129, L185-189: insets read off the cell, not the style. Still true.
- L118: `AppliedCellStyle` `parsed-not-rendered`. Should be `supported` (partial): fill, edge
  strokes, vjust and rotation resolve from it.
- L142: `FillColor` only. Add that a cell `FillTint` is **not modelled** (ADR 132 L98-102; status.md).
- L145, L160: edge stroke *type* missing from the table; it is drawn.
- L79-81: column-major serialisation is fine.
- Missing: cell `FillTint` gap, edge `StrokeType`/gap, `ClipContentToCell`, writing direction in
  cells, nested tables (registry `tables.nested-tables` stable), `RowSpan` height distribution
  vs InDesign.

#### tables/tables-in-text-flow.mdx — fix
- L58-63, L112-116 FAQ: "`KeepWithNextRow` constraint is not consulted". **Wrong**
  (`pipe/tables.rs:2050-2053`; fixture `tables_rows.rs` page 9). "A single row taller than a
  whole frame is not itself split": verify against `tables_rows.rs` page 10 / `tables_overset.rs`.
  The engine follows InDesign's overset answer now, so reword it as InDesign behaviour.
- L45-46, L95: "starting at the left edge of the text column". Unverified; check whether
  paragraph `LeftIndent` and table alignment apply.
- L78-80: BreakHeaders/BreakFooters/SkipFirstHeader/SkipLastFooter not read. Still true (not in
  the `imp/story.rs` attribute list).
- The ```xml block (L32-40) should show the host paragraph's `<Br/>` after `</Table>` when more
  text follows.

### Duplicate: stories-text/text-variables vs sections-numbering-variables/text-variables

Both pages document the same `TextVariable` definition table (identical rows) and the same
`TextVariableInstance` table. The `<?ACE?>` marker material is split between them.

Both pages contradict themselves:
- **sections-numbering-variables/text-variables:** L47 badges `VariableType`
  `parsed-not-rendered` ("not used to recompute"), while L56-76 and L104 say it executes. L91
  marks `AssociatedTextVariable` `parsed-not-rendered` ("not used to recompute"), which is wrong
  because resolution keys on it. L21, L108-110, L129-138 FAQ say "never recomputed", which is
  wrong. L61 `ChapterNumberType` "the section's chapter number, styled per `<Section>`" is
  **wrong**: it is the *document's* chapter number (`<ChapterNumberPreference>`, default 1), not a
  section property (`pipe/links.rs:40`). L62 "`PageCountType / LastPageNumberType` = real total
  body-page count" is **wrong**: `LastPageNumberType` is the *label* of the last page (document
  or section scope), and `PageCountType` is an engine-only name InDesign does not write
  (`pipe/links.rs:38-39`). L64 omits the `RunningHeaderType` aliases and the
  `DeleteEndPunctuation`/`ChangeCase` options. L113-114 says ACE 18/19 is current/next, which is
  wrong (finding 5).
- **stories-text/text-variables:** the errors are listed in its per-page entry above.

**Recommendation: merge into one canonical page at
`sections-numbering-variables/text-variables`**, the document-level home where the variable
types and sections live. Rewrite it against `pipe/links.rs:33-44` (it is the InDesign-measured
table) and add authoring (definition `…VariablePreference` child, custom `Contents`, instances).
Move the page-number *marker* content (`<?ACE 18?>` + `PageNumberType`, `<?ACE 19?>` section
marker) to sections-numbering-variables/sections-and-numbering or a "special characters" page in
stories-text. Leave in stories-text only a short "computed characters in a story" section on
story-structure that links out. Delete stories-text/text-variables and redirect it. Drop the
U+E0xx private-use detail from the format reference, or move it to a renderer/SDK page.

### Pages that are really about Paged's implementation, not the format
- **typography/fonts-and-faces** (the lookup-key algorithm and fallback chain),
  **typography/index** (framed as "what the renderer does"), **styles/the-cascade** (L57-63
  resolver internals) and **styles/conflict-resolution** (Swatch/None normalisation presented as
  the format's rule; the precedence is described as "the parser's" pass).
- **stories-text/text-variables** (private-use markers), **stories-text/threading-and-overset**
  (head-finding walk, cyclic guard), and **stories-text/story-structure** ("attributes our parser
  reads"; validator counts).
- **tables/rows-columns-cells** L33-37 ("validator counts… zero runs") is a Paged-validator
  artefact.

### MISSING TOPICS (stories-text, styles, typography, tables)

**Stories & text**
- The paragraph mark (`<Br/>`) vs PSR-as-style-run, the forced line break (U+2028), the tab
  character (U+0009) vs `TabList`, and entities. This needs its own page ("Paragraphs, breaks
  and special characters") with a correct inline ```xml example.
- Special-character processing instructions (`<?ACE n?>`: page number, section marker, others)
  and `PageNumberType`.
- Footnotes (`<Footnote>`, `FootnoteOption`, separator rule), endnotes (planned), notes
  (`<Note>`), hidden text, tracked changes (`<Change>`, planned), and index markers in story
  text.
- Text variable authoring (v0.71), merged into the canonical text-variables page.
- Story grow rule / auto-sizing frames (ADR 026, v64) and overset diagnostics.
- `<Label>` key/value escaping (tab/LF/CR must be `&#x9;`/`&#xA;`/`&#xD;` in attributes, per
  the registry save-back defects). This is cross-chapter; it belongs in package-anatomy or
  round-tripping, but no page covers it.
- Hyperlink text sources and destinations inside stories (InDesign's nesting: source inside the
  range, around `<Content>`; inline `<HyperlinkTextDestination/>`; `exp/emit.rs:96-108`). Short
  here, linking to cross-references-hyperlinks.

**Styles**
- Bullets and numbering / list paragraphs (`AppliedNumberingList`, `NumberingExpression`, list
  attributes; settable since v64). Currently a dead "lists chapter" link.
- Paragraph rules, shading and borders; nested styles (and GREP styles) as their own reference;
  `NextStyle` chains.
- Keep options, `StartParagraph`, span and split columns (v64; catalog `paragraphKeep*`,
  `paragraphSpan*`).
- TOC styles, stroke styles, condition sets.
- Cell `FillTint` not modelled (ADR 132); CellStyle insets and paragraph style not read.

**Typography**
- `Composer` (`HL Composer` / `HL Single`); forced-line justification; letter and glyph spacing;
  hyphenation attribute family; `SingleWordJustification`.
- OpenType feature attributes (`OTF*`), capitalization/position (supported now), scale and skew.
- `DropCapStyle` (not parsed: a gap); `DropCapDetail` semantics.
- `VerticalBalanceColumns` levels LINE COUNT (cross-link from frames).
- CJK: kinsoku sets, mojikumi, kenten, ruby, vertical writing, bidi (all in registry, none in the
  reference).
- Real `KerningMethod` tokens (`$ID/…`) and manual kerning.

**Tables**
- Table overset and row-taller-than-frame behaviour (InDesign answers in `tables_overset.rs`,
  `tables_rows.rs`).
- `AutoGrow` fixed rows and `KeepWithNextRow` (honoured now).
- Edge and border stroke styles (dashed, double) and gap colours; `StrokeOrder` (still pending).
- Nested tables; the table taking the host paragraph's `<Br/>`; `BreakHeaders`/`SkipFirstHeader`
  (unread).

### Summary
1. All 23 pages audited. Verdicts: 1 current, 17 fix, 2 rewrite (story-structure,
   extract-all-text), 1 merge (stories-text/text-variables), 1 draft to finish (your-first-story),
   1 stub to finish with a corrected premise or delete (why-ranges-not-spans).
2. The biggest format error runs through the whole stories chapter: it teaches `<Br/>` as a line
   break, one PSR per paragraph, and `<Tab/>` as the tab. InDesign's model is `<Br/>` = paragraph
   mark, PSR = style run, U+2028 = forced line, U+0009 = tab, and the `two-paragraphs` and
   `tab-stops` examples encode the wrong model.
3. Support claims lag the engine. Position, VerticalScale, SmallCaps, all corner options,
   conditional text, nested styles, dashed/double table strokes, `AutoGrow`/`KeepWithNextRow`,
   cell first-baseline and text-variable recomputation are shipped but marked not done. Overset
   diagnostics exist though the prose says none. Several FAQs contradict their own page bodies.
4. Every `paged-parse/…` and `pipeline.rs:N` citation is dead (the parser moved to plugin-publish
   `idml-import`). `<?ACE 19?>` is the section marker, not next-page; `ChapterNumberType` and
   `LastPageNumberType` are described wrongly. Merge the two text-variable pages into
   sections-numbering-variables.
5. Two engine findings to file: `KerningMethod="$ID/None"|"$ID/Optical"` (InDesign's tokens) are
   not recognised by the renderer, and `CenterJustified`/`RightJustified` compose ragged.
   Missing reference topics: keeps, span columns, lists, composer, OpenType, `DropCapStyle`, cell
   tint, table overset.

## Group C — detail

Scope: `content/docs/idml/` chapters color-swatches, images-graphics,
anchored-inline-objects, cross-references-hyperlinks, sections-numbering-variables,
conditional-text, tagged-xml, companion-formats, round-tripping, edge-cases, comparisons,
cookbook (40 pages incl. index pages).

Sources of truth: core `v0.71.1` = `paged-media/core` @ `6adb3b7`; IDML adapter
`paged-media/plugin-publish` @ `bd2d7c9`; registry the feature registry.
Abbreviations used for code paths:

- **PP** = `paged-media/plugin-publish/crates/` (idml-import / idml-export)
- **CO** = `paged-media/core/`
- **CK** = the feature registry

Clean-room rule observed: no Adobe spec opened. Where a claim concerns InDesign behaviour
and only a generator fixture / InDesign export can settle it, it is marked *oracle check*
(ADR 120 / plugin-publish ADR 653).

### Cross-cutting findings (apply to many pages)

1. **Every cited code path is dead.** Pages cite `paged-parse/src/*.rs`,
   `core/crates/paged-parse/...`, `paged-renderer/src/pipeline.rs:NNNN`, `Container::open`,
   `Document::open`. There is no `paged-parse` crate any more: IDML import/export moved to
   plugin-publish (ADR 022; `PP/idml-import`, `PP/idml-export`), `Container::open` is now
   `open_source_archive` (PP/idml-import/src/lib.rs:112) and `Document::open` is
   `import_idml` / `import_idml_doc` (PP/idml-import/src/lib.rs:177-188). The pipeline is a
   directory (`CO/crates/paged-renderer/src/pipeline/*.rs`). For a public format reference
   these citations should be dropped or moved to a "Paged implementation" aside.
2. **Half-updated pages contradict themselves.** In at least 9 pages the body (updated
   ~Aug/Sep) says "supported" while the "In short", the opening bold line and the FAQ
   (June prose) still say "not yet / parsed, not rendered". The FAQ blocks were never
   re-synced. Listed per page below.
3. **SupportBadge `feature=` resolves from the RETIRED retired state source.**
   `docs/.generated/sources.lock.json` pulls `state/data/state.json` (sha `458a11e`);
   state was retired 2026-09-11 in favour of registry. Badge notes are therefore frozen at
   the state registry (e.g. `sections-numbering-variables.text-variables` still says "dates
   + chapter/running-header keep baked ResultText", which the code contradicts — see S3).
   The generator should read registry. Most badges on these pages are legacy `status=`
   chips with hand-written notes; ~45 of them, many wrong.
4. **No ```` ```xml ```` blocks anywhere in group C.** The only fenced XML is an untagged
   fence in images-graphics/placed-images.mdx:30-39 (should be `xml`). Examples are carried
   by `<ExampleEmbed>`; several examples use pre-oracle spellings (conditional-run,
   with-hyperlink — see below).
5. **InDesign-oracle corrections already in code but absent from docs:** `<?ACE 19?>` is the
   section marker, not "next page number"; conditions live in `designmap.xml`, not
   `Styles.xml`; `<ConditionSet Conditions="…">` is an invented spelling; `<EPS>` not
   `<EPSImage>`; hyperlink destination is a `<Properties><Destination>` child;
   `LastPageNumberType` is the last page LABEL; `ChapterNumberType` is a document
   preference; `PageCountType` is not an InDesign spelling.

---

### Per-page rows

Columns: path | tier/diataxis | verdict | stale or wrong claims (page line → contradicting
code) | badge problems | ```xml? | missing topics

#### color-swatches/

| path | tier/diataxis | verdict |
|---|---|---|
| color-swatches/index.mdx | intermediate / explanation | fix |
| color-swatches/colors-and-swatches.mdx | pro / reference | fix |
| color-swatches/gradients-and-tints.mdx | intermediate / reference | fix (rewrite tint section) |
| color-swatches/spot-and-process.mdx | intermediate / explanation | rewrite (colour-management section) |

**index.mdx**
- L46-52: "tints … two ways" and "mixed inks, mixed-ink groups, and color groups … renderer
  does not yet give them their full meaning" — a third tint path (`<Tint>` swatch) is now
  parsed (PP/idml-import/src/graphic.rs:76-93) and colour groups are fully shipped
  (CK color-swatches.color-groups: parser/mutation/panel shipped). Mixed ink is the only
  real gap.
- L36-38 "Four kinds matter": should be five (Tint) plus ColorGroup.
- Badges: none. xml: no.
- Missing: `<Tint>` swatch, document colour settings (CMYKProfile/RGBProfile/intent in
  designmap — PP/idml-import/src/designmap.rs:137-138), ink manager.

**colors-and-swatches.mdx**
- L40, L60-62, L127-128: "Lab is parsed but only the spot CMYK-alternate path renders it"
  — WRONG now. Lab primaries render analytically (D50→D65 Bradford):
  CO/crates/paged-renderer/src/pipeline/color_paint.rs:315-322, `lab_entry_to_paint`
  :349; Lab-primary spots under "Use standard Lab values for spots": :337
  `spot_lab_display_rgb`, model `effective_lab` CO/crates/paged-model/src/lib.rs:2503-2530.
  CK color-swatches.lab-mixed-ink: "Lab analytic shipped".
- L39: "MixedInk / MixedInkGroup … collapse to an unhandled model" — correct
  (CO/crates/paged-model/src/lib.rs:2580-2597).
- L42-44 / L48: `BaseColor` "not-yet-parsed … not read off <Color>" — it is read off
  `<Tint>` now (graphic.rs:87); table should gain a `<Tint>` row.
- L44: TintValue −1 note OK, but the FillTint `-1` sentinel (PP/idml-import/src/util.rs:141-165,
  "FillTint="-1" is 288 of the corpus's attributes") belongs here or in gradients-and-tints.
- L56-57: "CMYK … through ICC conversion (or a naive fallback)" — needs the precondition:
  ICC only when the HOST registers a profile and colour settings
  (CO/docs/status.md:110 "Without a CMYK profile, CMYK is converted by a naive formula").
- L91-96 reserved built-ins OK (CO/crates/paged-model/src/lib.rs `ReservedSwatch::classify`).
- Badge `feature="color-swatches.lab-mixed-ink"` note "Lab as a primary space" → reads
  "Parsed, partly rendered" but Lab primary IS rendered; note should say "mixed ink /
  spot without CMYK alternate".
- xml: no. Missing: `<Tint>` element, `ColorOverride` semantics (CK color-overrides: renderer
  planned — row currently fine), swatch addresses (`swatch:Color/Red`, ADR 131) only if an
  implementation aside is kept.

**gradients-and-tints.mdx**
- L66 table: `Midpoint` support `parsed-not-rendered` "renderer interpolates linearly" —
  WRONG; L79-82 of the same page (and badge L82 "supported") say it is honoured; FAQ
  L139-142 says "parsed but not yet honored". Code honours it:
  color_paint.rs:428-436 `midpoint_blend`, used :555 (CMYK) and :591 (sRGB).
  Model: CO/crates/paged-model/src/lib.rs:2560-2565 `midpoint_pct`.
- L116-120 + FAQ L142-143: "standalone `<Tint>` swatch is not yet captured as its own kind"
  — WRONG. Parsed since the named-tint fix: PP/idml-import/src/graphic.rs:76-93 (+ second
  pass :126-140 that borrows base channels/model/alternate so a spot tint stays a spot).
  CK color-swatches.swatch.crud: "<Color>/<Swatch>/<Tint> read".
- L38: `Type` "Both kinds render" OK; but missing radial placement: a radial is centred at
  `GradientFillStart` (CO/docs/status.md:44, commit 6fd14d0; PP/idml-import/src/spread.rs:372).
  Page only documents GradientFillAngle/Length.
- L112: FillTint row lacks the `-1` = "no override" sentinel (util.rs:141-165).
- Badge L120 `feature="color-swatches.process-spot-tint"` with note "standalone <Tint>
  swatch" renders "Supported · verified" next to prose saying "not captured" — contradictory.
- xml: no. Missing: `GradientFillStart`, `GradientFillHiliteAngle/Length` (verify which the
  importer reads), tint on stroke (`StrokeTint`), gradient stops referencing a Tint.

**spot-and-process.mdx**
- L66-72 + FAQ L123-128: "In the browser … that native engine is not available, so the
  engine substitutes a naive CMYK→RGB approximation" — WRONG. wasm32 uses qcms (ADR 003,
  CO/docs/adr/003-lcms2-color.md; CO/crates/paged-color/src/cmm.rs). The real rule: ICC is
  applied on any target once the host registers profile bytes and calls setColorSettings
  (`registerColorProfile` — CK color-swatches.icc-cmm; ADR 109 engine does no I/O; no
  profile bundled, CO/docs/status.md:110). Naive only when no profile is loaded
  (color_paint.rs:30-35). Badge L72 `parsed-not-rendered` is wrong in kind (it is a
  render-accuracy note, not a parse status).
- L67-68 "keyed to the document's CMYKProfile": the designmap names a profile
  (designmap.rs:137) but the engine never loads it by name; the host supplies bytes.
- L88-92 Overprint: badge `parsed-not-rendered` "RGB darken approximation; per-separation
  CMYK deferred" — stale. CK color-swatches.overprint: renderer shipped "plane-aware on
  CPU; RGB approximates"; spot-on-same-spot overprint composites per plane
  (color_paint.rs:660-666, `paged-gpu::cpu::compose_spot_overprint_via_planes`).
- L94-98 ColorGroup badge `parsed-not-rendered`: fine as render claim, but "parser keeps the
  grouping for round-trip" undersells: groups are editable (CK color-groups shipped).
- L41-48 / L60-62 spot-without-alternate unresolved: still true (paged-model lib.rs:2646).
  But "Use Standard Lab Values for Spots" now changes the preview of Lab-primary spots
  (color_paint.rs:24-41) — undocumented.
- xml: no. Missing: Ink Manager (`SetInkSetting`, standard-Lab-for-spots), soft proof,
  rendering intent / BPC, profile registration flow; tint vs opacity distinction.

#### images-graphics/

| path | tier/diataxis | verdict |
|---|---|---|
| images-graphics/index.mdx | intermediate / explanation | current (minor fix) |
| images-graphics/placed-images.mdx | intermediate / reference | fix |
| images-graphics/formats-and-clipping.mdx | intermediate / explanation | fix |

**index.mdx**
- L56-59: "which image formats the resolver can decode" — the resolver resolves, the
  renderer decodes (page's own sibling says so). Minor.
- No badges, no xml. Missing: frame fitting (`FrameFittingOption`, CK images-graphics.frame-fitting
  shipped), image metadata (`ActualPpi`/`EffectivePpi`/`Space`, PP/idml-import/src/spread.rs:2905-2925).

**placed-images.mdx**
- L30-39: untagged fence holding XML — tag as ```xml. The sketch omits `ContentType` and
  `<GraphicBounds>`; the cookbook page uses GraphicBounds, this reference does not mention it.
- L67 `Self` support `parsed-not-rendered` — meaningless for an id; fine to drop.
- L98: "`<Image>/<EPSImage>/<PDF>/<ImportedPage>`" — the element is `<EPS>`; there is no
  `<EPSImage>` (PP/idml-import/src/spread.rs:2142, 2160-2166: "The real IDML tag is
  `<EPS>` — there is no `<EPSImage>` … verified against the corpus").
- L96-97: inline-bytes precedence OK; `<Contents>` decode lives at spread.rs:2304/2813.
- L73-74 "`image_link` … on all three": model field names are implementation detail; drop.
- Missing: `<GraphicBounds>`, `ContentType="GraphicType"`, `<Link>` attributes beyond URI
  (`StoredState`, `LinkResourceFormat`…) only as format facts, frame fitting, `imageBytes`
  settable row is implementation (protocol 71).
- No badges. xml: untagged fence only.

**formats-and-clipping.mdx**
- L15-16, L54-58, L60-69 table, FAQ L148-151: formats listed PNG/JPEG/WebP/SVG only —
  incomplete. The image crate is built with png, jpeg, webp, **tiff, gif, bmp**
  (CO/Cargo.toml:61); CK images-graphics.placed-images: "JPEG/PNG/GIF/TIFF/WebP decode";
  CMYK JPEG with embedded ICC shipped (CK images-graphics.cmyk-jpeg-icc).
- L67 EPS row `not-yet-parsed` — wrong kind: `<EPS>` IS parsed (spread.rs:2142-2167);
  only rasterisation is absent and "not planned" (CK eps-decode note). Status should be
  "parsed, not rendered".
- L73 `<EPSImage>` → `<EPS>` (spread.rs:2160-2166). Same error recurs in
  edge-cases/graceful-degradation.mdx:132.
- L81-84: inline `<PDF>` falls back to fill — still true, and the same now applies to
  inline EPS (`has_inline_eps`, CK eps-decode renderer note; diagnostic
  `ImageContentUnrenderable`, CO/crates/paged-renderer/src/diagnostics.rs:75-79).
- L124-131: clipping types — correct, but there is now a named diagnostic
  `ImageClippingPathDeferred` (diagnostics.rs:52-58) and `InvertPath` /
  `IncludeInsideEdges` are honoured (spread.rs:2266-2300; CK clipping-paths). Page omits both.
- L79 badge `feature="images-graphics.eps-decode"` renders "Supported · verified" beside
  "not yet rasterised" — confusing; registry title is "recognised + honestly rendered; no
  decode". L131 `feature="images-graphics.image-clipping"` fine.
- L45 / L49 / L97 legacy badges OK in substance.
- xml: no. Missing: TIFF/GIF/BMP, CMYK JPEG colour management, PSD (only via paged.image
  plugin — implementation), frame fitting, wasm lazy decode (implementation only).

#### anchored-inline-objects/

| path | tier/diataxis | verdict |
|---|---|---|
| anchored-inline-objects/index.mdx | intermediate / explanation | fix |
| anchored-inline-objects/anchored-objects.mdx | pro / reference | fix |
| anchored-inline-objects/inline-vs-anchored.mdx | pro / explanation | rewrite |

**index.mdx**
- FAQ L91-96: "Does Paged render anchored objects at their anchor today? No … renderer does
  not yet place it at the anchor" — WRONG. Placement shipped (CK anchored-frames, anchor-alignment
  shipped), and since commit 17d3d3d (2026-10-02) an inline object is a character of its
  line (CO/crates/paged-renderer/src/pipeline/anchored.rs:150-200 `InlineObjects`,
  `sits_in_line`, `inline_object` width = visible box incl. half stroke).
- L60/L63: red-circle emoji markers in list — style violation, remove.
- L50-56 ```text tree: fine. Missing: the `<Content>` glyph slot after the anchored object
  (CO/crates/paged-gen/src/samples/anchored.rs:30-35 comment: object then `<Content>` slot).

**anchored-objects.mdx**
- L44-53: every frame attribute marked `parsed-not-rendered` — wrong now; the anchored frame
  is drawn with fill/stroke/tint/image at its resolved position (anchored.rs:1-25,
  `AnchoredImageEmit`; CK anchored-frames renderer shipped).
- L62-64 + badge: "inline advance reservation … not yet flowed" — WRONG since 17d3d3d
  (inline/above-line objects take room in their line; InDesign-measured via
  `CO/tools/indesign-export/inline-objects-probe.jsx`, fixture
  `CO/crates/paged-gen/src/samples/inline_objects.rs`). Text wrap around an anchored object
  is still absent (anchored.rs:894/988/1112 `text_wrap: None`, :1146 empty wrap shapes) —
  keep that half.
- Badge note cites `paged-parse/src/story.rs:264` (dead path).
- L76-86 AnchoredObjectSetting rows all `parsed-not-rendered` — wrong; positions, offsets,
  reference points, alignment are rendered (CK anchor-alignment; LineRefMetrics
  anchored.rs:33-60). `AnchoredPosition` enum: code accepts `Anchored` and `Custom`,
  `AboveLine` and `AbovePosition` (anchored.rs:170-185) — *oracle check* which spelling
  InDesign writes; document only that one.
- L89-96 "Why the count doesn't change": implementation-centric; OK as an aside.
- L126-130 FAQ: "so the renderer can chase the story content once placement lands" — placement landed.
- Missing: `AnchorSpaceAbove` (mentioned on sibling page only), `PinPosition`, inline
  `AnchorYoffset` raising, groups as anchored objects, editability (`anchored*` property paths,
  CK anchored-ops) as implementation aside.

**inline-vs-anchored.mdx**
- L10, L17-18, L22-23: "renderer treats all three the same way today … positions none of
  them yet" — contradicts L50-64 on the same page and the code.
- L66-73 + badge: "InlinePosition lands at the paragraph origin … does not push following
  text" — WRONG since 17d3d3d (see above); the commit message records InDesign's answer:
  inline object = glyph as wide as its visible box, visible bottom on baseline, raised by
  AnchorYoffset.
- L75-77 text wrap: still true (keep).
- L79-87 "Why the records still matter … When the placement pass lands" — obsolete section.
- FAQ L106-117: "Does Paged position anchored objects yet? No …" — WRONG; delete/rewrite.
- Badges: L64 supported OK; L73 wrong; L77 OK (dead path citation).
- xml: no. Missing: above-line alignment + space after, frame-first-line case, leading
  interaction — all now measured in inline_objects.rs.

#### cross-references-hyperlinks/

| path | tier/diataxis | verdict |
|---|---|---|
| cross-references-hyperlinks/index.mdx | intermediate / explanation | fix |
| cross-references-hyperlinks/hyperlinks-and-bookmarks.mdx | intermediate / reference | rewrite |
| cross-references-hyperlinks/cross-references-and-index.mdx | intermediate / reference | rewrite |

**index.mdx**
- L3 description, L16-19 ("renderer does not yet draw them"), FAQ L103-109 ("Not yet …
  slated for SDK Phase 5") contradict body L68-82 (supported). CK: hyperlinks/bookmarks/
  cross-references/index/toc renderer shipped.
- Missing: TOC (CK cross-references-hyperlinks.toc shipped) — not covered anywhere in the
  chapter; `HyperlinkTextDestination`.

**hyperlinks-and-bookmarks.mdx**
- L10 / L17-19 / FAQ L166-171 "neither drawn … Does Paged make hyperlinks clickable? No"
  vs L36-41/L128-141 "supported" — contradictory; the FAQ is wrong.
- L45-49 + table L57-58: "destination is read from `DestinationUniqueKey` when present …
  otherwise from `Destination`" — WRONG precedence and WRONG form. InDesign writes the
  destination as a `<Properties><Destination type="object">` child; precedence is
  `Destination` attribute (engine fixtures) → `<Properties><Destination>` child →
  `DestinationUniqueKey` resolved through the destinations' own keys
  (PP/idml-import/src/designmap.rs:388-390, 411-430: "Storing the bare key here — as this
  once did — left every InDesign-authored link dangling").
- L72-79 / L83-111: `HyperlinkTextDestination` (text-anchor destinations, the most common
  in-document kind) is parsed (designmap.rs:318, 345; inline markers story.rs:1952-1960)
  but has no table; page says "three destination kinds" and lists External instead.
- L78-79 `HyperlinkPageItemSource` and L109-111 `HyperlinkExternalPageDestination`, FAQ
  L159-164 "the parser reads each destination": neither is parsed (no match in
  PP/idml-import or idml-export). Mark not-yet-parsed.
- L56 Source `parsed-not-rendered`: wrong now (source spans → PDF /Annots, CK hyperlinks).
- Missing: authoring is a core op (`insertHyperlink`, protocol 53, incl. `.page` target
  protocol 70; catalog.json:1521) with no update/delete op (CK hyperlinks mutation partial);
  hyperlink save-back via PP/idml-export/src/navigation.rs. Example `with-hyperlink` uses
  the engine-fixture spelling (`Destination="urldest"` attribute on `<Hyperlink>`) rather
  than InDesign's `<Properties><Destination>` — regenerate from an InDesign-shaped fixture.
- xml: no.

**cross-references-and-index.mdx**
- L3, L10, L18-20, L26-29 ("neither resolved or generated yet … step the engine has not built")
  and FAQ L139-145 ("Why doesn't Paged print cross-references or an index? … deferred to SDK
  Phase 5") contradict L57, L99-112 (supported). CK: cross-references renderer shipped
  (live re-resolution), index shipped (dedup + sort).
- L44-45 AppliedFormat/Destination `parsed-not-rendered` — Destination is resolved
  (CO/crates/paged-renderer/src/pipeline/links.rs, module doc "Hyperlinks / cross-references").
- L49-55: "IDML's `CrossReference` element (index see/see-also) … The parser folds these
  into the same cross-reference record" — WRONG: only `CrossReferenceSource` is parsed
  (designmap.rs:443-451); no `CrossReferenceType` / `ReferencedTopic` reader exists in PP.
- L74 / L92 `SortOrder` "not yet applied" vs L109-111 "sorts" — check: index sort is
  case-insensitive by topic name; SortOrder honouring unverified → keep as gap but make
  consistent.
- L78-85: in-story `PageReference`/`IndexEntry`/`Index` markers (story.rs:1465, 1919-1935)
  — *oracle check* whether InDesign writes index markers in stories in this shape or only
  `<Topic>`/`<PageReference>` under the designmap `<Index>`; current fixtures are
  engine-authored. Same for `CrossReferenceFormat` building blocks (not parsed: `Format`
  key read at designmap.rs is for variables).
- Missing: TOC (style-based generated story), `CrossReferenceFormat` building blocks,
  `HyperlinkTextDestination` as xref target.
- xml: no.

#### sections-numbering-variables/

| path | tier/diataxis | verdict |
|---|---|---|
| sections-numbering-variables/index.mdx | intermediate / explanation | rewrite |
| sections-numbering-variables/sections-and-numbering.mdx | intermediate / explanation | rewrite |
| sections-numbering-variables/text-variables.mdx | intermediate / reference | merge (with stories-text/text-variables) + fix |

**index.mdx**
- L70-73, FAQ L124-128: "The `Section` element itself is not parsed. We never read the
  numbering rules" — WRONG. Parsed: PP/idml-import/src/designmap.rs:355-366
  (`continue_numbering`, `start_at`, `PageNumberStyle` incl. child form :380-387,
  `SectionPrefix`, `IncludeSectionPrefix`, `Marker`); section edits re-bake `Page@Name`
  (commit e3c9ba7); CK sections renderer shipped "roman/alpha/arabic + prefix labels".
- L74-75 "Variable values are inlined verbatim … never recomputed" — WRONG (links.rs:33-44
  table: custom, running headers, last page number, page count, chapter number, file name,
  dates are all resolved at emit).
- L85: "`<?ACE 18?>` / `<?ACE 19?>` page-number markers" — WRONG for ACE 19 (section marker;
  PP/idml-import/src/story.rs:1728-1747, "Measured on InDesign 20.0.1 … ACE 19 is the
  SECTION MARKER (not, as this parser used to read it, the next page number)").
- Missing: section marker, chapter number preference, next/previous page number via
  `PageNumberType` on the range.

**sections-and-numbering.mdx**
- L10, L18-21, L40, L50, L71 (heading "not parsed"), L106-111 summary, FAQ L124-128, L136-140
  all say Section is not parsed / naive 1-based fallback only — contradict L82-102 of the
  same page and the code (designmap.rs:355-387; diagnostic `SectionNumberingFallback`,
  CO/crates/paged-renderer/src/diagnostics.rs:62-65).
- L40, L60: dead citations (`paged-parse/src/spread.rs:266`, `pipeline.rs:615/3094`).
- L61-63, L67-68, FAQ L130-134: "next-page marker … `<?ACE 19?>`/U+E019" — WRONG. Next and
  previous page numbers are `<?ACE 18?>` inside a range with `PageNumberType="NextPageNumber"`
  / `"PreviousPageNumber"` (story.rs:1740-1745 → U+E019 / U+E01A); `<?ACE 19?>` → U+E01B
  SECTION_MARKER (CO/crates/paged-model/src/lib.rs:6471-6484; fixture
  CO/crates/paged-gen/src/samples/variables.rs:31-33).
- L76-78 PageNumberStyle values: only cite values the importer maps; *oracle check* Kanji etc.
- Badge L87 `feature="sections-numbering-variables.section-ops"` resolves to "Tracked"
  (mutation-only Insert/Edit/DeleteSection row) — wrong feature for a parse/render claim;
  use `sections-numbering-variables.sections` or `.page-number-resolution`.
- Missing: section marker text, `ChapterNumberPreference`, section ops as implementation aside.

**text-variables.mdx** (overlap note below)
- L40, L84: dead paths (`paged-parse/src/designmap.rs:227`, `story.rs:1643`); real:
  designmap.rs:112/226, story.rs (instance → its own `CharacterRun` tagged `text_variable`,
  links.rs:20-23).
- L47 VariableType `parsed-not-rendered` vs L56-76 executed — fix to supported.
- L61 ChapterNumberType "the section's chapter number, styled per the <Section> numbering
  rules" — WRONG: the DOCUMENT's chapter number from `<ChapterNumberPreference>` (default 1),
  "not a section property" (links.rs:40, InDesign 20.0.1 measured).
- L62 "PageCountType / LastPageNumberType — the real total body-page count" — WRONG on both
  counts: `LastPageNumberType` = the LABEL of the last page of the document or section
  (`PageNumberVariablePreference Scope/Format`), "not a count" (links.rs:38, :220-233);
  `PageCountType` is "the engine's own older name; InDesign does not write it" (links.rs:39)
  — remove it from a format reference.
- L64 Match…StyleType OK; add aliases are non-InDesign (`RunningHeaderType` invented,
  variables.rs:18-21).
- L81: "`TextVariableInstance` inside a CharacterStyleRange's `Content`" — it is a sibling
  inside a range carrying `PageNumberType="TextVariable"` (variables.rs:34; exporter
  PP/idml-export/src/emit.rs:995-997). *oracle-confirmed spelling in the generator.*
- L91-92 AssociatedTextVariable `parsed-not-rendered` — it IS used to resolve (links.rs:200-206).
- L96-102 consistent with code; but L108-110 "Re-display is faithful, recomputation is not"
  and FAQ L129-138 ("never re-derives", "No … the rule it names is never executed") are WRONG.
- L112-113: ACE 19 = next page — WRONG (see above).
- Badges: L76 legacy `supported` OK in substance; L104 feature badge renders "Parsed, partly
  rendered" from stale state note — acceptable only because XrefPageNumber/LiveCaption still
  fall back; fix the registry note.
- Missing: `TextBefore`/`TextAfter`/`Contents` of the preference, `DeleteEndPunctuation`,
  `ChangeCase`, `SearchStrategy`, empty `ResultText` case (RFI C-39), date `Format` tokens,
  custom variables created/instanced via `set` (protocol 71) and their IDML save (v0.71.1
  re-pin; CO/docs/status.md:127-131 still lists it as not reaching the save — status.md
  itself looks stale vs the 6adb3b7 commit message "two pinned defects flip").

**Overlap with stories-text/text-variables.mdx:** the two pages duplicate the same two
AttrTables (TextVariable; TextVariableInstance) with DIFFERENT support values
(stories-text: VariableType/AssociatedTextVariable `supported`; sections: `parsed-not-rendered`),
the same dead citations (designmap.rs:227, story.rs:1643/45/1729), the same wrong ACE 19
claim (stories-text L72-74, L86-87, L119-121), the same self-contradicting FAQ
(stories-text L112-116 "No … renderer inlines that snapshot"), plus a wrong "Unicode tag
block" claim (stories-text L91; U+E018-E01B are Private Use Area). Recommendation: one
canonical reference page (definition + VariableType table + instance shape) in
sections-numbering-variables; stories-text keeps only the run-level marker table (ACE 18
with PageNumberType, ACE 19 section marker, U+E018/E019/E01A/E01B) and links across.

#### conditional-text/

| path | tier/diataxis | verdict |
|---|---|---|
| conditional-text/index.mdx | intermediate / explanation | fix |
| conditional-text/conditions-and-sets.mdx | pro / reference | rewrite |
| conditional-text/visibility.mdx | pro / explanation | fix |

**index.mdx**
- L32, FAQ L85-87: `<Condition>` "declared … in `Resources/Styles.xml`" — WRONG for
  InDesign: direct children of `<Document>` in `designmap.xml` (PP/idml-import/src/styles.rs:678-694,
  "InDesign's own (measured on InDesign 20.0.1, 2026-09-05)"; the Styles.xml
  `<RootConditionalTextGroup>` wrapper was an engine invention "InDesign drops everything
  inside it"). Importer reads both; exporter writes designmap only.
- L35-36 AND rule: see visibility.
- Badge L52 supported OK.

**conditions-and-sets.mdx**
- L16-17, L24-25, L38, L83: Styles.xml location — WRONG (above).
- L51 `IndicatorMethod` values `None | Underline | Highlight` — generator (InDesign spelling)
  writes `UseHighlight` (CO/crates/paged-gen/src/builders/designmap.rs:356; corpus fixture
  `CO/corpus/generated/conditions.idml`). *oracle check* full enum.
- L93 `Conditions` (space-separated) on `<ConditionSet>` — an engine invention that
  "InDesign ignores"; the real form is `<Properties><SetConditions><VisibilityPair
  Condition="…" Visibility="true"/>` (styles.rs:683-690, 723-735). Table needs rewriting.
- L74-77 AND rule, unknown id = visible: matches code (CO/crates/paged-renderer/src/pipeline/tests.rs:1758-1794)
  but see oracle note under visibility.
- Missing: `ConditionalTextPreference` (`ShowConditionIndicators`, `ActiveConditionSet`),
  `IndicatorColor`, condition ops `SetConditionVisible` / `ActivateConditionSet` (CK
  condition-ops shipped) — the page's "active set is never honoured" stance needs revisiting
  against `ActivateConditionSet`.
- Example `conditional-run` (docs/examples/conditional-run/package/Resources/Styles.xml)
  uses the non-InDesign Styles.xml placement and `IndicatorMethod="Underline"`; regenerate.
- xml: no.

**visibility.mdx**
- L36-38 / FAQ L89-92: strict AND across conditions. Code agrees, BUT the InDesign
  reference PDF for the fixture `CO/corpus/generated/conditions.pdf` (InDesign 20.0.1,
  exported 2026-09-08) extracts as `ALWAYS SHOWME DROPME BOTHME` — i.e. InDesign printed
  both the hidden-gated and the multi-gated run. Either the reference predates the
  designmap move (idml 2026-10-06, pdf 2026-09-08) or the drop rule disagrees with the
  oracle. *Oracle check required before the AND claim is published.*
- L45 / L69 / L79 badges cite dead paths (`pipeline.rs:2765`, `paged-parse/src/styles.rs:114/119`).
- L71-79 "Active-set toggling is not honoured": the engine has `ActivateConditionSet`
  (CK conditional-text.condition-ops) — clarify file vs operation.

#### tagged-xml/

| path | tier/diataxis | verdict |
|---|---|---|
| tagged-xml/index.mdx | intermediate / explanation | fix (minor) |
| tagged-xml/the-structured-content-layer.mdx | pro / reference | current (format facts) |
| tagged-xml/why-its-not-parsed-yet.mdx | pro / explanation | fix (still true; rewrite citations) / or merge into index |

- **why-its-not-parsed-yet — still true.** No XMLElement / XMLStory / XMLTag reader exists
  in PP/idml-import or core (grep: only `idPkg:BackingStory` name matches in
  PP/idml-export/src/text_variables.rs:61 and navigation.rs:1151, both writer-side
  pass-throughs). CK tagged-xml.structure: planned, "backing store skipped by design".
- Stale specifics: L55 badge `core/crates/paged-parse/src/designmap.rs`, L64 badge
  `core/crates/paged-parse/src/lib.rs — Container::open` → now PP/idml-import/src/designmap.rs
  and `open_source_archive` (PP/idml-import/src/lib.rs:112). L59-61 "the rest are kept as raw
  bytes for the higher layers" still true (`SourceArchive`, lib.rs:89-101).
- Missing (all three pages): the layer is **preserved on save** — save-back copies every
  unmodelled entry byte for byte, explicitly including "the XML backing store"
  (PP/idml-export ADR 652, `crates/idml-export/src/lib.rs:22-25`; corpus byte-identity
  99/99 packages, CK plugin-publish.byte-identity-sweep) and `.paged` keeps the IDML parts
  (ADR 118). "Not parsed" ≠ "lost". Also `paged-gen` writes BackingStory/Tags/Mapping for
  every fixture (CO/crates/paged-gen/src/builders/xml_folder.rs) — the "present in every
  package" claim is consistent.
- index L69-74 "the design map's reference to the backing story is dropped on the floor" —
  true for import; the exporter does see `idPkg:BackingStory` (navigation.rs:1151).
- the-structured-content-layer: format-only; no code contradictions found. Badge
  `feature="tagged-xml.structure"` → Planned, OK. xml: no (no example by design).
- Implementation-vs-format: why-its-not-parsed-yet is entirely about Paged's parser; fold its
  short status into index and drop the page, or move to a Paged-implementation section.

#### companion-formats/

| path | tier/diataxis | verdict |
|---|---|---|
| companion-formats/index.mdx | intermediate / explanation | fix (minor) |
| companion-formats/the-companion-formats.mdx | pro / reference | current |
| companion-formats/when-each-applies.mdx | intermediate / explanation | current (minor) |

- Still true: no `.idms` / `.icml` / `.icma` reader anywhere (only a fixture-builder
  mention in CO/crates/paged-gen/src/builders/designmap.rs). CK companion-formats.idms-icml planned.
- index L58-60, FAQ L83-87; when-each-applies L76-79, L121-123: "Paged's one entry point
  opens an archive, requires the IDML mimetype" — stale. `LoadDocument` opens `.idml` or a
  `.paged` container (CO/docs/status.md "Open and create"), and plugins import DOCX/PDF/PPTX
  (plugin-doc, plugin-publish `@paged-media/pdf`, plugin-slide). Reword to "the IDML importer".
- the-companion-formats L36-47: `aid` PI table — format facts, fine; the Snippet `SnippetType`
  values are plausible but *oracle check* (no fixture in our code).
- Badges: feature= rows Planned, legacy not-yet-parsed — consistent. xml: no.
- Missing: INX (mentioned only in round-tripping), `.indl` library container shape (a library
  is a binary/zip container, not "standalone XML" — *oracle check*; when-each-applies L37-40
  and the-companion-formats L68-76 assert library items are snippets).

#### round-tripping/

| path | tier/diataxis | verdict |
|---|---|---|
| round-tripping/index.mdx | pro / explanation | rewrite |
| round-tripping/version-markers.mdx | pro / reference | fix |
| round-tripping/compatibility.mdx | pro / explanation | rewrite |

The chapter discusses round-tripping abstractly and never mentions that Paged now WRITES
IDML. Biggest content gap in group C.

**index.mdx**
- L17-19, L50-53, FAQ L82-87: "parser records the version markers but never branches on
  them" — true, but omits that `DOMVersion` is now read and re-stamped on export
  (PP/idml-import/src/designmap.rs:134; PP/idml-export/src/lib.rs:377-379, emit.rs:78).
- Missing: IDML save-back (ADR 652: copy unchanged entries byte for byte, patch what the
  model changed, generate only new parts), the byte-identity result (99/99 corpus packages,
  11,876 entries, 0 gaps — CK round-tripping.idml-reserialization), the save-back defect
  class (CK plugin-publish.save-back-defects: object styles, master spreads, z-order,
  ItemTransform/StrokeWeight source spelling kept, FillTint −1 preservation), `.paged` =
  valid IDML ZIP (ADR 118), the "what the format could not carry" list on IDML export
  (CO/docs/status.md:84; e.g. opacity masks are paged-native, CK effects-transparency.opacity-mask),
  InDesign as oracle (ADR 120 / ADR 653), and known not-yet-saved object-model state
  (CO/docs/status.md:127-131).

**version-markers.mdx**
- L59, L86, L117, L125: dead paths `core/crates/paged-parse/src/{story,designmap}.rs`.
- L85-90, FAQ L115-120: "never reads `DOMVersion`" — WRONG: read into `dom_version`
  (designmap.rs:134), written back on every generated part and into the `.paged` manifest
  (`domVersion`, PP/idml-export/src/paged.rs:182; ADR 118). Still no branching (true).
- L57-60, FAQ L122-126: "the `<?ACE?>` markers … stand in for auto page numbers" — ACE 18 page
  numbers AND ACE 19 section marker (story.rs:1728-1747); other ACE codes (tabs, indent-to-here,
  footnote markers) — check what the importer maps before listing.
- L92-95 "parser-level test fixtures carry DOMVersion 13.1" — now 18.5/20.0 in
  PP/idml-import/src/designmap.rs tests (:716, :894, :926); drop the specific claim.
- L34-36: "IDML reader treats this instruction as mandatory" — InDesign-behaviour claim;
  *oracle check* or source it to our fixture work.
- Badge L62 `parsed-not-rendered` is a category error (nothing to render); use a plain note.
- xml: no; example `two-stories` OK.

**compatibility.mdx**
- L83-85, FAQ L123-129 "never reads DOMVersion": see above.
- L97-101 books: still true (no book support found).
- L26-35 "What survives": written as format theory; should state what Paged's writer
  guarantees (unchanged entries byte-identical; changed attributes patched; unmodelled
  parts — fonts, preferences, tags, metadata, XML backing store — copied).
- Implementation-vs-format: L73-105 is about Paged's reader. Recommend splitting: a format
  page (markers, additive vocabulary, INX for backward) and a Paged page (reader + writer
  guarantees, save-back, `.paged`).

#### edge-cases/

| path | tier/diataxis | verdict |
|---|---|---|
| edge-cases/index.mdx | pro / explanation | fix (move) |
| edge-cases/the-error-model.mdx | pro / reference | fix (move) |
| edge-cases/graceful-degradation.mdx | pro / explanation | fix (move) |

All three pages are about **Paged's implementation**, not the format (index L69-75 says so
itself). Recommend moving to the Paged/engine docs and leaving a short format-side page on
"what InDesign tolerates" (oracle-measured) if wanted.

**index.mdx** — L36, L59-60, L74: `Document::open` → `import_idml` (PP/idml-import/src/lib.rs:177-188);
also `.paged` load path (model part wins; IDML parts fallback, ADR 118) is a second error surface.

**the-error-model.mdx**
- Enums still match: `ParseError {NotIdml, MissingEntry, Io, Zip, Xml}` and
  `OpenError {MissingEntry, Parse}` (PP/idml-import/src/lib.rs:76-87, 163-168). Message
  text "manifest lists … but archive has no such entry" matches :164.
- L29, L35: `Container::open` / `Document::open` renamed (above). The layer now lives in
  plugin-publish, compiled into the engine (plugin-publish ADR 651).
- Missing: how the error reaches wasm/SDK hosts (load reply / diagnostics), `.paged`
  container load failures, `paged` CLI exit codes beyond paged-inspect.
- ```text fence only.

**graceful-degradation.mdx**
- L112-127 (+ badge `parsed-not-rendered`), L166, FAQ L197-201: "Group-nested text frames
  are parsed and counted, but not laid out" — WRONG. Groups are first class; the counter
  "historically counted frames nested inside a `<Group>`; groups became first-class long
  ago and the counter now covers the paste-into corners that remain approximate"
  (CO/crates/paged-model/src/lib.rs:6134-6142; PP/idml-import/src/spread.rs:795, 1039).
- L132: `<EPSImage>` → `<EPS>` (spread.rs:2160-2166).
- L176-185 diagnostics list incomplete: also `ImageClippingPathDeferred`, `FontSubstituted`,
  `ImageContentUnrenderable` (CO/crates/paged-renderer/src/diagnostics.rs:41-80).
- FAQ L199-201 "missing images do not yet report themselves in structured output" —
  contradicts L147-153 (they do: `ImageLinkMissing`).
- L94 / L100 caps 16 / 256 still correct (CO/crates/paged-model/src/lib.rs:5950;
  CO/crates/paged-scene/src/lib.rs:138).
- L65-70 out-of-range tint → unset: correct (util.rs:141-165) — but the `-1` sentinel is
  not "malformed", it is IDML's explicit "no override"; say so.
- Badges: L77/L104 supported OK; L127 wrong (see above); L147 OK.

#### comparisons/

| path | tier/diataxis | verdict |
|---|---|---|
| comparisons/index.mdx | intermediate / explanation | current |
| comparisons/idml-vs-other-formats.mdx | intermediate / explanation | fix (one claim) |
| comparisons/where-idml-fits.mdx | intermediate / explanation | fix (minor) |

- idml-vs-other-formats L18-20 ("open and readable like XML, fully composed like a PDF"),
  L111-115 ("carries the fully composed page"), FAQ L153-154: IDML stores no line breaks or
  glyph positions; the reader recomposes text (overset and line breaks can differ from
  InDesign — the reason for the fidelity gate, ADR 105/120). where-idml-fits L78-80 already
  says the renderer composes lines; make the vs-page consistent ("fully specified layout,
  text recomposed by the reader").
- where-idml-fits L69-88: says Paged "turns IDML into pages" only; Paged also edits and
  writes IDML back (save-back) and uses `.paged` as a superset container — one paragraph.
- Missing: IDML vs `.paged` (ADR 021/118: a `.paged` is a valid IDML package plus `paged/`
  parts), IDML vs ICML/IDMS (pointer to companion-formats), IDML vs DOCX/PPTX (Paged imports
  both via plugins). No badges, no xml, no code claims otherwise.

#### cookbook/

| path | tier/diataxis | verdict |
|---|---|---|
| cookbook/index.mdx | intermediate / explanation | current |
| cookbook/apply-a-gradient.mdx | intermediate / how-to | fix |
| cookbook/build-a-table.mdx | pro / how-to | current |
| cookbook/place-an-image.mdx | intermediate / how-to | fix |

- index L17, L72: links `/docs/paged/engine/test-corpus` — verify the route still exists
  after the docs split to idml.paged.media (cross-site link).
- **apply-a-gradient** L63-64, FAQ L90-91: "A Radial gradient … always runs from its center
  outward" — WRONG: a radial is centred at the shape's `GradientFillStart`
  (CO/docs/status.md:44, ADR 129; PP/idml-import/src/spread.rs:372). Also L32-33 Midpoint OK.
  Recipe should mention `GradientFillStart`/`GradientFillLength` for radial.
  L55-57 "FillColor resolves the id at parse time": resolution happens at render/paint
  time (color_paint.rs); minor.
- **build-a-table**: no contradictions found. `col:row` naming and omitted covered cells
  match the generator (CO/crates/paged-gen/src/samples/tables.rs:225-247). Could add cell
  fill tint caveat (CO/docs/status.md:133 — cell tint not modelled) if the recipe mentions tints.
- **place-an-image** L51-52, FAQ L72-73: "Don't look for a 'ContentType' or frame flag —
  there isn't one" — WRONG as a format statement: `ContentType` exists on page items (our
  generator writes `ContentType="TextType"`, CO/crates/paged-gen/src/builders/page_item.rs:907;
  the `placed-image` example's spread carries `ContentType="TextType"`). InDesign writes
  `GraphicType` on graphic frames (*oracle check*); the true statement is "the nested
  `<Image>` is what the renderer keys on". The example itself should probably carry
  `ContentType="GraphicType"`.
  L60-62 links vs embeds OK. L29-31 GraphicBounds: not read by the importer (no match) —
  say "carried, not used".
- No badges, no xml blocks.

---

### Implementation-vs-format pages

Pages whose substance is Paged's behaviour rather than the IDML format:
- edge-cases/* (all three) — renderer/importer error and tolerance contract.
- round-tripping/compatibility.mdx L73-105 and version-markers.mdx L55-60, L83-97.
- tagged-xml/why-its-not-parsed-yet.mdx (entire page).
- companion-formats/when-each-applies.mdx "What supporting them would require".
- anchored-objects.mdx "Why the count doesn't change" (paged-inspect counts).
- conditional-text/visibility.mdx (renderer rule; format half is two sentences).
For idml.paged.media these should move to the engine docs or into clearly marked
"In Paged" asides.

### MISSING TOPICS

1. **Effects & transparency chapter** — none exists. Cockpit has 11 shipped features
   (CK effects-transparency.*: drop shadow, inner shadow, outer/inner glow, bevel & emboss,
   satin, feather, directional feather, gradient feather, blend modes, opacity,
   transparency groups). Format facts to document from our own measurements (ADR 104):
   `Size` is the band width (σ = Size/2 outside, 0.4×Size inside), `Choke`/`Spread` are
   fractions of Size, `Angle` names the light direction (offset x = −d·cos, y = +d·sin);
   shadows on every shape (ADR 130); stroke/fill/content transparency settings; opacity masks
   are paged-native (no IDML element).
2. **Colour management / document colour settings** — CMYKProfile/RGBProfile/intents in
   designmap, host-registered profiles, soft proof, Ink Manager.
3. **Save-back / writing IDML** — byte-splice patching (ADR 652), byte-identity sweep,
   defect class, `.paged` container (ADR 118), InDesign oracle loop (ADR 120/653).
4. **`<Tint>` swatch** and the `FillTint="-1"` sentinel.
5. **TOC** (generated, style-based) — shipped, undocumented.
6. **Frame fitting** (`FrameFittingOption`) and image metadata (PPI, colour space).
7. **Text wrap** (`TextWrapPreference`, fixture text_wrap.rs) — check whether another chapter
   (frames-paths/layout) owns it; anchored-object wrap is the known gap.
8. **Section marker and next/previous page numbers** (`<?ACE 19?>`, `PageNumberType`).
9. **HyperlinkTextDestination** and the `<Properties><Destination>` form.
10. **ConditionSet `VisibilityPair`** and `ConditionalTextPreference`.
11. Possibly: interactive elements (buttons, registry chapter interactive-dynamic), Notes /
    tracked changes, Articles (parsed: designmap.rs:391-409).

### Summary

1. Of 40 pages: 7 current, 23 fix, 9 rewrite, 1 merge, 0 delete; edge-cases/* and parts of round-tripping/tagged-xml are Paged-implementation docs and should move out of the format reference.
2. The dominant defect is half-updated pages: bodies say "supported", while the In-short blocks and FAQs still say "not yet". This affects anchored objects, cross-references/hyperlinks, sections, text variables and gradients.
3. Hard errors against code and the InDesign oracle: ACE 19 is the section marker; conditions live in designmap.xml and ConditionSet uses VisibilityPair; the tag is `<EPS>`, not `<EPSImage>`; the hyperlink destination precedence is wrong; `<Tint>`, Lab, Midpoint, Section, inline anchoring and group frames are all now implemented. Also the wasm colour path uses qcms, so the "browser = naive" claim is wrong.
4. Every code citation (paged-parse, Container::open, pipeline.rs:N) is dead. The SupportBadge feature= statuses still come from the retired retired state source, not registry. No ```xml blocks exist in group C.
5. tagged-xml "why it's not parsed yet" is still true, but it should add that the XML layer survives save-back byte for byte. The biggest missing topics are effects/transparency, colour management, IDML save-back/.paged, TOC, and the AND rule for conditional text: InDesign's reference PDF appears to print runs that our rule drops, so that needs an oracle check.
