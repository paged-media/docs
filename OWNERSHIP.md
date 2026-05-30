# Ownership

Each top-level section has a named owner accountable for its quality,
completeness, and freshness (briefing §6.4). Anyone with repo access can open a
content change; owners review. The `owner` in a page's frontmatter must match a
row here.

`paged-docs` is the bootstrap owner for everything until per-section owners are
assigned. Replace it as the team grows.

| Section | Owner |
| ------- | ----- |
| Foundations | paged-docs |
| Package anatomy | paged-docs |
| Geometry & coordinates | paged-docs |
| Layout model | paged-docs |
| Stories & text | paged-docs |
| Styles | paged-docs |
| Frames & paths | paged-docs |
| Typography | paged-docs |
| Tables | paged-docs |
| Color & swatches | paged-docs |
| Images & graphics | paged-docs |
| Anchored & inline objects | paged-docs |
| Cross-references & hyperlinks | paged-docs |
| Master spreads & overrides | paged-docs |
| Layers | paged-docs |
| Sections, numbering & variables | paged-docs |
| Conditional text | paged-docs |
| Tagged XML | paged-docs |
| Companion formats | paged-docs |
| Round-tripping | paged-docs |
| Edge cases | paged-docs |
| Comparisons | paged-docs |
| The renderer | paged-docs |
| Parser internals | paged-docs |
| Test corpus | paged-docs |
| Cookbook | paged-docs |
| Glossary | paged-docs |

The renderer-core sections (**The renderer**, **Parser internals**, **Test
corpus**) are tied to specific `core` crates in [`ownership.yaml`](./ownership.yaml)
so a crate change can flag the doc pages that describe it.
