# ADR 804 — A static export on a cross-origin-isolated host

- **Status:** Accepted. Recorded retroactively on 2026-10-02 from the code at `2094ba4`.
- **Scope:** `next.config.mjs`, `public/_headers`, `public/_redirects`,
  `.github/workflows/cloudflare-pages.yml`, `components/mdx/live-demo.tsx`,
  `components/mdx/scripting-playground.tsx`, `components/mdx/demo.tsx`

## Context

The site was deployed as a static export to GitHub Pages from its first deploy commit
(`34daa71`, 2026-05-30): no Node server, a static search index, static robots and sitemap.

Demos changed what the host had to do. Commit `7be53d3` (2026-06-20) added `<Demo>`, which
replays recorded editor sessions. Commit `f0296eb` (2026-06-22) added `<LiveDemo>`, which
embeds the running editor from its playground origin in an `<iframe>`. The demos page
gives the reason: the demo is the product driven by its own API, so "it can never drift
from the app" (`content/docs/paged/demos.mdx:22`).

The embedded editor uses `SharedArrayBuffer`. `public/_headers:2-4` states that this needs
the parent page to be cross-origin isolated as well, which GitHub Pages cannot do. Commit
`8a56b33` (2026-06-21) added a Cloudflare Pages deploy and the header file; commit `fcd65c0`
(2026-06-22) removed the GitHub Pages workflow.

## Decision

The site is a fully static export. It is built in GitHub Actions and uploaded to a host
that sends cross-origin isolation headers on every path. Demos embed the real editor.

- `next.config.mjs` sets `output: 'export'`, `trailingSlash: true` and unoptimised images.
  Search uses a static index (`staticGET`, and `type: 'static'` on the provider).
- `cloudflare-pages.yml` runs on a push to `main`, on manual dispatch, nightly and on a
  `source-updated` repository dispatch. It runs `pnpm build` and then
  `wrangler pages deploy out --project-name=paged-docs --branch=main`.
- `public/_headers` is copied into `out/` and read by the host. Every path gets
  `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`
  and `X-Content-Type-Options: nosniff`; `/preview/*` also gets
  `Cross-Origin-Resource-Policy: same-origin`.
- `public/_redirects` maps the URL tree used before 2026-06-23 to `/docs/idml/…` and
  `/docs/paged/…` with 301 rules.
- `<LiveDemo script="…">` mounts, on a click, an iframe of the playground origin with
  `?script=<id>` and `allow="cross-origin-isolated; fullscreen; clipboard-write"`. The
  origin is `NEXT_PUBLIC_PLAYGROUND_URL`, by default `https://play.paged.media`.
  `<ScriptingPlayground>` embeds the same origin with `?embed=script` and exchanges
  `paged:run`, `paged:ready` and `paged:result` messages with it, checking the origin.
- Recordings remain as a second lane. `<Demo>` plays an rrweb session from
  `/demos/<id>.rrweb.json` with the player from `@paged-media/demo-replay`. Three sessions
  are committed in `demos/`; at build time the editor's release assets, when the download
  succeeds, replace them.

## Evidence

- `next.config.mjs:8-16`, `app/api/search/route.ts:4-9`, `app/layout.tsx:82` — export, search
- `.github/workflows/cloudflare-pages.yml:3-8`, `:15-22`, `:45-61` — reason, triggers, upload
- `public/_headers:1-9`, `:16-23` — the reason for the move, `credentialless`, the headers
- `components/mdx/live-demo.tsx:9-19`, `:43-50` — isolation requirement, origin, iframe
- `components/mdx/scripting-playground.tsx:12-19` — the message contract
- `components/mdx/demo.tsx:2-14`, `sources.pin:69-75`, `package.json:28` — the recordings

## Alternatives considered

- GitHub Pages: used first, then retired, because it cannot send the headers.
- The host's git integration: not used. The build needs the `gh` CLI for the source pull,
  and "Cloudflare's build image doesn't" have it (`.github/workflows/cloudflare-pages.yml:7`).
- `Cross-Origin-Embedder-Policy: require-corp`: rejected in `public/_headers:6-9`, because it
  would block third-party resources that send no resource-policy header, analytics among them.
- Recordings as the only demo form: `components/mdx/live-demo.tsx:4` calls `<LiveDemo>`
  "The successor to <Demo> (rrweb recording)". Both ship.

## Consequences

Nothing runs on a server: route handlers are emitted as static files, images are not
optimised, and search works on a prebuilt index. Third-party resources load without
credentials. Live demos depend on a deployment this repository does not build: the
playground origin, its query parameters and its message types. `<LiveDemo>` has no fallback
of its own.

Comments and files still name the first host. `next.config.mjs:8`, `:14`,
`app/api/search/route.ts:4` and `components/analytics.tsx:20` say GitHub Pages.
`.github/workflows/build.yml:28` and `.github/workflows/cloudflare-pages.yml:5`, `:10-13`
refer to `pages.yml`, which is deleted. `.github/dispatch-docs-rebuild.example.yml:6-9`
tells source repositories that `pages.yml` receives the dispatch; the receiver is
`cloudflare-pages.yml`. The site's own page `content/docs/paged/repos/docs.mdx:12-13` says
it deploys to GitHub Pages. `public/CNAME` and `public/.nojekyll` date from commit `34daa71`.

## Related

- [ADR 802](802-generated-platform-pages.md), [ADR 803](803-live-preview-uses-viewer-package.md)
  — the source pull that keeps the build in Actions; the wasm served from `/preview/`
- [ADR 212](https://github.com/paged-media/editor/blob/main/docs/adr/212-one-automation-surface.md)
  (editor) — the playground and the script bridge that the iframes embed
