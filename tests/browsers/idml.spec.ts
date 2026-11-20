import { expect, test } from '@playwright/test';
import { crossSiteSearch, firstSearchResult, fonts, masthead, openClean, phoneWidth, recordStrip, searchIndex, themes } from './common';

// idml.paged.media — run against `SITE=idml pnpm build` (playwright.config.ts).

test('home: an element name searches to its page first', async ({ page }) => {
  const errors = await openClean(page, '/');
  expect(await firstSearchResult(page, 'TextFrame')).toBe('TextFrame');
  expect(errors).toEqual([]);
});

test('element index: the filter matches attribute names', async ({ page }) => {
  const errors = await openClean(page, '/reference/');
  await page.locator('.paged-index-filter input').fill('StrokeWeight');
  const rows = page.locator('table tbody tr:visible');
  await expect.poll(() => rows.count()).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('element page: sticky header and attribute notes', async ({ page }) => {
  const errors = await openClean(page, '/reference/text-frame/');
  const th = page.locator('.paged-ref-table thead th').first();
  expect(await th.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
  await expect(page.locator('#attr-StrokeWeight')).toContainText("The stroke's thickness, in points.");
  expect(errors).toEqual([]);
});

test('element page: the format reference is neutral, and Paged support is its own panel after the evidence', async ({ page }) => {
  const errors = await openClean(page, '/reference/text-frame/');
  const headers = await page.locator('.paged-ref-table thead th').allInnerTexts();
  expect(headers.join(' ')).not.toMatch(/Paged|paged\.set/);
  const panel = page.getByRole('region', { name: 'Paged support for TextFrame' });
  await expect(panel).toBeVisible();
  const order = await page.evaluate(() => {
    const at = (el: Element | null) => (el ? [...document.querySelectorAll('h2, section[aria-label^="Paged support"]')].indexOf(el) : -1);
    return { evidence: at(document.getElementById('evidence')), panel: at(document.querySelector('section[aria-label^="Paged support"]')) };
  });
  expect(order.evidence).toBeGreaterThanOrEqual(0);
  expect(order.panel).toBeGreaterThan(order.evidence);
  expect(errors).toEqual([]);
});

test.describe('example: drop cap', () => {
  const tab = (page: import('@playwright/test').Page, name: string) => page.getByRole('tab', { name, exact: true }).first();

  test('annotated code is numbered, and a note lights its lines', async ({ page }) => {
    const errors = await openClean(page, '/typography/drop-caps-and-tabs/');
    await tab(page, 'Annotated').click();
    const numbered = page.locator('.paged-code-numbered .line[data-line]').first();
    expect(await numbered.evaluate((el) => getComputedStyle(el, '::before').content)).toMatch(/\d/);
    await page.locator('.paged-marginalia li').first().hover();
    await expect(page.locator('.line.is-hot').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("InDesign's page is drawn from the sharp copy, and the caption matches the live side", async ({ page }) => {
    const errors = await openClean(page, '/typography/drop-caps-and-tabs/');
    await tab(page, 'InDesign').click();
    const img = page.locator('.paged-indesign-sheet img').first();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    expect(await img.evaluate((el: HTMLImageElement) => el.currentSrc)).toMatch(/@3x\.webp$/);
    // Either the live render or the no-WebGPU fallback, and the caption says which.
    const live = page.locator('.paged-indesign-compare figure').nth(1);
    await expect(live.locator('canvas')).toBeAttached();
    await expect
      .poll(async () => {
        const text = await live.innerText();
        return /requires WebGPU|isn’t available|Couldn’t render/.test(text) ? /\nPaged$/.test(text.trim()) : /Paged, live in this browser/.test(text);
      })
      .toBe(true);
    expect(errors).toEqual([]);
  });
});

test('inspector loads', async ({ page }) => {
  const errors = await openClean(page, '/tools/inspector/');
  await expect(page.locator('.paged-inspector')).toBeVisible();
  expect(errors).toEqual([]);
});

recordStrip('https://docs.paged.media/state/');
crossSiteSearch('https://docs.paged.media', 'Paged Docs', 'text frame');
// The sample is examples/two-page-spread; its first spread opens on its own.
test('inspector: the element tree and the XML select each other', async ({ page }) => {
  await page.goto('/tools/inspector/');
  await page.getByRole('button', { name: 'No file at hand? Open a sample' }).click();
  const tree = page.getByRole('tree', { name: 'Elements of Spreads/Spread_uspread.xml' });
  const xml = page.getByRole('region', { name: 'XML of Spreads/Spread_uspread.xml' });
  const marked = xml.locator('[data-selected]');
  const chosen = tree.locator('[role="treeitem"][aria-selected="true"]');
  await expect(tree).toBeVisible();

  // tree → XML: the element's whole range is marked, and only it
  await tree.getByRole('treeitem', { name: 'TextFrame uframeR' }).click();
  await expect(marked).toContainText('Self="uframeR"');
  await expect(marked).toContainText('</TextFrame>');
  await expect(marked).not.toContainText('uframeL');

  // XML → tree: a click on a tag chooses its element
  await xml.locator('[data-o]', { hasText: 'Self="upageL"' }).first().click();
  await expect(chosen).toHaveAttribute('aria-label', 'Page 2');
  await expect(marked).toContainText('Self="upageL"');

  // the keyboard walks the tree, and the XML follows
  await chosen.click();
  await expect(chosen).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(chosen).toHaveAttribute('aria-label', 'Page 3');
  await expect(marked).toContainText('Self="upageR"');

  // a Self reference opens the part that defines it, with that element chosen
  await tree.getByRole('treeitem', { name: 'TextFrame uframeR' }).click();
  await page.getByRole('button', { name: /ParentStory → ustoryR/ }).click();
  const story = page.getByRole('tree', { name: 'Elements of Stories/Story_ustoryR.xml' });
  await expect(story.locator('[role="treeitem"][aria-selected="true"]')).toHaveAttribute('aria-label', 'Story ustoryR');
  await expect(page.getByRole('region', { name: 'XML of Stories/Story_ustoryR.xml' }).locator('[data-selected]')).toContainText('Self="ustoryR"');
});

test.describe('field guide', () => {
  const PAGE = '/field-guide/';
  const KEYS = ['package', 'spread', 'frame', 'story', 'style'];

  test('a hotspot chooses its card: B, the story', async ({ page }) => {
    const errors = await openClean(page, PAGE);
    const guide = page.locator('[data-guide]');
    await expect(guide).toHaveAttribute('data-js', '');
    // The text frame is chosen first; every other card waits.
    await expect(page.locator('#guide-frame')).toBeVisible();
    await expect(page.locator('#guide-story')).toBeHidden();
    const b = guide.locator('.paged-guide-hotspot', { hasText: 'B' });
    await expect(b).toHaveAttribute('href', '#guide-story');
    await b.click();
    await expect(page.locator('#guide-story')).toBeVisible();
    await expect(page.locator('#guide-story')).toHaveAttribute('data-active', '');
    await expect(page.locator('#guide-frame')).toBeHidden();
    await expect(b).toHaveAttribute('aria-current', 'true');
    await expect(guide.locator('.paged-guide-stop[data-guide-key="story"]')).toHaveAttribute('aria-current', 'true');
    // The card names the story's attributes from the example's XML and links to its entry.
    await expect(page.locator('#guide-story code').first()).toHaveText('Self');
    await expect(page.locator('#guide-story .paged-guide-read')).toHaveAttribute('href', '/reference/story/');
    expect(errors).toEqual([]);
  });

  test('a stop links to its element entry', async ({ page }) => {
    await page.goto(PAGE);
    const entries = await page.locator('.paged-guide-entry').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(entries).toEqual(['/reference/document/', '/reference/spread/', '/reference/text-frame/', '/reference/story/', '/reference/paragraph-style/']);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('every card is in the page, and the hotspots are links to them', async ({ page }) => {
      await page.goto(PAGE);
      for (const key of KEYS) await expect(page.locator(`#guide-${key}`)).toBeVisible();
      const hrefs = await page.locator('.paged-guide-hotspot').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(['#guide-frame', '#guide-story', '#guide-style']);
      await expect(page.locator('.paged-guide-sheet img')).toHaveAttribute('src', /\/examples\/based-on-chain\/p1\.webp$/);
    });
  });
});

masthead('IDML Reference');
searchIndex('idml', 'https://idml.paged.media', ['Guide', 'Element', 'Cookbook', 'Glossary', 'Tool']);
phoneWidth(['/', '/reference/', '/reference/text-frame/', '/meta/census/', '/typography/drop-caps-and-tabs/', '/tools/inspector/', '/field-guide/']);
fonts();
themes();

test('the footer names the sample publications as illustration from archive.org, in text', async ({ page }) => {
  for (const path of ['/', '/tools/inspector/']) {
    await page.goto(path);
    const notice = page.locator('footer [data-sample-notice]');
    await expect(notice).toContainText('archive.org');
    await expect(notice).toContainText(/illustrat/);
    await expect(notice.locator('a[href="https://paged.media/imprint/#samples"]')).toHaveCount(1);
  }
});
