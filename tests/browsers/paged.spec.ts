import { expect, test } from '@playwright/test';
import { firstSearchResult, openClean, phoneWidth, themes } from './common';

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

phoneWidth(['/', '/scripting/your-first-script/', '/state/', '/sdk/']);
themes();
