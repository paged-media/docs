#!/usr/bin/env node
/**
 * capture-inspector — records the still of the IDML inspector that
 * idml.paged.media/tools/inspector/ shows (<EditorFigure id="inspector" />,
 * data/editor-figures.ts), from this site's own build.
 *
 *   SITE=idml pnpm build && node scripts/capture-inspector.mjs [--chrome]
 *
 * It serves out/ as the browser tests do (scripts/serve-out.mjs), opens the
 * inspector, loads the sample package, chooses a text frame so the tree and
 * the XML show their link, and writes the inspector's box as
 * public/editor/inspector.webp (encoded by the browser, so no image tool is
 * needed). Then it records the provenance in data/editor-figures.ts: this
 * checkout's commit and today's date. Capture from a clean, committed tree, so
 * the commit is the build the still shows; the script says so when it is not.
 *
 * --chrome uses the installed Google Chrome with WebGPU switched on, so the
 * page pane is drawn; without it Playwright's Chromium is used, and the pane
 * may say that WebGPU is missing.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'out');
const TARGET = join(ROOT, 'public', 'editor', 'inspector.webp');
const DATA = join(ROOT, 'data', 'editor-figures.ts');
const PORT = 3290;
const CHROME = process.argv.includes('--chrome');

if (!existsSync(join(OUT_DIR, 'tools', 'inspector', 'index.html'))) {
  console.error('capture-inspector: out/ is not an idml.paged.media build. Run `SITE=idml pnpm build` first.');
  process.exit(1);
}

const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain', '--untracked-files=no').length > 0;

const server = spawn(process.execPath, [join(ROOT, 'scripts', 'serve-out.mjs'), OUT_DIR, String(PORT)], { stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${base}/`)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 100));
}

const browser = await chromium.launch(
  CHROME ? { channel: 'chrome', headless: false, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=metal'] } : {},
);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await page.goto(`${base}/tools/inspector/`);
  await page.getByRole('button', { name: 'No file at hand? Open a sample' }).click();
  const tree = page.getByRole('tree', { name: 'Elements of Spreads/Spread_uspread.xml' });
  await tree.waitFor();
  await tree.getByRole('treeitem', { name: 'TextFrame uframeR' }).click();
  // the page pane draws (or says it cannot) after the package is parsed
  await page.waitForTimeout(2500);
  const box = page.locator('.paged-inspector');
  await box.scrollIntoViewIfNeeded();
  const png = await box.screenshot({ animations: 'disabled' });
  const webp = await page.evaluate(async (b64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.86 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { type: blob.type, data: btoa(s) };
  }, png.toString('base64'));
  if (webp.type !== 'image/webp') throw new Error(`the browser encoded ${webp.type}, not WebP`);
  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, Buffer.from(webp.data, 'base64'));
  console.log(`capture-inspector: wrote ${TARGET.slice(ROOT.length + 1)}`);
} finally {
  await browser.close();
  server.kill();
}

// The provenance: this checkout's commit, today.
const day = new Date().toISOString().slice(0, 10);
const src = readFileSync(DATA, 'utf8');
const entry = /(\n  inspector: \{[\s\S]*?provenance: )(null|\{[^}]*\})/;
if (!entry.test(src)) throw new Error('capture-inspector: no `inspector` entry in data/editor-figures.ts');
writeFileSync(DATA, src.replace(entry, `$1{ commit: '${commit}', capturedAt: '${day}' }`));
console.log(`capture-inspector: provenance ${commit.slice(0, 9)}, ${day}`);
if (dirty) console.warn('capture-inspector: the tree has uncommitted changes; the still may not match that commit. Commit first and capture again.');
