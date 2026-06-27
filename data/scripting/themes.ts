/**
 * Themed groupings of the 179 settable paths (the second argument to
 * `paged.set`). Each theme carries an ordered `match` predicate so every path
 * lands in exactly one theme (first match wins — order matters), plus a seeded
 * showcase script that steps through a few representative paths with a visible
 * result. <PathReference> uses the groupings; <PathShowcase> renders the script.
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
    lookFor: 'The frame gains a text-wrap boundary with an offset on all sides.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameTextWrapMode', 'BoundingBoxTextWrap');
paged.set(ref, 'frameTextWrapOffsets', [12, 12, 12, 12]);`,
  },
  {
    id: 'tables-cells',
    title: 'Tables & cells',
    summary: 'Cell fills, insets, edge strokes, and table row/column structure.',
    match: any(starts('cell', 'table'), exact('appliedCellStyle', 'appliedTableStyle')),
    seed: 'a-table',
    demoPaths: ['tableRowCount', 'tableColumnCount'],
    lookFor: 'The console reports the table’s row and column counts.',
    script: `// Find the table id from the story tree, then read its dimensions.
const story = JSON.parse(paged.stories())[0];
console.log('story', story.selfId, '— see paged.inspect for cell paths');`,
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
    lookFor: 'The story’s type grows and gains space after each paragraph.',
    script: `const story = JSON.parse(paged.stories())[0].selfId;
// Address a character range: storyRange:<storyId>@<start>..<end>
const range = 'storyRange:' + story + '@0..40';
paged.set(range, 'characterFontSize', 18);
paged.set(range, 'paragraphSpaceAfter', 8);`,
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
    demoPaths: ['frameDropShadow', 'frameDropShadowSize', 'frameDropShadowOpacity'],
    lookFor: 'A soft drop shadow appears behind the frame.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameDropShadow', true);
paged.set(ref, 'frameDropShadowSize', 9);
paged.set(ref, 'frameDropShadowOpacity', 60);`,
  },
  {
    id: 'corners-fitting',
    title: 'Corners & fitting',
    summary: 'Rounded/fancy corner options and image-fitting behaviour.',
    match: any(starts('frameCorner', 'frameFitting', 'frameAutoFit')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameCornerOptionTopLeft', 'frameCornerRadiusTopLeft'],
    lookFor: 'The frame’s top-left corner becomes rounded.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameCornerOptionTopLeft', 'Rounded');
paged.set(ref, 'frameCornerRadiusTopLeft', 18);`,
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
paged.set(ref, 'frameStrokeType', 'Dashed');`,
  },
  {
    id: 'fills',
    title: 'Fills & gradients',
    summary: 'Solid fills, tints, gradient fills, and overprint.',
    match: any(starts('frameFill', 'frameGradientFill', 'frameOverprintFill'), exact('characterFillColor')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameFillColor', 'frameFillTint'],
    lookFor: 'The frame fills with a 60% tint of red.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameFillColor', 'Color/Red');
paged.set(ref, 'frameFillTint', 60);`,
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
    lookFor: 'The frame rotates 15° and scales up slightly.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameRotationAngle', 15);
paged.set(ref, 'frameScaleX', 1.1);
paged.set(ref, 'frameScaleY', 1.1);`,
  },
  {
    id: 'blend-opacity',
    title: 'Blend & opacity',
    summary: 'Frame opacity, blend mode, and non-printing.',
    match: any(exact('frameOpacity', 'frameBlendMode', 'frameNonprinting')),
    seed: 'one-text-frame-selected',
    demoPaths: ['frameOpacity', 'frameBlendMode'],
    lookFor: 'The frame becomes semi-transparent with a Multiply blend.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameFillColor', 'Color/Black');
paged.set(ref, 'frameOpacity', 55);
paged.set(ref, 'frameBlendMode', 'Multiply');`,
  },
  {
    // Catch-all: applied object/condition styles, layers, visibility, plugin metadata,
    // and anything not matched above.
    id: 'styles-layers',
    title: 'Styles, layers & visibility',
    summary: 'Applied object styles, conditions, layer attributes, lock/visibility, and plugin metadata.',
    match: () => true,
    seed: 'one-text-frame-selected',
    demoPaths: ['elementVisible', 'appliedObjectStyle'],
    lookFor: 'The frame is hidden, then shown again.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'elementVisible', false);
console.log('hidden');
paged.set(ref, 'elementVisible', true);
console.log('shown');`,
  },
];

/** Assign a path to the first theme whose match() accepts it (always succeeds — last theme is a catch-all). */
export function themeForPath(path: string): PathTheme {
  return PATH_THEMES.find((t) => t.match(path)) ?? PATH_THEMES[PATH_THEMES.length - 1];
}

export function themeById(id: string): PathTheme | undefined {
  return PATH_THEMES.find((t) => t.id === id);
}
