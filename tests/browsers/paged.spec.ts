import { expect, test } from '@playwright/test';
import { crossSiteSearch, firstSearchResult, fonts, masthead, openClean, phoneWidth, recordStrip, searchIndex, themes } from './common';

// docs.paged.media — run against `SITE=paged pnpm build` (playwright.config.ts).

test('home: search finds the scripting pages', async ({ page }) => {
  const errors = await openClean(page, '/');
  expect(await firstSearchResult(page, 'scripting')).toMatch(/script/i);
  expect(errors).toEqual([]);
});

test('script playground: the editor mounts and typing raises no errors', async ({ page }) => {
  const errors = await openClean(page, '/scripting/your-first-script/');
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type('\nconst x = paged;', { delay: 15 });
  // The language features ask their worker after a pause; give them one.
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

for (const path of ['/state/', '/sdk/']) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const errors = await openClean(page, path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test.describe('sidenote', () => {
  const PAGE = '/engine/the-renderer/the-pipeline/';
  const note = (page: import('@playwright/test').Page) => page.locator('#note-paged-gpu-crate');

  test.describe('on a wide screen', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test('sits in the outer margin, beside the reading measure', async ({ page }) => {
      const errors = await openClean(page, PAGE);
      const box = await note(page).boundingBox();
      const para = await note(page).evaluate((el) => el.closest('p')!.getBoundingClientRect().right);
      expect(box, 'note is laid out').not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(para);
      await expect(page.locator('.paged-sidenote-toggle').first()).toBeHidden();
      expect(errors).toEqual([]);
    });
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('is a disclosure, and its permalink opens it', async ({ page }) => {
      const errors = await openClean(page, PAGE);
      const toggle = page.locator('.paged-sidenote-toggle').first();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(note(page)).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(note(page)).toBeVisible();
      await page.goto(`${PAGE}#note-paged-gpu-crate`);
      await page.reload();
      await expect(note(page)).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
});

test('a reviewed page says when, and against which engine release', async ({ page }) => {
  const errors = await openClean(page, '/plugins/sheets/');
  await expect(page.locator('.paged-review-line')).toContainText(/Reviewed \d{1,2} \w{3} \d{4} against engine v\d+\.\d+\.\d+/);
  expect(errors).toEqual([]);
});

test('the status page lists every figure with its source', async ({ page }) => {
  const errors = await openClean(page, '/state/');
  await expect(page.locator('#fact-engine\\.version')).toContainText('engine release');
  expect(errors).toEqual([]);
});

recordStrip('/state/');
crossSiteSearch('https://idml.paged.media', 'IDML Reference', 'scripting');
test('example lab: the views are tabs, and Live is the engine\'s own render', async ({ page }) => {
  const errors = await openClean(page, '/engine/test-corpus/the-docs-examples-loop/');
  const lab = page.locator('.paged-lab').first();
  await expect(lab.getByRole('tab', { name: 'Raw', exact: true })).toHaveAttribute('aria-selected', 'true');
  await lab.getByRole('tab', { name: 'Live', exact: true }).click();
  await expect(lab.locator('.paged-lab-heading')).toContainText(/Paged engine/i);
  await expect(lab.locator('canvas')).toBeAttached();
  expect(errors).toEqual([]);
});

masthead('Docs');
searchIndex('paged', 'https://docs.paged.media', ['Guide', 'API', 'Plugin', 'Engine', 'Project']);
phoneWidth(['/', '/scripting/your-first-script/', '/state/', '/sdk/', '/engine/the-renderer/the-pipeline/', '/engine/test-corpus/the-docs-examples-loop/']);
fonts();
themes();
