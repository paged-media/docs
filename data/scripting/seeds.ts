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
paged.insertFrame(pid, [340, 72, 520, 320]);
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
paged.insertFrame(pid, [120, 120, 320, 420]);
`.trim(),

  'image-frame': `
const pid = JSON.parse(paged.pages())[0].selfId;
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
};

export function seedPrelude(id: SeedId): string {
  return SEED_PRELUDES[id] ?? '';
}
