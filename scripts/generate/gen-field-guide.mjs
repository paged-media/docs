#!/usr/bin/env node
/**
 * gen-field-guide — the data of idml.paged.media/field-guide/
 * (components/mdx/field-guide.tsx, docs/adr/810-next-edition-chrome.md): one
 * InDesign-verified example's page, and its package followed from the design
 * map to a text frame, the frame's story and the paragraph style the story
 * applies.
 *
 * Everything on the plate comes from the example's own IDML, read here at
 * build time; nothing is placed by hand:
 *   - the frame's bounds: each anchor of its PathPointArray through its
 *     ItemTransform, then into the page's space (the page's ItemTransform
 *     inverted, less its GeometricBounds origin);
 *   - A, the text frame: the centre of those bounds;
 *   - B, the story: the foot of its first line, mid-column (the frame's
 *     column at its top inset, one line of 120% auto leading down);
 *   - C, the style: the first-line indent the applied style resolves to (its
 *     BasedOn chain walked to the root), as a span at the foot of that line;
 *   - the attribute names each card lists, as the example's XML spells them.
 * Positions are percentages of the page, the raster being the whole page as
 * InDesign exports it (examples/<id>/_verified/p1.webp, staged to
 * /examples/<id>/ by stage-verified.mjs).
 *
 * The example is `based-on-chain`: the one example whose story applies a named
 * paragraph style (Body Indented, based on Body), so the guide's last stop is
 * a real style chain; its frame is far larger than its one line, so the frame
 * and the story it shows are visibly two things.
 *
 * Output: .generated/field-guide.json. Usage: node scripts/generate/gen-field-guide.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXAMPLE = 'based-on-chain';
const DIR = join(ROOT, 'examples', EXAMPLE);
const PKG = join(DIR, 'package');
const OUT = join(ROOT, '.generated', 'field-guide.json');

// ── a small reader for hand-authored, well-formed example XML ──────────────────

/** Elements as { tag, attrs, children, text, start } (comments, PIs and CDATA skipped). */
function parse(xml) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g;
  let last = 0;
  let m;
  while ((m = re.exec(xml))) {
    const between = xml.slice(last, m.index);
    if (between.trim()) stack[stack.length - 1].text += between.trim();
    last = re.lastIndex;
    if (!m[2]) continue;
    if (m[1] === '/') {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of (m[3] ?? '').matchAll(/([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2];
    const node = { tag: m[2], attrs, children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (m[4] !== '/') stack.push(node);
  }
  return root;
}
const read = (part) => parse(readFileSync(join(PKG, part), 'utf8'));
function* walk(node) {
  for (const c of node.children) {
    yield c;
    yield* walk(c);
  }
}
const find = (node, pred) => {
  for (const n of walk(node)) if (pred(n)) return n;
  return null;
};
const byTag = (node, tag) => find(node, (n) => n.tag === tag);
const childTags = (node) => [...new Set(node.children.map((c) => c.tag))];
const propertyTags = (node) => {
  const props = node.children.find((c) => c.tag === 'Properties');
  return props ? [...new Set(props.children.map((c) => c.tag))] : [];
};

// ── geometry ─────────────────────────────────────────────────────────────────

/** "a b c d tx ty" → a function of a point. */
function affine(s = '1 0 0 1 0 0') {
  const [a, b, c, d, tx, ty] = s.trim().split(/\s+/).map(Number);
  return { a, b, c, d, tx, ty, apply: ([x, y]) => [a * x + c * y + tx, b * x + d * y + ty] };
}
function inverse(t) {
  const det = t.a * t.d - t.b * t.c;
  const a = t.d / det;
  const b = -t.b / det;
  const c = -t.c / det;
  const d = t.a / det;
  const tx = -(a * t.tx + c * t.ty);
  const ty = -(b * t.tx + d * t.ty);
  return { apply: ([x, y]) => [a * x + c * y + tx, b * x + d * y + ty] };
}
const round = (n, p = 3) => Math.round(n * 10 ** p) / 10 ** p;

// ── the package ──────────────────────────────────────────────────────────────

const manifest = JSON.parse(readFileSync(join(DIR, 'example.json'), 'utf8'));
const verified = manifest.verified;
if (verified?.status !== 'verified') throw new Error(`gen-field-guide: ${EXAMPLE} is not InDesign-verified`);

const designmap = read('designmap.xml');
const doc = byTag(designmap, 'Document');
const parts = doc.children.filter((c) => c.tag.startsWith('idPkg:')).map((c) => c.attrs.src);
const spreadPart = parts.find((p) => p.startsWith('Spreads/'));
const spreadXml = read(spreadPart);
const spread = byTag(spreadXml, 'Spread');
const page = spread.children.find((c) => c.tag === 'Page');
const frame = spread.children.find((c) => c.tag === 'TextFrame');
const storyPart = parts.find((p) => p === `Stories/Story_${frame.attrs.ParentStory}.xml`);
const story = byTag(read(storyPart), 'Story');
const psr = byTag(story, 'ParagraphStyleRange');
const styles = read('Resources/Styles.xml');
const styleById = new Map([...walk(styles)].filter((n) => n.tag === 'ParagraphStyle').map((n) => [n.attrs.Self, n]));
const applied = styleById.get(psr.attrs.AppliedParagraphStyle);
if (!applied) throw new Error(`gen-field-guide: no ParagraphStyle ${psr.attrs.AppliedParagraphStyle}`);

/** The style chain from the applied style to the root, through each BasedOn. */
function chain(style) {
  const out = [];
  for (let s = style; s && !out.includes(s); ) {
    out.push(s);
    const props = s.children.find((c) => c.tag === 'Properties');
    const based = props?.children.find((c) => c.tag === 'BasedOn')?.text ?? s.attrs.BasedOn;
    s = based ? styleById.get(based) : undefined;
  }
  return out;
}
const styleChain = chain(applied);
/** A paragraph attribute as the chain resolves it: the range's own, then each style's. */
const resolved = (name, fallback) => {
  if (psr.attrs[name] != null) return Number(psr.attrs[name]);
  for (const s of styleChain) if (s.attrs[name] != null) return Number(s.attrs[name]);
  return fallback;
};
const pointSize = resolved('PointSize', 12);
const firstLineIndent = resolved('FirstLineIndent', 0);
const leftIndent = resolved('LeftIndent', 0);
const sizeFrom = styleChain.find((s) => s.attrs.PointSize != null);

// The page: its GeometricBounds are "top left bottom right" in its own space.
const [pTop, pLeft, pBottom, pRight] = page.attrs.GeometricBounds.split(/\s+/).map(Number);
const pageW = pRight - pLeft;
const pageH = pBottom - pTop;
const toPage = inverse(affine(page.attrs.ItemTransform));
const frameT = affine(frame.attrs.ItemTransform);
const anchors = [...walk(frame)].filter((n) => n.tag === 'PathPointType').map((n) => n.attrs.Anchor.split(/\s+/).map(Number));
const corners = anchors.map((p) => toPage.apply(frameT.apply(p))).map(([x, y]) => [x - pLeft, y - pTop]);
const xs = corners.map((p) => p[0]);
const ys = corners.map((p) => p[1]);
const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };

// Insets: the frame's own TextFramePreference, else none (InDesign's default).
const tfp = byTag(frame, 'TextFramePreference');
const insetList = tfp?.attrs.InsetSpacing ?? byTag(tfp ?? { children: [] }, 'InsetSpacing')?.text;
const [inTop, inLeft, , inRight] = insetList ? insetList.split(/\s+/).map(Number) : [0, 0, 0, 0];
// The foot of the first line: B and C mark the line from just under it, so
// no marker sits on the type (components/mdx/field-guide.tsx).
const lineFoot = box.y + inTop + pointSize * 1.2;
const indentFrom = box.x + inLeft + leftIndent;
const indent = Math.max(firstLineIndent, 0);

const pct = ([x, y]) => ({ x: round((x / pageW) * 100, 2), y: round((y / pageH) * 100, 2) });
const hotspots = [
  { key: 'frame', label: 'A', ...pct([box.x + box.w / 2, box.y + box.h / 2]), at: 'the centre of the text frame’s bounds' },
  {
    key: 'story',
    label: 'B',
    ...pct([box.x + inLeft + (box.w - inLeft - inRight) / 2, lineFoot]),
    at: 'the foot of the story’s first line, mid-column',
  },
  {
    key: 'style',
    label: 'C',
    ...pct([indentFrom + indent / 2, lineFoot]),
    span: { x: round((indentFrom / pageW) * 100, 2), w: round((indent / pageW) * 100, 2) },
    at: `the ${firstLineIndent} pt first-line indent its style sets, measured under the line`,
  },
];

// ── the five stops ───────────────────────────────────────────────────────────

const pt = (n) => `${round(n, 1)} pt`;
const name = (self) => self.replace(/^ParagraphStyle\//, '').replace(/^\$ID\//, '');
const entries = [
  {
    key: 'package',
    title: 'The document package',
    element: 'Document',
    part: 'designmap.xml',
    attributes: Object.keys(doc.attrs).filter((a) => !a.startsWith('xmlns')),
    children: childTags(doc),
    text:
      `designmap.xml is the package’s table of contents: its Document element names ${parts.length} parts, ` +
      `among them ${spreadPart} and ${storyPart}, and lists the document’s stories in StoryList (${doc.attrs.StoryList}).`,
  },
  {
    key: 'spread',
    title: 'The spread',
    element: 'Spread',
    part: spreadPart,
    attributes: Object.keys(spread.attrs),
    children: childTags(spread),
    text:
      `Spread ${spread.attrs.Self} holds ${spread.attrs.PageCount === '1' ? 'one page' : `${spread.attrs.PageCount} pages`}, ` +
      `${page.attrs.Self} (${pt(pageW)} × ${pt(pageH)}), and the page items on it, each placed by its own ` +
      `ItemTransform in the spread’s space; the plate shows them in the page’s.`,
  },
  {
    key: 'frame',
    title: 'The text frame',
    element: 'TextFrame',
    part: spreadPart,
    attributes: Object.keys(frame.attrs),
    children: [...childTags(frame), ...propertyTags(frame).map((t) => `Properties/${t}`)],
    text:
      `TextFrame ${frame.attrs.Self} is ${pt(box.w)} × ${pt(box.h)}, placed at ${pt(box.x)}, ${pt(box.y)} on the page by ` +
      `its ItemTransform. It holds no text: ParentStory names the story it shows, ${frame.attrs.ParentStory}.`,
  },
  {
    key: 'story',
    title: 'The story',
    element: 'Story',
    part: storyPart,
    attributes: Object.keys(story.attrs),
    children: [...new Set([...walk(story)].map((n) => n.tag))],
    text:
      `Story ${story.attrs.Self} lives in its own part, ${storyPart}. Its one paragraph applies ` +
      `“${name(applied.attrs.Self)}”; the frame only decides where the words are set. Its first line uses ` +
      `${round(pointSize, 1)} pt of the frame’s ${pt(box.h)}.`,
  },
  {
    key: 'style',
    title: 'The style',
    element: 'ParagraphStyle',
    part: 'Resources/Styles.xml',
    attributes: Object.keys(applied.attrs),
    children: propertyTags(applied).map((t) => `Properties/${t}`),
    text:
      `ParagraphStyle “${name(applied.attrs.Self)}” sets FirstLineIndent ${pt(firstLineIndent)} and is based on ` +
      `${styleChain.slice(1).map((s) => `“${name(s.attrs.Self)}”`).join(', then ')}. ` +
      `The paragraph’s ${round(pointSize, 1)} pt size comes from “${name(sizeFrom?.attrs.Self ?? '')}”, down the chain.`,
  },
];

// ── provenance ───────────────────────────────────────────────────────────────

function git(args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
// The last commit that touched the example; in a shallow clone, the commit
// checked out, which holds the same bytes.
const [commit, commitDate] = (git(['log', '-1', '--format=%H %cI', '--', `examples/${EXAMPLE}`]) || git(['log', '-1', '--format=%H %cI'])).split(' ');

const raster = (f) => (existsSync(join(DIR, '_verified', f)) ? `/examples/${EXAMPLE}/${f}` : null);
const out = {
  schema: 'paged.field-guide/1',
  example: {
    id: EXAMPLE,
    title: manifest.title,
    commit: commit || null,
    commitDate: commitDate || null,
    indesignVersion: verified.indesignVersion,
    verifiedAt: verified.verifiedAt,
    raster: { src: raster('p1.webp'), src3x: raster('p1@3x.webp'), width: Math.round((pageW * 96) / 72), height: Math.round((pageH * 96) / 72) },
  },
  page: { width: round(pageW), height: round(pageH) },
  frame: {
    x: round((box.x / pageW) * 100, 2),
    y: round((box.y / pageH) * 100, 2),
    w: round((box.w / pageW) * 100, 2),
    h: round((box.h / pageH) * 100, 2),
  },
  hotspots,
  entries,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(
  `gen-field-guide: ${EXAMPLE} at ${commit ? commit.slice(0, 7) : 'an unknown commit'}; frame ${pt(box.w)} × ${pt(box.h)}; ` +
    hotspots.map((h) => `${h.label} ${h.x}%,${h.y}%`).join(' · '),
);
