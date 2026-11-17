# ADR 811 — One scripting lab per page, tables that fit their column, and slots for recorded imagery

- **Status:** Accepted, 2026-11-17.
- **Follows:** [ADR 810](810-next-edition-chrome.md) (the lab look), [ADR 804](804-static-export-hosting.md)
  (the cross-origin-isolated host the editor frame needs), the editor's ADR 212 (one automation
  surface) and its embedding API (`apps/editor/apps/canvas/src/embed/` in paged-media/paged).
- **Scope:** `components/mdx/scripting-lab.tsx`, `scripting-lab-client.tsx`,
  `scripting-lab-stage.ts`, `lib/editor-embed.ts`, `components/mdx/live-demo*.tsx`,
  `components/mdx/scripting-catalog*.tsx` (+ module CSS), `path-reference-view.tsx`,
  `sdk-catalog*.tsx`, `components/mdx/prose-table.tsx`, `source.config.ts` (`rehypeTableMeta`),
  `components/mdx/editor-figure.tsx`, `data/editor-figures.ts`, `lib/webp-size.ts`,
  `app/opengraph-image.png/`, `app/global.css`, `app/edition.css`,
  `scripts/capture-inspector.mjs`, `tests/browsers/{tables,lab}.spec.ts`.

## Context

- **The showcases.** `scripting/showcases` rendered ten `<PathShowcase>`s, each embedding the
  whole editor (`?embed=script&seed=…`) at half size: ten copies of the editor's chrome in a
  narrow band, and "Load & run" only loaded. The tutorial and the scripting overview did the
  same, five and one times.
- **The tables.** The scripting catalog's tables were inline-styled with `nowrap` signatures
  and grew to 1217–1337 px in the 836 px column; Returns and Summary were cut off at every
  width. A sweep of both sites found 44 pages on docs.paged.media and 223 on
  idml.paged.media with a table wider than its column at 390 or 1440.
- **The imagery.** The docs had no stills of the editor, the live demos were dark boxes with
  hard-coded colours that stayed empty without WebGPU, and the social card was drawn in
  next/og's fallback font.

## Decision

1. **One lab, theme tabs.** `<ScriptingLab themes="all" />` is the showcases page: the ten
   themes as an ARIA tablist (arrow keys, Home and End; each tab is also the anchor
   `#theme-<id>`, so old links select it), the theme's paths with the script's own marked,
   and a workspace — the script in the self-hosted Monaco with Run, Reset, Copy and "Open in
   the editor", the stage, "Look for" and the console. `<ScriptingLab id script seed lookFor />`
   is the same workspace for one script (the tutorial, the overview).
2. **One editor per page, loaded on Run.** Nothing is requested from play.paged.media until a
   reader presses Run. The first Run makes one frame for the page; it is positioned over the
   stage of the lab that ran last rather than moved into it, because a moved iframe reloads.
   Every run blanks the document, runs the seed's prelude (`data/scripting/seeds.ts`) and then
   the script; once loaded, another tab runs at once, Reset re-seeds without running, and
   Before / After switch between the two.
3. **The embedding API, with the legacy page behind the same adapter.** The lab speaks the
   editor's iframe bridge (`paged:init`, `paged:call`, `paged:reply`, `paged:ready`) through a
   docs-side copy of `connectEditor` (`lib/editor-embed.ts`; `@paged-media/editor` is not on
   npm yet): `profile: "viewer"`, so the frame is the canvas alone, with `role: "editor"`,
   because the viewer's role writes nothing; `seed` in the frame's config; `fitSelection()`
   after each run. Until play.paged.media serves those two and lets this origin frame
   `embed.html`, `LAB_EMBED` in `scripting-lab-stage.ts` is `'legacy'`: the older
   `?embed=script&seed=` page and its `paged:run` message, the whole editor at half size.
   Changing that constant switches; `?lab-embed=connect` tries the new path on a deployed page
   first. The legacy branch is marked REMOVE-LEGACY.
4. **A stage is never empty and never fake.** Before Run, and where `navigator.gpu` is missing,
   the stage shows the theme's recorded result (`public/scripting/lab/<id>.webp`, the editor's
   film stills) or, until one is recorded, says on paper what Run will do. Without WebGPU, Run
   is replaced by a note. `<LiveDemo>` takes the same form: the lab panel, a recorded frame
   (`public/demos/<id>.webp`) or the same honest empty stage, and the same note.
5. **No table is wider than its column.** In `#nd-page`, cells and the code in them break where
   they must; Markdown tables are wrapped by `<ProseTable>`; generated catalogs (scripting,
   path reference, viewer SDK) are ledgers with fixed column widths that stack under their
   column names on a narrow column. A table with too many columns for a phone — five or more
   in Markdown (`rehypeTableMeta` counts them), the capability and comparison matrices, the
   fact ledger, the element reference's tables — sits in a labelled, focusable scroll region
   (`role="region"`, a name, `tabindex="0"`), the only place a table may scroll sideways.
   `tests/browsers/tables.spec.ts` walks every page of each sitemap at 1440 and 390.
6. **Stills have a slot before they exist.** `<EditorFigure id>` and `<EditorFigures ids>` show
   `public/editor/<id>.webp` with its caption and a provenance line naming the commit it was
   recorded at; `data/editor-figures.ts` holds the ids, captions, alt text and provenance. A
   figure without its file or its provenance renders nothing. The inspector's still is
   captured from this site's build by `scripts/capture-inspector.mjs`.
7. **The social card is set in the brand's faces.** next/og reads no WOFF2, so static WOFF
   files from `@fontsource/newsreader` and `@fontsource/dm-sans` sit beside the route with
   their licence.

## Consequences

- The lab's tests run against a stand-in editor (`tests/browsers/editor-stub.html`) that
  speaks both protocols; CI needs no editor and no GPU. Whether the real editor answers is
  checked on the deployed site, with WebGPU, before `LAB_EMBED` changes.
- When `seed` and `fitSelection` reach play.paged.media and docs.paged.media is in its
  `VITE_EMBED_ORIGINS`, flip `LAB_EMBED`, then delete the legacy branch; `<ScriptingPlayground>`
  stays for the examples gallery until it moves to the same stage.
- The lab's and the demos' stills, and the editor figures, arrive from the editor's film
  stills; until then the pages show the empty stage or nothing, and the build lists a figure
  whose file is there without its provenance.
- A new generated table follows rule 5 or fails the sweep.
