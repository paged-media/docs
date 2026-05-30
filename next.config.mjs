import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Standard `next build` only — no host-specific primitives, so the deploy
  // target stays switchable (Vercel default; Cloudflare/Netlify fallbacks).
};

export default withMDX(config);
