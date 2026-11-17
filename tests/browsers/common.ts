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

/**
 * The masthead all three sites share (lib/masthead-nav.ts, mirroring the
 * website's nav.ts): its sections and tools in order, with their addresses —
 * this site's own home as a root path — and this site marked current.
 */
export function masthead(current: 'Docs' | 'IDML Reference') {
  const own = current === 'Docs' ? 'https://docs.paged.media/' : 'https://idml.paged.media/';
  const local = (href: string) => (href === own ? '/' : href);
  const SECTIONS = [
    ['Product', 'https://paged.media/product/'],
    ['Solutions', 'https://paged.media/designers/'],
    ['Editions', 'https://paged.media/editions/'],
    ['Docs', 'https://docs.paged.media/'],
    ['IDML Reference', 'https://idml.paged.media/'],
  ].map(([label, href]) => [label, local(href)]);
  const TOOLS = [
    ['Library', 'https://paged.media/library/'],
    ['Studio', 'https://paged.media/studio/'],
    ['Site atlas', 'https://paged.media/site-atlas/'],
    ['Open editor', 'https://play.paged.media/'],
  ];

  test('masthead: the shared sections and tools, this site marked current', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors = await openClean(page, '/');
    const header = page.locator('header[data-masthead]');
    await expect(header).toBeVisible();
    await expect(header.locator('.paged-masthead-mark')).toHaveAttribute('href', 'https://paged.media/');
    const links = header.locator('[data-masthead-nav] a');
    const got = await links.evaluateAll((as) => as.map((a) => [a.textContent?.trim() ?? '', a.getAttribute('href') ?? '']));
    expect(got).toEqual(SECTIONS);
    const tools = await header
      .locator('.paged-masthead-tool, .paged-masthead-action')
      .evaluateAll((as) => as.map((a) => [a.textContent?.trim() ?? '', a.getAttribute('href') ?? '']));
    expect(tools).toEqual(TOOLS);
    await expect(header.locator('[data-masthead-nav] a[aria-current]')).toHaveCount(1);
    await expect(header.locator('[data-masthead-nav] a[aria-current]')).toHaveText(current);
    await expect(header.locator('button[data-search-full]')).toBeVisible();
    await expect(header.locator('[data-theme-toggle]').first()).toBeVisible();
    // Sticky over the page: still there after a scroll.
    await page.mouse.wheel(0, 1600);
    await expect(header).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test.describe('masthead on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('the wordmark, search and a menu that opens without script', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header[data-masthead]');
      await expect(header.locator('[data-masthead-nav]')).toBeHidden();
      await expect(header.locator('button[data-search-full]')).toBeVisible();
      const menu = header.locator('.paged-masthead-menu');
      await menu.locator('summary').click();
      await expect(menu.getByRole('link', { name: current, exact: true })).toBeVisible();
      await expect(menu.getByRole('link', { name: current, exact: true })).toHaveAttribute('aria-current', 'true');
    });
  });
}

/**
 * /search-index.json: every page of this site for paged.media's search
 * (docs/adr/810), readable from any origin.
 */
export function searchIndex(site: 'paged' | 'idml', origin: string, kinds: string[]) {
  test('search-index.json: the schema, at least 50 pages, absolute URLs, kinds, CORS', async ({ request }) => {
    const res = await request.get('/search-index.json');
    expect(res.status()).toBe(200);
    expect(res.headers()['access-control-allow-origin']).toBe('*');
    const body = await res.json();
    expect(body.schema).toBe('paged.search.index/1');
    expect(body.site).toBe(site);
    expect(body.origin).toBe(origin);
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
    expect(body.pages.length).toBeGreaterThanOrEqual(50);
    for (const p of body.pages) {
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.url).toMatch(new RegExp(`^${origin.replace(/\./g, '\\.')}/(.+/)?$`));
      expect(kinds).toContain(p.kind);
      expect(typeof p.description).toBe('string');
    }
    expect(new Set(body.pages.map((p: { url: string }) => p.url)).size).toBe(body.pages.length);
  });
}

/**
 * The faces (app/layout.tsx): the two romans and Newsreader's italic, which the
 * front page's headline sets above the fold, are preloaded; DM Sans italic is
 * not, and is a face of the same family as the roman, so an `em` in the sans
 * gets the real italic. The headline's italic line is drawn with the italic face.
 */
export function fonts() {
  test('fonts: what is preloaded, and the italics are real faces of their families', async ({ page }) => {
    await page.goto('/');
    const preloads = await page.locator('link[rel="preload"][as="font"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href') ?? ''));
    expect(preloads.filter((h) => /newsreader.*_normal/.test(h))).toHaveLength(1);
    expect(preloads.filter((h) => /newsreader.*_italic/.test(h))).toHaveLength(1);
    expect(preloads.filter((h) => /dm_sans.*_normal/.test(h))).toHaveLength(1);
    expect(preloads.filter((h) => /dm_sans.*_italic/.test(h))).toHaveLength(0);
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      const first = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).split(',')[0].replace(/["'\s]/g, '');
      const all = [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ''), style: f.style, status: f.status }));
      return { serif: first('--font-newsreader'), sans: first('--font-dm-sans'), all };
    });
    expect(faces.all).toContainEqual(expect.objectContaining({ family: faces.sans, style: 'italic' }));
    // The headline's red italic line is set, so its face has loaded.
    await expect(page.locator('.paged-home-title em')).toBeVisible();
    expect(faces.all).toContainEqual({ family: faces.serif, style: 'italic', status: 'loaded' });
  });
}
