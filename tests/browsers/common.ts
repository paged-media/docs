import { expect, test, type Page } from '@playwright/test';

/** Errors a page raised or logged; third-party analytics is not ours to fix. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/googletagmanager|gtag|favicon/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Opens a page and fails on any error it raised once settled. */
export async function openClean(page: Page, path: string): Promise<string[]> {
  const errors = collectErrors(page);
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBe(200);
  await page.waitForLoadState('load');
  return errors;
}

/** Search from the masthead and return the first result's page title. */
export async function firstSearchResult(page: Page, query: string): Promise<string> {
  await page.locator('button[data-search-full]').first().click();
  await page.keyboard.type(query, { delay: 20 });
  const title = page.locator('.paged-search-page .paged-search-title > span:first-child').first();
  await expect(title).toBeVisible({ timeout: 15_000 });
  return (await title.textContent())?.trim() ?? '';
}

/** Every listed page renders at phone width without scrolling sideways. */
export function phoneWidth(paths: string[]) {
  test.describe('at 390px', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    for (const path of paths) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('load');
        const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(sw, `page is ${sw}px wide in a ${iw}px viewport`).toBeLessThanOrEqual(iw + 1);
      });
    }
  });
}

/** The theme follows the system setting, and the switch overrides it. */
export function themes() {
  const html = (page: Page) => page.locator('html');
  test.describe('theme on a dark system', () => {
    test.use({ colorScheme: 'dark' });
    test('night paper, until the switch picks light', async ({ page, browserName }) => {
      // Playwright's Firefox drops an emulated colour scheme when COOP moves the
      // page to a new process (served without the headers it resolves dark). A
      // real Firefox applies the reader's setting everywhere; the light-system
      // test below still covers the switch there.
      test.skip(browserName === 'firefox', 'emulated colour scheme is lost across the COOP process swap');
      await page.goto('/');
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await page.locator('[data-theme-toggle] button[aria-label="Light"]').first().click();
      await expect(html(page)).not.toHaveClass(/\bdark\b/);
    });
  });
  test.describe('theme on a light system', () => {
    test.use({ colorScheme: 'light' });
    test('paper, until the switch picks dark', async ({ page }) => {
      await page.goto('/');
      await expect(html(page)).not.toHaveClass(/\bdark\b/);
      await page.locator('[data-theme-toggle] button[aria-label="Dark"]').first().click();
      await expect(html(page)).toHaveClass(/\bdark\b/);
    });
  });
}

/** The record strip names the engine release and the record's date, and links to the status page. */
export function recordStrip(statusHref: string) {
  test('record strip: engine release, record date and the status page', async ({ page }) => {
    const errors = await openClean(page, '/');
    const strip = page.getByRole('complementary', { name: 'Engine release and capability record' });
    await expect(strip).toContainText(/v\d+\.\d+\.\d+/);
    await expect(strip.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    await expect(strip.locator('a.paged-strip-link')).toHaveAttribute('href', statusHref);
    expect(errors).toEqual([]);
  });

  test("record strip: in a reader's browser a month on, the record reads as not current", async ({ page }) => {
    await page.clock.setFixedTime(new Date(Date.now() + 30 * 86_400_000));
    await page.goto('/');
    await expect(page.locator('.paged-strip-record')).toContainText(', not current');
  });
}

/**
 * Search across both sites. The other site's index is stood in for by this
 * build's own (any index of the right shape will do), served from the other
 * origin with the CORS header; the other test makes that origin unreachable.
 */
export function crossSiteSearch(otherOrigin: string, otherName: string, query: string) {
  const index = `${otherOrigin}/api/search`;

  test('search: both sites lists the other site, labelled and linked there', async ({ page }) => {
    await page.route(index, async (route) => {
      const res = await route.fetch({ url: new URL('/api/search', page.url()).toString() });
      await route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*' } });
    });
    await page.route(`${otherOrigin}/**/*`, (route) =>
      route.request().url() === index ? route.fallback() : route.fulfill({ contentType: 'text/html', body: '<title>other site</title>' }),
    );
    const errors = await openClean(page, '/');
    await page.locator('button[data-search-full]').first().click();
    await page.keyboard.type(query, { delay: 20 });
    await expect(page.locator('.paged-search-page').first()).toBeVisible({ timeout: 15_000 });
    // Keyboard: from "This site", the arrow key moves the scope to "Both sites".
    await page.getByRole('radio', { name: 'This site' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Both sites' })).toBeChecked();
    const peer = page.locator('.paged-search-page[data-peer]').first();
    await expect(peer).toBeVisible({ timeout: 15_000 });
    await expect(peer.locator('.paged-search-site')).toHaveText(otherName);
    await peer.click();
    await expect.poll(() => page.url()).toMatch(new RegExp(`^${otherOrigin.replace(/\./g, '\\.')}/`));
    expect(errors).toEqual([]);
  });

  test("search: an unreachable other index leaves this site's results and says so", async ({ page }) => {
    await page.route(index, (route) => route.abort());
    await openClean(page, '/');
    await page.locator('button[data-search-full]').first().click();
    await page.keyboard.type(query, { delay: 20 });
    await page.getByRole('radio', { name: 'Both sites' }).check();
    await expect(page.locator('.paged-search-scope-status')).toContainText('could not be reached');
    await expect(page.locator('.paged-search-page').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.paged-search-page[data-peer]')).toHaveCount(0);
  });
}
