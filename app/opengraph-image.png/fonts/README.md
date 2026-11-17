# Social card faces

Static WOFF files for the site's social card (`../route.tsx`). `next/og` reads
TTF, OTF and WOFF, not WOFF2, so the card cannot use the variable WOFF2 faces in
`app/fonts/`; these are the same two families, Latin subset, at the weights the
card sets.

| File | Face | Source |
|---|---|---|
| `newsreader-latin-400-normal.woff` | Newsreader Regular (the title) | `@fontsource/newsreader` 5.3.0, `files/` |
| `newsreader-latin-300-italic.woff` | Newsreader Light Italic (the title's red line) | `@fontsource/newsreader` 5.3.0, `files/` |
| `newsreader-latin-600-normal.woff` | Newsreader SemiBold (the wordmark) | `@fontsource/newsreader` 5.3.0, `files/` |
| `dm-sans-latin-400-normal.woff` | DM Sans Regular (the line under the title) | `@fontsource/dm-sans` 5.3.0, `files/` |
| `dm-sans-latin-700-normal.woff` | DM Sans Bold (the labels) | `@fontsource/dm-sans` 5.3.0, `files/` |

Both faces are licensed under the SIL Open Font License 1.1; the licence texts,
with their copyright lines, are `OFL-newsreader.txt` and `OFL-dm-sans.txt`.

- Newsreader: Copyright 2020 The Newsreader Project Authors
  (https://github.com/productiontype/Newsreader).
- DM Sans: Copyright 2014 The DM Sans Project Authors
  (https://github.com/googlefonts/dm-fonts).

To update: bump both packages in `package.json` (devDependencies) together with
`@fontsource-variable/*`, copy the five files from `node_modules/@fontsource/*/files/`
and change the version here.
