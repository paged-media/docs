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
