/**
 * Seed preludes for the scripting examples — the docs-side mirror of the editor's
 * named seed registry (`editor/apps/canvas/src/playground/seeds.ts`). Each is PURE
 * `paged.*` source that scaffolds a starter document; the docs playground passes
 * the seed *name* to the editor (which runs its copy), and `pnpm validate:scripting`
 * runs THIS copy through `paged-run` so the bytes that ship are the bytes tested.
 *
 * Keep these in lockstep with the editor registry. They are deterministic so the
 * CI execution gate and Reset are repeatable.
 */
import type { SeedId } from './examples';

const PARA =
  'Paged is a programmable page-layout engine. This frame and its text were ' +
  'created by a paged.* seed script — the same API you are about to drive.';

export const SEED_PRELUDES: Record<SeedId, string> = {
  blank: '',

  'one-text-frame-selected': `
const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertTextFrame(pid, [144, 72, 360, 540]);
const stories = JSON.parse(paged.stories());
if (stories.length) {
  paged.insertText(stories[0].selfId, 0, ${JSON.stringify(PARA)});
}
`.trim(),

  'two-frames': `
const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertTextFrame(pid, [72, 72, 300, 320]);
const box = paged.insertFrame(pid, [340, 72, 520, 320]);
paged.set(box, "frameFillColor", "Color/Black");
paged.set(box, "frameFillTint", 20);
`.trim(),

  'styled-story': `
const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertTextFrame(pid, [108, 72, 540, 540]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, "Heading\\nThe body follows the heading. Each newline starts a new paragraph in the same story.");
const ps = JSON.parse(paged.paragraphStyles());
if (ps.length) {
  paged.applyStyle(sid, 0, 7, ps[0].selfId);
}
`.trim(),

  'swatches-and-styles': `
const pid = JSON.parse(paged.pages())[0].selfId;
const colors = ["Color/Black", "Color/Red", "Color/Black", "Color/Black"];
const tints = [100, 100, 50, 20];
for (let i = 0; i < colors.length; i++) {
  const left = 72 + i * 120;
  const chip = paged.insertFrame(pid, [120, left, 240, left + 96]);
  paged.set(chip, "frameFillColor", colors[i]);
  paged.set(chip, "frameFillTint", tints[i]);
}
`.trim(),

  'image-frame': `
const pid = JSON.parse(paged.pages())[0].selfId;
const head = paged.insertFrame(pid, [54, 96, 96, 480]);
paged.set(head, "frameFillColor", "Color/Black");
paged.set(head, "frameFillTint", 12);
paged.insertFrame(pid, [120, 96, 420, 480]);
`.trim(),

  'a-table': `
const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertTextFrame(pid, [108, 72, 420, 540]);
const sid = JSON.parse(paged.stories())[0].selfId;
if (typeof paged.insertTable === "function") {
  paged.insertTable(sid, { rows: 3, cols: 3 });
}
`.trim(),

  // ── Rich DTP templates ─────────────────────────────────────────────────────
  // Byte-identical to the editor registry (editor/apps/canvas/src/playground/
  // seeds.ts). The text-bearing ones use addText() to map each new frame to ITS
  // OWN story (story ids diffed before/after insert), so multi-frame layouts are
  // safe; starter-page has NO stories, so a script's first created frame owns
  // stories()[0].

  flyer: `
const pid = JSON.parse(paged.pages())[0].selfId;
const addText = function (bounds, text) {
  const before = JSON.parse(paged.stories()).map(function (s) { return s.selfId; });
  const ref = paged.insertTextFrame(pid, bounds);
  const after = JSON.parse(paged.stories());
  for (let i = 0; i < after.length; i++) {
    if (before.indexOf(after[i].selfId) === -1) {
      paged.insertText(after[i].selfId, 0, text);
      break;
    }
  }
  return ref;
};
const banner = paged.insertFrame(pid, [54, 54, 150, 558]);
paged.set(banner, "frameFillColor", "Color/Red");
const title = addText([170, 54, 280, 558], "Summer Open House");
addText([288, 54, 344, 558], "Saturday 14 June, 10am to 4pm, Studio 7");
const photo = paged.insertFrame(pid, [360, 54, 720, 558]);
paged.set(photo, "frameFillColor", "Color/Black");
paged.set(photo, "frameFillTint", 18);
paged.setElementSelection([title]);
`.trim(),

  'article-spread': `
const pid = JSON.parse(paged.pages())[0].selfId;
const addText = function (bounds, text) {
  const before = JSON.parse(paged.stories()).map(function (s) { return s.selfId; });
  const ref = paged.insertTextFrame(pid, bounds);
  const after = JSON.parse(paged.stories());
  for (let i = 0; i < after.length; i++) {
    if (before.indexOf(after[i].selfId) === -1) {
      paged.insertText(after[i].selfId, 0, text);
      break;
    }
  }
  return ref;
};
addText([54, 54, 108, 558], "The Long Read");
const body = addText([118, 54, 600, 558], "The body copy runs in two balanced columns beneath the headline, flowing from the left column into the right as one continuous story set at a steady reading size.");
paged.set(body, "textFrameColumnCount", 2);
paged.set(body, "textFrameColumnGutter", 16);
const quote = addText([620, 54, 720, 320], "A pull quote lifts a line out of the story.");
paged.set(quote, "frameFillColor", "Color/Black");
paged.set(quote, "frameFillTint", 10);
const photo = paged.insertFrame(pid, [620, 340, 720, 558]);
paged.set(photo, "frameFillColor", "Color/Black");
paged.set(photo, "frameFillTint", 25);
paged.setElementSelection([body]);
`.trim(),

  'report-page': `
const pid = JSON.parse(paged.pages())[0].selfId;
const band = paged.insertFrame(pid, [48, 54, 96, 558]);
paged.set(band, "frameFillColor", "Color/Black");
paged.set(band, "frameFillTint", 12);
paged.insertTextFrame(pid, [112, 54, 720, 558]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, "Quarterly Report\\nThe summary below introduces this quarter's figures.");
if (typeof paged.insertTable === "function") {
  paged.insertTable(sid, { rows: 4, cols: 3, headerRows: 1 });
}
`.trim(),

  catalog: `
const pid = JSON.parse(paged.pages())[0].selfId;
const lefts = [54, 222, 390];
const tops = [96, 372];
for (let r = 0; r < tops.length; r++) {
  for (let c = 0; c < lefts.length; c++) {
    const top = tops[r];
    const left = lefts[c];
    const tile = paged.insertFrame(pid, [top, left, top + 220, left + 144]);
    paged.set(tile, "frameFillColor", "Color/Black");
    paged.set(tile, "frameFillTint", 15 + (r * 3 + c) * 12);
  }
}
`.trim(),

  'starter-page': `
const pid = JSON.parse(paged.pages())[0].selfId;
const head = paged.insertFrame(pid, [40, 54, 92, 558]);
paged.set(head, "frameFillColor", "Color/Black");
paged.set(head, "frameFillTint", 12);
paged.insertLine(pid, [54, 740], [558, 740]);
const foot = paged.insertFrame(pid, [748, 54, 762, 558]);
paged.set(foot, "frameFillColor", "Color/Black");
paged.set(foot, "frameFillTint", 8);
`.trim(),
};

export function seedPrelude(id: SeedId): string {
  return SEED_PRELUDES[id] ?? '';
}
