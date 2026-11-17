# ADR 810 — The Next Edition: one chrome for the three sites, the brand's tokens and type, the lab, the field guide and a page index for paged.media

- **Status:** Accepted, 2026-11-17.
- **Follows:** paged-media/website ADR 861 (The Next Edition), which makes the design study
  "The Next Edition / Volume 05" the brand of paged.media, docs.paged.media and
  idml.paged.media, with real content in every slot.
- **Scope:** `app/brand.css`, `scripts/check-tokens.mjs`, `app/fonts/`, `app/layout.tsx`,
  `app/layout.config.tsx`, `app/global.css`, `app/editorial.css`, `app/edition.css`,
  `lib/masthead-nav.ts`, `components/masthead.tsx`, `components/record-strip.tsx`,
  `components/site-footer.tsx`, `app/(home)/`, `app/(docs)/`, `components/mdx/example-tabs.tsx`,
  `components/mdx/element-reference.tsx` (+ module CSS), `components/search-dialog.tsx`,
  `app/search-index.json/route.ts`, `public/_headers`, `scripts/generate/gen-field-guide.mjs`,
  `components/mdx/field-guide.tsx`, `content/docs/idml/field-guide.mdx`, `lib/shiki-theme.ts`,
  `app/opengraph-image.png/route.tsx`, `tests/browsers/`.

## Context

The website and the two documentation sites looked like three projects: each had its own
masthead, its own footer and its own reading of the brand. The brand itself has moved: its
token file (`brand/docs/colors_and_type.css`) now carries the values of the design study
(paper `#f3f0e8`, one red `#b51f19`, a night set for dark sections, Newsreader and DM Sans,
the system mono), changed from the study only where the study fails WCAG AA. The docs app
still carried an older copy of the tokens, four font families loaded through
`next/font/google` (a network fetch at build time that has failed CI runs), and colours
written out in the syntax theme and the social card.

paged.media is getting a ⌘K search over its own pages. Readers search for documentation
from there too, and the Orama index at `/api/search` (ADR 808) is an engine-specific
format, larger than a list of pages needs to be.

## Decision

1. **One chrome, shared with the website.**
   - **Masthead** (`components/masthead.tsx`): sticky, paper at .965 over an 18px blur, a
     1px ink rule, 75px tall. The `Paged.` wordmark (Newsreader 600, a red full stop) links
     to paged.media; the line "The open publishing system"; the sections Product,
     Solutions, Editions, Docs, IDML Reference; the tools Library, Studio, Site atlas;
     search; the theme switch; the red "Open editor" to play.paged.media. The site being
     read is marked with the red rule and `aria-current`. Solutions links to the website's
     first solution page instead of opening its panel, so the masthead needs no script.
   - **The data is one file**, `lib/masthead-nav.ts`, which mirrors the website's
     `apps/site/src/editorial/nav.ts`; the browser tests pin the list. An address on the
     site's own origin is written as a root path, so it stays on a preview deployment.
   - **Fumadocs keeps the docs layout.** The masthead sits above every layout in
     `app/layout.tsx`; Fumadocs' sidebar, table of contents and phone bar stick under it
     through `--fd-banner-height`. Its own title becomes the edition's label at the head of
     the sidebar, and its search and theme switch are turned off in the layout options;
     the masthead carries Fumadocs' own trigger (`button[data-search-full]`) and switch
     (`[data-theme-toggle]`). The home pages use no Fumadocs layout. On a phone the
     masthead is the wordmark, search and a `<details>` menu; Fumadocs' bar below it opens
     the sidebar drawer.
   - **Ribbon** (`components/record-strip.tsx`): 34px, a hairline, 10px spaced caps. The
     edition on the left ("The technical edition", "The independent format atlas"), the
     record on the right, as before: the engine release, the record's date with its
     freshness check, the status page. Its landmark, name and hooks are unchanged.
   - **Footer** (`components/site-footer.tsx`): the dark footer of the study on the
     brand's night tokens — the wordmark, "The page belongs to everyone. The future
     belongs to the makers.", Discover / Make / Understand with absolute links, then the
     attribution, the independence note and the licences. The home pages close with the
     full footer, every docs page with a compact one. No inline styles.
2. **The tokens are the brand's, vendored and checked.** `app/brand.css` is a copy of the
   brand file's `:root`, its type classes and its motif utilities; the only difference
   allowed is that the serif and sans roles name the next/font variable first.
   `scripts/check-tokens.mjs` (`pnpm check:tokens`, run in `build.yml`) fails on a token
   that is missing, has another value, is not a brand token or is declared twice. It reads
   the brand checkout at `../brand` or `$PAGED_BRAND_DIR`, says so and skips without one,
   and fails without one under `PAGED_REQUIRE_BRAND=1`. It is the website's check, with
   this file's path. The syntax theme and the social card, which cannot read CSS
   variables, take the new values by hand.
3. **Fumadocs reads the tokens.** Its primary is the red, its ground the paper, its
   borders the hairline; the current page in the sidebar is red with a 2px rule. The dark
   theme stays (the switch is tested) and maps onto the brand's night set: the instrument
   ground, its ink and muted, the accent and focus lifted for night. A red fill carries
   night ink in the dark theme, where white on the lifted red would fail AA.
4. **Two faces, self-hosted.** Newsreader (opsz and wght, roman and italic) and DM Sans
   (opsz and wght, roman and italic), Latin subset, committed as woff2 under `app/fonts/`
   from `@fontsource-variable/*` 5.3.0, loaded with `next/font/local`; the README there
   names the files, the versions and the OFL. The two romans and Newsreader's italic, which
   the front pages' headlines set above the fold, are preloaded; DM Sans italic is declared
   by a second `localFont` call into the roman's family with `preload: false`, so it loads
   the first time running text needs it and is never synthesised. Source Serif 4, IBM Plex
   and Cormorant Garamond are retired; the mono is the system stack. No font is fetched at
   build time.
5. **Reading pages at the study's scale.** The page title is the study's docs headline
   (`clamp(47px, 4.4vw, 78px)`, −0.06em) under a red mono kicker naming the site and
   chapter; h2 and h3 are Newsreader set light; the description under the title is the
   serif lead. Running text is DM Sans at 16/1.78 on the 66ch measure: the pages are dense
   with inline code, which sits better in the sans; the serif is kept for leads,
   headlines, quotations and the "In short" panel. A page may set a two-line `headline`
   in its front matter, the second line in red italic; `title` stays what search and the
   sidebar show. An element entry opens with its tag as the kicker and its name at display
   size with the red full stop; its definition is the serif lead, its relationship plate
   is on night and its tables are hairlines.
6. **The example lab.** `ExampleTabs` takes the study's Read / Run / Inspect form: a slate
   panel, square tab buttons, a mono heading naming the part and the view, the code on
   night in the night syntax palette, and the live render on a paper sheet. The live view
   is the engine's own render (ADR 803), so its heading says "the Paged engine"; the
   study's "not engine output" note is not used. Tab names and every test hook stay.
7. **The field guide** (`/field-guide/`, idml.paged.media). The study's illustrated field
   guide, built on one InDesign-verified example, `based-on-chain`: its page as InDesign
   exports it is the plate; A, B and C mark its text frame, the frame's story and the
   paragraph style the story applies; five stops — the document package, the spread, the
   text frame, the story, the style — each list the attribute names the example's XML
   gives that element and link to its reference entry. `gen-field-guide.mjs` reads the
   positions and names from the example's IDML at build time (the frame's path through
   its ItemTransform into page space; the first line from the resolved style chain);
   nothing is placed by hand. Each hotspot is a drop pin: its mark sits just under the point
   it marks (a dot, or a rule the width of the indent) and its disc hangs below, so no marker
   covers the type. The caption names the example and the commit its bytes come
   from. Without JavaScript the hotspots and stops are links to anchors and all five cards
   are in the page; a small script only moves the highlight. It is an MDX page, so the
   sidebar, search, the sitemap and llms.txt list it like any other.
8. **A page index for paged.media.** Each build emits `/search-index.json`:
   `{ schema: "paged.search.index/1", site, origin, generatedAt, pages: [{ title, url,
   kind, description }] }`, every page with its absolute canonical URL and the kind label
   search shows (`lib/search-kinds.ts`). `public/_headers` serves it with
   `Access-Control-Allow-Origin: *`. The Orama index at `/api/search` and its CORS for the
   sibling site are unchanged (ADR 808). The search dialog takes the study's overlay: a dark
   backdrop with a blur, a paper dialog on an ink rule, the query in the serif at display
   size, the kind in red mono beside a serif title.

## Alternatives considered

- **Fumadocs' `nav.component` or a custom header slot for the masthead.** The docs header
  slot is a cell of Fumadocs' grid and shows on phones only; putting the masthead there
  would mean redrawing the grid. Rendering it above the layout and moving Fumadocs' sticky
  offset is the supported way and leaves the sidebar and drawer as Fumadocs ships them.
- **Import the brand file at build time.** The site would not build without a brand
  checkout, and CI has none. A vendored copy with a check keeps the build self-contained
  and makes drift visible where a checkout exists.
- **The field guide as its own full-width route.** Matches the study's page more closely,
  but would need its own entries in the sitemap, search and both indexes, and a route that
  exists in one site's build only. As an MDX page in `full` width it gets all of that from
  the page contract.
- **Hotspots positioned by hand on the raster.** Faster, and wrong the day the example
  changes.

## Consequences

- A change to the brand tokens is copied into `app/brand.css` here and in the website;
  `check:tokens` fails until it is, wherever a brand checkout is present.
- A change to the masthead or footer links is made in `lib/masthead-nav.ts` and the
  website's `nav.ts` together; the browser tests fail on a change to one alone.
- The field guide follows `examples/based-on-chain`: if its frame, story or style changes,
  the plate moves with it at the next build, and the guide's tests check the anchors and
  the reference links, not the coordinates.
- `/search-index.json` is a public contract with paged.media's search; a change to its
  shape needs a new `schema` value.
