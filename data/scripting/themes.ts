/**
 * Themed groupings of the 179 settable paths (the second argument to
 * `paged.set`). Each theme carries an ordered `match` predicate so every path
 * lands in exactly one theme (first match wins — order matters), plus a seeded
 * showcase script that steps through a few representative paths with a visible
 * result. <PathReference> uses the groupings; <ScriptingLab themes="all"> runs the scripts.
 *
 * `demoPaths` (the paths a showcase actually writes) are validated against the
 * catalog by `check:scripting`, exactly like the example corpus.
 */
import type { SeedId } from './examples';

export interface PathTheme {
  id: string;
  title: string;
  summary: string;
  /** First theme (in array order) whose match() is true owns the path. */
  match: (path: string) => boolean;
  seed: SeedId;
  /** Representative paths the showcase writes (must exist in the catalog). */
  demoPaths: string[];
  script: string;
  lookFor: string;
}

const starts = (...prefixes: string[]) => (p: string) => prefixes.some((pre) => p.startsWith(pre));
const exact = (...names: string[]) => (p: string) => names.includes(p);
const any = (...fns: Array<(p: string) => boolean>) => (p: string) => fns.some((f) => f(p));

// Ordered most-specific → most-general so e.g. cell-edge strokes land in
// "Tables & cells" before the general "Strokes" theme, and applied* style refs
// land in "Styles & layers".
export const PATH_THEMES: PathTheme[] = [
  {
    id: 'anchored-textwrap',
    title: 'Anchored objects & text wrap',
    summary: 'How a frame anchors into text and how surrounding text flows around it.',
    match: any(starts('anchored', 'anchorPoint', 'frameTextWrap')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameTextWrapMode', 'frameTextWrapOffsets'],
    lookFor: 'More text fills the frame and flows around a grey box, keeping 12 pt clear on every side.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
const pid = JSON.parse(paged.pages())[0].selfId;
// More text, so there is something to wrap.
const story = JSON.parse(paged.stories())[0];
paged.insertText(story.selfId, story.characterCount, ' Lines that meet a frame with text wrap on break at its edge, keep the offset clear, and carry on past it.'.repeat(3));
// A tinted box over the text, with a bounding-box wrap 12 pt out.
const box = paged.insertFrame(pid, [180, 220, 290, 390]);
paged.set(box, 'frameFillColor', 'Color/Black');
paged.set(box, 'frameFillTint', 25);
paged.set(box, 'frameTextWrapMode', 'BoundingBoxTextWrap');
paged.set(box, 'frameTextWrapOffsets', [12, 12, 12, 12]);
paged.setElementSelection([ref]);
console.log(box, 'wraps the text, 12 pt clear');`,
  },
  {
    id: 'tables-cells',
    title: 'Tables & cells',
    summary:
      'Cell fills, insets and edge strokes. Structure and sizes are not property writes: rows and columns go through insertTableRow / insertTableColumn, their sizes through setRowHeight / setColumnWidth (the counts are read-only).',
    match: any(starts('cell', 'table'), exact('appliedCellStyle', 'appliedTableStyle')),
    seed: 'a-table',
    // tableRowCount / tableColumnCount are READ-ONLY since core v0.63.0
    // (6e90cef): settablePaths means settable, and the apply layer rejects them.
    demoPaths: ['cellFillColor', 'cellFillTint', 'cellBottomEdgeStrokeWeight'],
    lookFor: 'The table opens out to three 130 pt columns and 32 pt rows, its header row grey with a heavier rule under it.',
    script: `const story = JSON.parse(paged.stories())[0].selfId;
const table = JSON.parse(paged.query('table'))[0];  // "table:<id>"
const id = table.slice('table:'.length);
// Room for the cells: three 130 pt columns, 32 pt rows.
for (let c = 0; c < 3; c++) paged.setColumnWidth(story, id, c, 130);
for (let r = 0; r < 3; r++) paged.setRowHeight(story, id, r, 32);
// A tinted header row with a heavier rule under it.
for (let c = 0; c < 3; c++) {
  const cell = 'cell:' + id + '/0,' + c;
  paged.set(cell, 'cellFillColor', 'Color/Black');
  paged.set(cell, 'cellFillTint', 25);
  paged.set(cell, 'cellBottomEdgeStrokeWeight', 2);
}
// Leave the table and select the frame that holds it, so the stage frames it.
paged.clearSelection();
paged.setElementSelection(JSON.parse(paged.query('textFrame')));
console.log(table, 'is 3 × 3');`,
  },
  {
    id: 'text-paragraph',
    title: 'Text & paragraph',
    summary: 'Character size/leading/tracking/colour, paragraph spacing/justification, and text-frame columns.',
    match: any(
      starts('character', 'paragraph', 'textFrame', 'frameInset'),
      exact('appliedParagraphStyle', 'appliedCharacterStyle'),
    ),
    seed: 'styled-story',
    demoPaths: ['characterFontSize', 'paragraphSpaceAfter'],
    lookFor: 'The whole story sets at 28 pt, with 18 pt of space after each paragraph.',
    script: `const story = JSON.parse(paged.stories())[0];
// Address the whole story: storyRange:<storyId>@<start>..<end>
const range = 'storyRange:' + story.selfId + '@0..' + story.characterCount;
paged.set(range, 'characterFontSize', 28);
paged.set(range, 'paragraphSpaceAfter', 18);
console.log(range, 'at 28 pt');`,
  },
  {
    id: 'effects',
    title: 'Effects',
    summary: 'Drop shadow, inner shadow, glows, bevel, satin, and feathering.',
    match: any(
      starts(
        'frameDropShadow',
        'frameInnerShadow',
        'frameOuterGlow',
        'frameInnerGlow',
        'frameBevel',
        'frameSatin',
        'frameFeather',
        'frameDirectionalFeather',
      ),
    ),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameDropShadow', 'frameDropShadowSize', 'frameDropShadowXOffset', 'frameDropShadowYOffset', 'frameDropShadowOpacity'],
    lookFor: 'The frame takes a pale grey fill and casts a soft shadow down and to the right.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// A shadow falls from what the frame draws: give it a pale fill.
paged.set(ref, 'frameFillColor', 'Color/Black');
paged.set(ref, 'frameFillTint', 8);
paged.set(ref, 'frameDropShadow', true);
paged.set(ref, 'frameDropShadowSize', 10);
paged.set(ref, 'frameDropShadowXOffset', 8);
paged.set(ref, 'frameDropShadowYOffset', 8);
paged.set(ref, 'frameDropShadowOpacity', 60);
console.log(ref, 'drop shadow: on');`,
  },
  {
    id: 'corners-fitting',
    title: 'Corners & fitting',
    summary: 'Rounded/fancy corner options and image-fitting behaviour.',
    match: any(starts('frameCorner', 'frameFitting', 'frameAutoFit')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameCornerOptionTopLeft', 'frameCornerOptionTopRight', 'frameCornerOptionBottomLeft', 'frameCornerOptionBottomRight', 'frameCornerRadiusTopLeft', 'frameCornerRadiusTopRight', 'frameCornerRadiusBottomLeft', 'frameCornerRadiusBottomRight'],
    lookFor: 'The frame gains a black rule, and all four corners round to a 36 pt radius.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// Corners show on a frame with an edge: give it a rule first.
paged.set(ref, 'frameStrokeColor', 'Color/Black');
paged.set(ref, 'frameStrokeWeight', 3);
for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) {
  paged.set(ref, 'frameCornerOption' + corner, 'RoundedCorner');
  paged.set(ref, 'frameCornerRadius' + corner, 36);
}
console.log(ref, 'corners: rounded, 36 pt');`,
  },
  {
    id: 'strokes',
    title: 'Strokes & dashes',
    summary: 'Stroke colour, weight, type, joins, caps, arrowheads, and gradient strokes.',
    match: any(starts('frameStroke', 'frameGradientStroke', 'frameOverprintStroke')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameStrokeColor', 'frameStrokeWeight', 'frameStrokeType'],
    lookFor: 'The frame gains a thick dashed black border.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameStrokeColor', 'Color/Black');
paged.set(ref, 'frameStrokeWeight', 4);
paged.set(ref, 'frameStrokeType', 'Dashed');
console.log(ref, 'stroke: 4 pt, dashed, black');`,
  },
  {
    id: 'fills',
    title: 'Fills & gradients',
    summary: 'Solid fills, tints, gradient fills, and overprint.',
    match: any(starts('frameFill', 'frameGradientFill', 'frameOverprintFill'), exact('characterFillColor')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameFillColor', 'frameFillTint'],
    lookFor: 'The frame fills with a 60% tint of red, from a swatch the script makes first (a new document has only Black).',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// A new document has only Black: make a red swatch first.
const red = paged.createSwatch({ space: 'CMYK', value: [0, 100, 100, 0], name: 'Red' });
paged.set(ref, 'frameFillColor', red);
paged.set(ref, 'frameFillTint', 60);
console.log(ref, 'fill:', red, 'at 60%');`,
  },
  {
    id: 'transform',
    title: 'Transform & geometry',
    summary: 'Bounds, rotation, scale, flips, the vector path, and image content placement.',
    match: any(
      starts('frameBounds', 'frameTransform', 'frameRotation', 'frameScale', 'frameFlip', 'framePath', 'pathPoint', 'imageContent', 'groupTransform'),
    ),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameRotationAngle', 'frameScaleX', 'frameScaleY'],
    lookFor: 'The frame, filled pale grey, turns 15° and grows by a tenth.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// A pale fill, so the frame's own turn shows, not only its text's.
paged.set(ref, 'frameFillColor', 'Color/Black');
paged.set(ref, 'frameFillTint', 12);
paged.set(ref, 'frameRotationAngle', 15);
paged.set(ref, 'frameScaleX', 1.1);
paged.set(ref, 'frameScaleY', 1.1);
console.log(ref, 'rotated 15°, scaled to 110%');`,
  },
  {
    id: 'blend-opacity',
    title: 'Blend & opacity',
    summary: 'Frame opacity, blend mode, and non-printing.',
    match: any(exact('frameOpacity', 'frameBlendMode', 'frameNonprinting')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameOpacity', 'frameBlendMode'],
    lookFor: 'A red box lies over the frame’s first lines at 55% opacity with a Multiply blend: the text shows through it.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
const pid = JSON.parse(paged.pages())[0].selfId;
// A red box over the frame's text...
const red = paged.createSwatch({ space: 'CMYK', value: [0, 100, 100, 0], name: 'Red' });
const box = paged.insertFrame(pid, [150, 200, 260, 420]);
paged.set(box, 'frameFillColor', red);
// ...at 55% opacity, multiplied with what lies under it.
paged.set(box, 'frameOpacity', 55);
paged.set(box, 'frameBlendMode', 'Multiply');
paged.setElementSelection([ref]);
console.log(box, 'opacity 55%, Multiply');`,
  },
  {
    // Catch-all: applied object/condition styles, layers, visibility, plugin metadata,
    // and anything not matched above.
    id: 'styles-layers',
    title: 'Styles, layers & visibility',
    summary: 'Applied object styles, conditions, layer attributes, lock/visibility, and plugin metadata.',
    match: () => true,
    seed: 'one-text-frame-selected',
    demoPaths: ['appliedObjectStyle', 'elementVisible'],
    lookFor: 'The frame takes the new object style’s grey fill and black rule; the console shows it hidden, then visible again.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// An object style carries a look: a tinted fill and a black rule.
const style = paged.createObjectStyle({ name: 'Callout' });
paged.setStyleProperty('object', style, 'frameFillColor', 'Color/Black');
paged.setStyleProperty('object', style, 'frameFillTint', 15);
paged.setStyleProperty('object', style, 'frameStrokeColor', 'Color/Black');
paged.setStyleProperty('object', style, 'frameStrokeWeight', 3);
// Applying it gives the frame that look.
paged.set(ref, 'appliedObjectStyle', style);
// Visibility: hide the frame, then show it again.
paged.set(ref, 'elementVisible', false);
console.log('visible:', JSON.parse(paged.get(ref, 'elementVisible')).value);
paged.set(ref, 'elementVisible', true);
console.log('visible:', JSON.parse(paged.get(ref, 'elementVisible')).value);`,
  },
];

/** Assign a path to the first theme whose match() accepts it (always succeeds — last theme is a catch-all). */
export function themeForPath(path: string): PathTheme {
  return PATH_THEMES.find((t) => t.match(path)) ?? PATH_THEMES[PATH_THEMES.length - 1];
}

export function themeById(id: string): PathTheme | undefined {
  return PATH_THEMES.find((t) => t.id === id);
}
