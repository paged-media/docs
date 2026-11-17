# Fonts

The two faces of the brand (`app/brand.css`), self-hosted with `next/font/local`
(`app/layout.tsx`). Nothing is fetched from a font CDN at build or run time.

| File | Face | Axes | Source |
|---|---|---|---|
| `newsreader-latin-opsz-wght-normal.woff2` | Newsreader | opsz 6–72, wght 200–800 | `@fontsource-variable/newsreader` 5.3.0, `files/newsreader-latin-opsz-normal.woff2` |
| `newsreader-latin-opsz-wght-italic.woff2` | Newsreader Italic | opsz 6–72, wght 200–800 | `@fontsource-variable/newsreader` 5.3.0, `files/newsreader-latin-opsz-italic.woff2` |
| `dm-sans-latin-opsz-wght-normal.woff2` | DM Sans | opsz 9–40, wght 100–1000 | `@fontsource-variable/dm-sans` 5.3.0, `files/dm-sans-latin-opsz-normal.woff2` |
| `dm-sans-latin-opsz-wght-italic.woff2` | DM Sans Italic | opsz 9–40, wght 100–1000 | `@fontsource-variable/dm-sans` 5.3.0, `files/dm-sans-latin-opsz-italic.woff2` |

The two romans and Newsreader Italic are preloaded (the front pages' headlines set the
italic above the fold). DM Sans Italic is not: `app/layout.tsx` loads it with a second
`localFont` call that declares it into the roman's family, so it is fetched the first time
running text needs it.

Only the Latin subset is shipped (U+0000–00FF and general punctuation). A glyph
outside it falls back to the next family in the role's stack.

Both faces are licensed under the SIL Open Font License 1.1; the licence texts,
with their copyright lines, are `OFL-newsreader.txt` and `OFL-dm-sans.txt`.

- Newsreader: Copyright 2020 The Newsreader Project Authors
  (https://github.com/productiontype/Newsreader).
- DM Sans: Copyright 2014 The DM Sans Project Authors
  (https://github.com/googlefonts/dm-fonts).

To update: bump both packages in `package.json` (devDependencies), copy the four
files above from `node_modules/@fontsource-variable/*/files/` under the names in
the table, and change the version here.

The mono is the system stack named by the brand (`--font-mono`); no file ships.
