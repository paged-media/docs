import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Static export for GitHub Pages — emits a fully static `out/` (no Node
  // server). Search runs client-side (Fumadocs static mode); the WebGPU live
  // preview loads its wasm from /public/preview. Served at the custom domain
  // docs.paged.media (root), so no basePath/assetPrefix is needed.
  output: 'export',
  images: { unoptimized: true },
  // Emit dir/index.html for every route so GitHub Pages serves both /foo and
  // /foo/ (Pages redirects no-slash → slash). Most robust for static hosting.
  trailingSlash: true,
};

export default withMDX(config);
