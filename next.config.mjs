import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Which site this export is (lib/site.ts): inlined so client components
  // resolve cross-site links the same way the server does.
  env: { SITE: process.env.SITE ?? 'paged' },
  // Static export for Cloudflare Pages — a fully static `out/` (no Node
  // server). Search runs client-side (Fumadocs static mode); the WebGPU live
  // preview loads its wasm from /public/preview. Each site is served at the
  // root of its own domain, so no basePath/assetPrefix is needed.
  output: 'export',
  images: { unoptimized: true },
  // Emit dir/index.html for every route: the canonical URL of every page ends
  // in a slash, and the host redirects /foo → /foo/, so each page has exactly
  // one URL.
  trailingSlash: true,
};

export default withMDX(config);
