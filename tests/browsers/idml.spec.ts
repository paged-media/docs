import { expect, test } from '@playwright/test';
import { firstSearchResult, openClean, phoneWidth, themes } from './common';

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

phoneWidth(['/', '/reference/', '/reference/text-frame/', '/typography/drop-caps-and-tabs/', '/tools/inspector/']);
themes();
