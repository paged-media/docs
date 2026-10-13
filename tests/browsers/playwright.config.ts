import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Browser tests of a static export, in Chromium, Firefox and WebKit:
 *
 *   SITE=idml pnpm build && SITE=idml pnpm test:browsers
 *   SITE=paged pnpm build && SITE=paged pnpm test:browsers
 *
 * They run against out/ served with the production headers
 * (scripts/serve-out.mjs), so what they see is what Cloudflare serves.
 * CI: the `browsers` job in .github/workflows/build.yml.
 */
const SITE = process.env.SITE === 'idml' ? 'idml' : 'paged';
const PORT = 3210;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

export default defineConfig({
  testDir: HERE,
  testMatch: `${SITE}.spec.ts`,
  // At the repo root, where CI collects failure traces from.
  outputDir: resolve(ROOT, 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `node scripts/serve-out.mjs out ${PORT}`,
    cwd: ROOT,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
