# Paged — the IDML living documentation

The source of [**docs.paged.media**](https://docs.paged.media): an independent,
living reference for the **IDML** file format and the **Paged** native renderer.
Authored from first principles — from small files we build ourselves and from what
the renderer learns reading them.

> Paged is a native renderer for paged media, starting with IDML — a separate
> project from the CSS-based Paged.js polyfill.

> IDML is a published file format owned by its vendor. This documentation is an
> independent description by the Paged project and is not affiliated with or
> endorsed by the vendor.

## Stack

Fumadocs (Next.js App Router + MDX) + TypeScript + pnpm. A single Next app at the
repo root.

```bash
pnpm install     # generates the Fumadocs source index (postinstall)
pnpm dev         # http://localhost:3000
pnpm build
pnpm typecheck
```

## Repo map

| Path | What |
| ---- | ---- |
| `content/docs/` | The reference. 27 sections, ordered by reader progression (not the spec's order). Each page declares one tier + one Diátaxis mode. |
| `examples/` | First-class examples as hand-authored, unzipped IDML XML parts. Imported into MDX; validated against the real renderer in CI. |
| `components/mdx/` | The example views (raw / annotated / tree), the difficulty label, and `ExampleEmbed` (with a reserved WebGPU `live` slot). |
| `lib/`, `app/` | Fumadocs source loader, the App Router shell, sitemap/robots, the WIP banner, analytics. |
| `scripts/examples/` | The UCF-faithful package assembler and the validation gate. |
| `cleanroom/` | The masked-prose similarity check (baseline held privately, never in this repo). |
| `core.pin`, `ownership.yaml` | The pinned `core` commit examples validate against; the crate→doc ownership map. |

## How it stays honest

- **Examples in CI.** Every example is assembled into an `.idml` and validated by
  `paged-inspect` (built from `core` at `core.pin`). If the renderer stops
  accepting an example, the build breaks. See [`examples/README.md`](./examples/README.md).
- **Clean-room.** No copying the spec — in wording or arrangement. Every content
  change confirms it; CI runs a masked-prose similarity backstop. See
  [`content/docs/meta/clean-room-protocol.mdx`](./content/docs/meta/clean-room-protocol.mdx).
- **Public, but `noindex` until done.** Stubs ship behind a work-in-progress
  banner and are excluded from search; only `status: published` pages are indexed.

## Licensing

- Documentation content (`content/`, `examples/`): **CC BY 4.0** ([LICENSE-CONTENT](./LICENSE-CONTENT)).
- Site code, components, configuration: **MIT** ([LICENSE-CODE](./LICENSE-CODE)).

Both are recommended defaults pending a short pre-launch legal review.

## Contributing

Open a content change; the [content PR template](./.github/PULL_REQUEST_TEMPLATE/content_change.md)
carries the page contract and the clean-room confirmation. Section owners are in
[OWNERSHIP.md](./OWNERSHIP.md).
