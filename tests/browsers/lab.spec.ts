import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { collectErrors } from './common';

/**
 * The scripting lab (components/mdx/scripting-lab*.tsx) against a stand-in
 * editor: every play.paged.media address is answered with editor-stub.html,
 * which speaks both of the lab's protocols and records what it is asked. CI
 * needs no editor and no WebGPU; `navigator.gpu` is stood in for, or taken away.
 */
const PLAY = 'https://play.paged.media';
const STUB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'editor-stub.html'), 'utf8');
const SHOWCASES = '/scripting/showcases/';
const FIRST_SCRIPT = '/scripting/your-first-script/';

/** Serves the stand-in, records every request to the editor's origin, and sets WebGPU on or off. */
async function standIn(page: Page, { gpu = true } = {}): Promise<string[]> {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith(PLAY)) requests.push(r.url());
  });
  await page.route(`${PLAY}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      // the docs page is cross-origin isolated (COEP), so its frames must say they may be embedded
      headers: { 'Cross-Origin-Embedder-Policy': 'credentialless', 'Cross-Origin-Resource-Policy': 'cross-origin' },
      body: STUB,
    }),
  );
  await page.addInitScript((on: boolean) => {
    Object.defineProperty(Navigator.prototype, 'gpu', { configurable: true, get: () => (on ? {} : undefined) });
  }, gpu);
  return requests;
}

async function editorFrame(page: Page): Promise<Frame> {
  await expect.poll(() => page.frames().some((f) => f.url().startsWith(PLAY)), { timeout: 15_000 }).toBe(true);
  return page.frames().find((f) => f.url().startsWith(PLAY))!;
}
const callsOf = (frame: Frame) => frame.evaluate(() => (window as unknown as { calls: unknown[][] }).calls);

const lab = (page: Page) => page.locator('.paged-script-lab').first();
const tabs = (page: Page) => page.getByRole('tablist', { name: 'Path themes' }).getByRole('tab');
const consoleOf = (scope: ReturnType<Page['locator']>) => scope.getByRole('log', { name: 'Console' });

test.describe('scripting lab', () => {
  test('ten themes as tabs; the arrow keys, Home and End move the selection', async ({ page }) => {
    await standIn(page);
    const errors = collectErrors(page);
    await page.goto(SHOWCASES);
    await expect(tabs(page)).toHaveCount(10);
    await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true');
    await expect(lab(page).getByRole('tabpanel')).toContainText('Fills & gradients');
    await tabs(page).first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs(page).nth(1)).toBeFocused();
    await expect(lab(page).getByRole('heading', { level: 2 })).toHaveText('Strokes & dashes');
    await page.keyboard.press('End');
    await expect(tabs(page).last()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tabs(page).last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true');
    // one tab in the tab order, and each is also its theme's anchor
    await expect(lab(page).locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(tabs(page).nth(2)).toHaveAttribute('href', '#theme-transform');
    expect(errors).toEqual([]);
  });

  test('#theme-strokes selects that tab', async ({ page }) => {
    await standIn(page);
    await page.goto(`${SHOWCASES}#theme-strokes`);
    const strokes = page.getByRole('tab', { name: /Strokes & dashes/ });
    await expect(strokes).toHaveAttribute('aria-selected', 'true');
    await expect(lab(page).getByRole('heading', { level: 2 })).toHaveText('Strokes & dashes');
    await expect(lab(page).locator('.paged-script-chip[data-demo]').first()).toHaveText('frameStrokeColor');
  });

  test('nothing is asked of play.paged.media before Run; the stage says what Run does', async ({ page }) => {
    const requests = await standIn(page);
    await page.goto(SHOWCASES);
    await page.waitForLoadState('load');
    await tabs(page).nth(4).click();
    await expect(lab(page).getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
    const stage = lab(page).getByRole('group', { name: /^Stage:/ });
    // the recorded result when there is one, else what Run will do
    await expect(stage.locator('img, .paged-script-empty-text').first()).toBeVisible();
    if ((await stage.locator('img').count()) === 0) await expect(stage).toContainText('Run loads the Paged editor here');
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
    await expect(page.locator('.paged-stage-frame')).toHaveCount(0);
  });

  for (const mode of ['legacy', 'connect'] as const) {
    test(`Run (${mode}): one editor, the script, its console; another tab runs at once`, async ({ page }) => {
      const requests = await standIn(page);
      await page.goto(`${SHOWCASES}?lab-embed=${mode}`);
      await lab(page).getByRole('button', { name: 'Run', exact: true }).click();
      const log = consoleOf(lab(page));
      await expect(log).toContainText('stub ran: const [el] = JSON.parse(paged.selection());');
      expect(requests[0]).toBe(mode === 'connect' ? `${PLAY}/embed.html` : `${PLAY}/?embed=script&seed=one-text-frame-selected`);
      const frame = await editorFrame(page);
      const ran = await callsOf(frame);
      if (mode === 'connect') {
        expect(ran[0]).toEqual(['init', expect.objectContaining({ profile: 'viewer', role: 'editor', seed: 'one-text-frame-selected' })]);
        expect(ran.map((c) => c[0])).toEqual(['init', 'newDocument', 'runScript', 'runScript', 'fitSelection']);
        expect(ran[3][1]).toContain("paged.set(ref, 'frameFillColor', 'Color/Red');");
      } else {
        expect(ran).toEqual([['boot', 'one-text-frame-selected'], ['run', expect.stringContaining("'frameFillColor', 'Color/Red'"), true]]);
      }
      await expect(lab(page).getByRole('group', { name: /^Stage:/ })).toHaveAttribute('data-live');

      // a theme on another seed runs at once, in the same frame
      await page.getByRole('tab', { name: /Text & paragraph/ }).click();
      await expect(log).toContainText('stub ran: const story = JSON.parse(paged.stories())[0].selfId;');
      await expect(page.locator('.paged-stage-frame iframe')).toHaveCount(1);
      if (mode === 'connect') {
        const later = await callsOf(await editorFrame(page));
        expect(later.slice(-4).map((c) => c[0])).toEqual(['newDocument', 'runScript', 'runScript', 'fitSelection']);
      }
    });
  }

  test('Reset puts the starter document back without running; Before and After switch', async ({ page }) => {
    await standIn(page);
    await page.goto(`${SHOWCASES}?lab-embed=connect#theme-effects`);
    const panel = lab(page);
    await panel.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(consoleOf(panel)).toContainText('stub ran:');
    const frame = await editorFrame(page);
    const before = (await callsOf(frame)).length;

    const after = panel.getByRole('button', { name: 'After' });
    const beforeButton = panel.getByRole('button', { name: 'Before' });
    await expect(after).toHaveAttribute('aria-pressed', 'true');
    await beforeButton.click();
    await expect(beforeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(consoleOf(panel)).toContainText('The stage shows the starter document');
    let ran = (await callsOf(frame)).slice(before);
    expect(ran.map((c) => c[0])).toEqual(['newDocument', 'runScript', 'fitSelection']);

    await after.click();
    await expect(after).toHaveAttribute('aria-pressed', 'true');
    await expect(consoleOf(panel)).toContainText('stub ran:');

    // an edit, then Reset: the script comes back and the stage is re-seeded, not run
    const lines = panel.locator('.monaco-editor .view-lines');
    await panel.locator('.monaco-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('//edited_by_the_test');
    await expect(lines).toContainText('//edited_by_the_test');
    const count = (await callsOf(frame)).length;
    await panel.getByRole('button', { name: 'Reset' }).click();
    await expect(beforeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(lines).not.toContainText('//edited_by_the_test');
    ran = (await callsOf(frame)).slice(count);
    expect(ran.map((c) => c[0])).toEqual(['newDocument', 'runScript', 'fitSelection']);
    expect(String(ran[1][1])).toContain('insertTextFrame'); // the seed's prelude, not the theme's script
  });

  test('without WebGPU: no Run, a note, and the stage stays as recorded', async ({ page }) => {
    const requests = await standIn(page, { gpu: false });
    await page.goto(SHOWCASES);
    const panel = lab(page);
    await expect(panel.getByRole('note')).toContainText('The live stage needs WebGPU');
    await expect(panel.getByRole('button', { name: 'Run', exact: true })).toHaveCount(0);
    const stage = panel.getByRole('group', { name: /^Stage:/ });
    await expect(stage.locator('img, .paged-script-empty-text').first()).toBeVisible();
    if ((await stage.locator('img').count()) === 0) await expect(stage).toContainText('The live stage needs WebGPU');
    await expect(panel.getByRole('button', { name: 'Before' })).toBeDisabled();
    expect(requests).toEqual([]);
  });

  test('single-snippet labs on one page share one editor', async ({ page }) => {
    await standIn(page);
    await page.goto(`${FIRST_SCRIPT}?lab-embed=connect`);
    const labs = page.locator('.paged-script-lab');
    await expect(labs).toHaveCount(5);
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await labs.nth(0).getByRole('button', { name: 'Run', exact: true }).click();
    await expect(consoleOf(labs.nth(0))).toContainText('stub ran: const tree = JSON.parse(paged.tree());');
    await labs.nth(2).getByRole('button', { name: 'Run', exact: true }).click();
    await expect(consoleOf(labs.nth(2))).toContainText('stub ran: const [el] = JSON.parse(paged.selection());');
    await expect(page.locator('.paged-stage-frame')).toHaveCount(1);
    await expect(labs.nth(2).getByRole('group', { name: /^Stage:/ })).toHaveAttribute('data-live');
    await expect(labs.nth(0).getByRole('group', { name: /^Stage:/ })).not.toHaveAttribute('data-live');
    // the frame sits over the third lab's stage
    const slot = await labs.nth(2).getByRole('group', { name: /^Stage:/ }).boundingBox();
    await expect
      .poll(async () => Math.abs(((await page.locator('.paged-stage-frame').boundingBox())?.y ?? 0) - (slot?.y ?? -1)))
      .toBeLessThan(2);
    const ran = await callsOf(await editorFrame(page));
    expect(ran.filter((c) => c[0] === 'init')).toHaveLength(1);
  });

  test.describe('at 390px', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    for (const path of [SHOWCASES, FIRST_SCRIPT]) {
      test(`${path}: no sideways scroll, the workspace stacks`, async ({ page }) => {
        await standIn(page);
        await page.goto(path);
        await page.waitForLoadState('load');
        const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(sw, `page is ${sw}px wide in a ${iw}px viewport`).toBeLessThanOrEqual(iw + 1);
        const sheets = lab(page).locator('.paged-script-workspace > .paged-lab-sheet');
        const [a, b] = [await sheets.nth(0).boundingBox(), await sheets.nth(1).boundingBox()];
        expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
      });
    }
  });
});
