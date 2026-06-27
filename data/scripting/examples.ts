/**
 * The paged.* scripting example corpus — one (or more) editable, working
 * showcase per host function. Each example is PURE `paged.*` source that runs
 * in the docs playground (`<FunctionPlayground>` / `<ScriptingPlayground>`)
 * against a named starter document (`seed`), and is validated headlessly
 * against the real engine by `pnpm validate:scripting` (the `paged-run` gate).
 *
 * Authoring rules (so every example actually works):
 *  - Reads return JSON STRINGS — always `JSON.parse(...)` before indexing.
 *  - Parsed selection/tree elements are `{ kind, id }`; address one as the
 *    string `kind + ':' + id` (e.g. "textFrame:u3") for paged.set / inspect.
 *  - Keep scripts deterministic so the CI gate + Reset are repeatable.
 *
 * The corpus is docs-owned (kept OUT of the generated catalog so the catalog
 * stays zero-maintenance), but PINNED to it: `gen-scripting-examples.mjs`
 * fails the build if an example references a fn/path the engine no longer has.
 */

export type SeedId =
  | 'blank'
  | 'one-text-frame-selected'
  | 'two-frames'
  | 'styled-story'
  | 'swatches-and-styles'
  | 'image-frame'
  | 'a-table';

export interface ScriptingExample {
  /** Stable slug → playground anchor. */
  id: string;
  /** Primary host fn this example showcases (must exist in the catalog). */
  fn: string;
  /** Other host fns the script also exercises. */
  alsoFns?: string[];
  /** Settable paths touched (must exist in the catalog; cross-link source). */
  paths?: string[];
  title: string;
  summary?: string;
  /** Named starter document (see editor playground/seeds + data/scripting/seeds). */
  seed: SeedId;
  /** The editable, pure-paged.* snippet. */
  script: string;
  /** What visibly changes when it runs — drives the "Look for" hint. */
  lookFor: string;
  level?: 'beginner' | 'intermediate' | 'pro';
  /**
   * Capability-registry row this example exercises (e.g.
   * `scripting.property-readwrite`). Verbatim from the state repo's
   * `SCRIPT_FEATURE` map (`state/scripts/completeness-check.mjs`); lets the
   * gallery group examples by capability and ties docs ⇄ the feature registry.
   */
  feature?: string;
  /**
   * The core engine test (`paged_*` fn name in
   * `core/crates/paged-script/tests/script_basics.rs`) this script was adapted
   * from, when one exists — so the example is regression-guarded by a real test.
   * Undefined ⇒ a genuinely-new example with no backing test yet.
   */
  test?: string;
  /**
   * Validation expectation for `pnpm validate:scripting`. Defaults to `true`
   * (the run must report no error). Set `false` only for an example that
   * legitimately cannot run clean headlessly (none ship today).
   */
  expectOk?: boolean;
  /** Substrings the run's console output must contain (asserted by the gate). */
  expectOutput?: string[];
}

// Authored against the current engine catalog. Scripts use the parse-then-
// address pattern so they run as-is on today's engine.
export const SCRIPTING_EXAMPLES: ScriptingExample[] = [
  {
    id: 'set-frame-fill',
    fn: 'paged.set',
    feature: 'scripting.property-readwrite',
    test: 'paged_set_via_js_routes_through_apply_layer',
    paths: ['frameFillColor', 'frameRotationAngle'],
    title: 'Fill and rotate the selected frame',
    summary:
      'Read the selection, address it as kind:id, then write two properties. paged.set re-renders, so the change is immediate.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The text frame turns red and rotates 12°.',
    script: `// Reads return JSON strings — parse before indexing.
const [el] = JSON.parse(paged.selection());
if (el) {
  const ref = el.kind + ':' + el.id;        // e.g. "textFrame:u3"
  paged.set(ref, 'frameFillColor', 'Color/Red');
  paged.set(ref, 'frameRotationAngle', 12);
  console.log('styled', ref);
}`,
  },
  {
    id: 'inspect-element',
    test: 'runs_clean',
    fn: 'paged.inspect',
    feature: 'scripting.inspection',
    alsoFns: ['paged.selection'],
    title: 'Inspect every property of one element',
    summary: 'A full property snapshot for the selected frame — the source of valid settable paths.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The console prints the frame’s full property set as JSON.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
const props = JSON.parse(paged.inspect(ref));
console.log('properties of', ref);
console.log(JSON.stringify(props, null, 2));`,
  },
  {
    id: 'get-one-property',
    test: 'runs_clean',
    fn: 'paged.get',
    feature: 'scripting.property-readwrite',
    paths: ['frameBounds'],
    title: 'Read a single property value',
    summary: 'paged.get reads one property without the full inspect payload.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The console prints the frame’s bounds [top, left, bottom, right].',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
const bounds = JSON.parse(paged.get(ref, 'frameBounds'));
console.log('bounds', bounds);`,
  },
  {
    id: 'tree-walk',
    test: 'runs_clean',
    fn: 'paged.tree',
    feature: 'scripting.inspection',
    title: 'Walk the document hierarchy',
    summary: 'spreads → pages → frames. Page/spread ids are null by design; frames carry real ids.',
    seed: 'two-frames',
    level: 'beginner',
    lookFor: 'The console prints the spread/page/frame tree; two frames appear under page 1.',
    script: `const tree = JSON.parse(paged.tree());
for (const spread of tree) {
  console.log('spread', spread.label);
  for (const page of spread.children ?? []) {
    console.log('  page', page.label, '→', (page.children ?? []).length, 'frames');
    for (const frame of page.children ?? []) {
      console.log('    -', frame.kind, frame.id);
    }
  }
}`,
  },
  {
    id: 'pages-list',
    test: 'runs_clean',
    fn: 'paged.pages',
    feature: 'scripting.page-enumeration',
    title: 'List pages and their ids',
    summary: 'paged.pages() is the only way to get a usable page id (for insertFrame / insertPage).',
    seed: 'blank',
    level: 'beginner',
    lookFor: 'The console prints page 1 with its selfId and size in points.',
    script: `const pages = JSON.parse(paged.pages());
for (const p of pages) {
  console.log('page', p.index, '· id', p.selfId, '·', p.sizePt.join(' × '), 'pt');
}`,
  },
  {
    id: 'author-text-frame',
    test: 'author_text_frame',
    fn: 'paged.insertTextFrame',
    feature: 'scripting.text-authoring',
    alsoFns: ['paged.pages', 'paged.insertText'],
    title: 'Create a text frame and pour text into it',
    summary:
      'Get a page id, create a frame (it returns its new id and is auto-selected), then insert text into its story.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'A new text frame appears on the page with a sentence of text.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const frame = paged.insertTextFrame(pid, [120, 72, 320, 480]);   // [t,l,b,r] in pt
console.log('created', frame);                                    // "textFrame:uX"

const story = JSON.parse(paged.stories())[0].selfId;
paged.insertText(story, 0, 'Authored entirely by a paged.* script.');`,
  },
  {
    id: 'edit-text',
    test: 'edit_text',
    fn: 'paged.insertText',
    feature: 'scripting.text-authoring',
    alsoFns: ['paged.deleteRange', 'paged.stories'],
    title: 'Insert and delete text in a story',
    summary: 'Story body edits by character offset; \\n splits paragraphs.',
    seed: 'styled-story',
    level: 'intermediate',
    lookFor: 'A prefix is inserted at the start of the story, then the first word is deleted again.',
    script: `const story = JSON.parse(paged.stories())[0].selfId;
paged.insertText(story, 0, 'NEW: ');
console.log('after insert:', JSON.parse(paged.stories())[0].characterCount, 'chars');
paged.deleteRange(story, 0, 5);   // remove the "NEW: " we just added
console.log('after delete:', JSON.parse(paged.stories())[0].characterCount, 'chars');`,
  },
  {
    id: 'apply-paragraph-style',
    test: 'runs_clean',
    fn: 'paged.applyStyle',
    feature: 'scripting.structural-authoring',
    alsoFns: ['paged.paragraphStyles'],
    title: 'Apply a paragraph style to a range',
    summary: 'Scope is inferred from the ref prefix (CharacterStyle/… else Paragraph).',
    seed: 'styled-story',
    level: 'intermediate',
    lookFor: 'The first line takes on the first paragraph style in the document.',
    script: `const story = JSON.parse(paged.stories())[0].selfId;
const styles = JSON.parse(paged.paragraphStyles());
if (styles.length) {
  paged.applyStyle(story, 0, 7, styles[0].selfId);   // style the heading line
  console.log('applied', styles[0].name ?? styles[0].selfId);
}`,
  },
  {
    id: 'undo-redo',
    fn: 'paged.undo',
    feature: 'scripting.undo-redo',
    test: 'paged_undo_reverts_a_set',
    alsoFns: ['paged.redo', 'paged.set'],
    title: 'Undo and redo a write',
    summary: 'Every write lands on the same Operation channel as the UI, so undo/redo work exactly as in the editor.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The frame turns red, then undo reverts it, then redo re-applies it.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameFillColor', 'Color/Red');
console.log('filled red');
paged.undo();
console.log('undone — frame is unfilled again');
paged.redo();
console.log('redone — red again');`,
  },
  {
    id: 'place-image',
    test: 'runs_clean',
    fn: 'paged.placeImage',
    feature: 'scripting.structural-authoring',
    alsoFns: ['paged.insertFrame', 'paged.pages'],
    title: 'Place an image into a frame',
    summary: 'Create a graphic frame, then place an image into it with an optional fitting mode.',
    seed: 'image-frame',
    level: 'intermediate',
    lookFor: 'The graphic frame fills with the placed image.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// A data: or https: uri the engine can fetch; fit is optional.
paged.placeImage(ref, 'https://docs.paged.media/preview/sample.png', 'fillProportional');
console.log('placed into', ref);`,
  },

  // ── the wider mutation surface ─────────────────────────────────────────────
  {
    id: 'delete-element',
    test: 'delete_element',
    fn: 'paged.deleteElement',
    feature: 'scripting.full-mutation-surface',
    title: 'Delete an element',
    summary: 'Remove any frame, group, or shape from the page by id.',
    seed: 'two-frames',
    level: 'intermediate',
    lookFor: 'The selected (graphic) frame disappears from the page.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
console.log('deleting', ref, '→', paged.deleteElement(ref));`,
  },
  {
    id: 'insert-oval',
    test: 'runs_clean',
    fn: 'paged.insertOval',
    feature: 'scripting.full-mutation-surface',
    alsoFns: ['paged.pages'],
    title: 'Draw an oval',
    summary: 'A graphic primitive — like insertLine / insertFrame, it returns the new element id.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'An oval appears in the middle of the page.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const oval = paged.insertOval(pid, [200, 180, 380, 440]);   // [t,l,b,r] in pt
console.log('created', oval);
if (oval) paged.set(oval, 'frameFillColor', 'Color/Black');`,
  },
  {
    id: 'insert-line',
    test: 'runs_clean',
    fn: 'paged.insertLine',
    feature: 'scripting.full-mutation-surface',
    alsoFns: ['paged.pages'],
    title: 'Draw a line',
    summary: 'A graphic line between two page-local points.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'A diagonal line is drawn across the page.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const line = paged.insertLine(pid, [72, 72], [360, 480]);    // [x1,y1] → [x2,y2]
console.log('created', line);`,
  },
  {
    id: 'duplicate-page',
    test: 'duplicate_page',
    fn: 'paged.duplicatePage',
    feature: 'scripting.full-mutation-surface',
    alsoFns: ['paged.pages'],
    title: 'Duplicate a page',
    summary: 'Returns the new page selfId — reusable as the next afterPageId.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The document grows from 1 to 2 pages (and the new page copies the frame).',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const copy = paged.duplicatePage(pid);
console.log('duplicated', pid, '→', copy);
console.log('pages now:', JSON.parse(paged.pages()).length);`,
  },
  {
    id: 'move-frame',
    test: 'runs_clean',
    fn: 'paged.moveFrame',
    feature: 'scripting.full-mutation-surface',
    title: 'Move a frame by a transform',
    summary: 'A 2×3 affine [a,b,c,d,tx,ty]; here a pure translate of 72pt right and down.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The frame shifts 72pt (one inch) down and to the right.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.moveFrame(ref, [1, 0, 0, 1, 72, 72]);   // translate by (72, 72)
console.log('moved', ref);`,
  },
  {
    id: 'resize-frame',
    test: 'runs_clean',
    fn: 'paged.resizeFrame',
    feature: 'scripting.full-mutation-surface',
    paths: ['frameBounds'],
    title: 'Resize a frame to new bounds',
    summary: 'Set the frame’s [top, left, bottom, right] box directly.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The frame grows to fill more of the page.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.resizeFrame(ref, [108, 72, 540, 540]);
console.log('resized', ref, '→', paged.get(ref, 'frameBounds'));`,
  },
  {
    id: 'set-selection',
    fn: 'paged.setElementSelection',
    feature: 'scripting.full-mutation-surface',
    test: 'paged_set_element_selection_is_reflected_by_paged_selection',
    alsoFns: ['paged.tree', 'paged.selection'],
    title: 'Select elements from a script',
    summary: 'Selection is app state (not undoable); set it to drive the Properties panel.',
    seed: 'two-frames',
    level: 'intermediate',
    lookFor: 'Both frames on the page become selected.',
    script: `// Collect every frame id from the tree.
const refs = [];
for (const sp of JSON.parse(paged.tree()))
  for (const pg of sp.children ?? [])
    for (const fr of pg.children ?? []) refs.push(fr.kind + ':' + fr.id);

paged.setElementSelection(refs);
console.log('selected', JSON.parse(paged.selection()).length, 'of', refs.length);`,
  },
  {
    id: 'create-paragraph-style',
    fn: 'paged.createParagraphStyle',
    feature: 'scripting.full-mutation-surface',
    test: 'paged_create_paragraph_style_returns_id_and_appears_in_collection',
    alsoFns: ['paged.applyStyle', 'paged.stories'],
    title: 'Create and apply a paragraph style',
    summary: 'Style CRUD returns the new style id; pass it straight to applyStyle.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A new “Caption” style is created and applied to the first line.',
    script: `const styleId = paged.createParagraphStyle({ name: 'Caption' });
console.log('created style', styleId);
const story = JSON.parse(paged.stories())[0].selfId;
if (styleId) paged.applyStyle(story, 0, 7, styleId);`,
  },
  {
    id: 'insert-table',
    fn: 'paged.insertTable',
    feature: 'scripting.full-mutation-surface',
    test: 'paged_insert_table_returns_a_table_id',
    alsoFns: ['paged.stories'],
    title: 'Insert a table into a story',
    summary: 'Create a rows×cols table; the spec also accepts headerRows/footerRows/colWidths.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A 3×3 table appears at the start of the story.',
    script: `const story = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(story, { rows: 3, cols: 3 });
console.log('created table', table);`,
  },
  {
    id: 'group-and-dissolve',
    test: 'runs_clean',
    fn: 'paged.dissolveGroup',
    feature: 'scripting.full-mutation-surface',
    alsoFns: ['paged.createGroup', 'paged.tree'],
    title: 'Group, then ungroup',
    summary: 'createGroup bundles two elements; dissolveGroup returns the members to the page.',
    seed: 'two-frames',
    level: 'pro',
    lookFor: 'The two frames are grouped, then ungrouped again (watch the selection bounds).',
    script: `const refs = [];
for (const sp of JSON.parse(paged.tree()))
  for (const pg of sp.children ?? [])
    for (const fr of pg.children ?? []) refs.push(fr.kind + ':' + fr.id);

paged.createGroup(refs);
// Find the group the engine just minted, then dissolve it.
let group = null;
for (const sp of JSON.parse(paged.tree()))
  for (const pg of sp.children ?? [])
    for (const fr of pg.children ?? []) if (fr.kind === 'group') group = fr.kind + ':' + fr.id;
console.log('grouped →', group, '· dissolved →', group && paged.dissolveGroup(group));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Reading the document — collections & document state
  // Reads return JSON strings; parse, then report a count or the first row.
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'list-swatches',
    test: 'runs_clean',
    fn: 'paged.swatches',
    feature: 'scripting.collections',
    title: 'List the colour swatches',
    summary: 'Walk the document palette — the source of the Color/<id> refs you pass to frameFillColor / frameStrokeColor.',
    seed: 'swatches-and-styles',
    level: 'beginner',
    lookFor: 'The console prints each swatch name and kind (process, spot, …).',
    script: `const swatches = JSON.parse(paged.swatches());
console.log(swatches.length, 'swatches in the palette');
for (const s of swatches) console.log(' -', s.name, '·', s.kind);`,
  },
  {
    id: 'list-gradients',
    test: 'runs_clean',
    fn: 'paged.gradients',
    feature: 'scripting.collections',
    title: 'List the document gradients',
    summary: 'Gradient swatches (linear / radial ramps) the document defines. A fresh document ships none until you add them.',
    seed: 'swatches-and-styles',
    level: 'beginner',
    lookFor: 'The console reports the gradient count (0 on a blank palette).',
    script: `const gradients = JSON.parse(paged.gradients());
console.log(gradients.length, 'gradient swatch(es) defined');
for (const g of gradients) console.log(' -', g.name ?? g.selfId);`,
  },
  {
    id: 'list-color-groups',
    test: 'runs_clean',
    fn: 'paged.colorGroups',
    feature: 'scripting.collections',
    title: 'List the colour groups',
    summary: 'Colour groups organise the palette into named folders (e.g. a brand set). Read them to mirror the Swatches panel grouping.',
    seed: 'swatches-and-styles',
    level: 'beginner',
    lookFor: 'The console reports how many colour groups the document organises its palette into.',
    script: `const groups = JSON.parse(paged.colorGroups());
console.log(groups.length, 'colour group(s)');
for (const g of groups) console.log(' -', g.name, '→', g.members.length, 'members');`,
  },
  {
    id: 'list-layers',
    test: 'runs_clean',
    fn: 'paged.layers',
    alsoFns: ['paged.layerInsert'],
    feature: 'scripting.collections',
    title: 'Read the layer stack',
    summary: 'Organise artwork onto named layers, then read the stack back — each row carries name, visibility, lock, print state and z-order.',
    seed: 'blank',
    level: 'beginner',
    lookFor: 'The console prints a Background → Artwork layer stack, bottom to top.',
    script: `paged.layerInsert(0, 'Background');
paged.layerInsert(1, 'Artwork');
const layers = JSON.parse(paged.layers());
console.log(layers.length, 'layers (bottom → top):');
for (const l of layers) console.log('  z' + l.z, l.name, l.visible ? '·visible' : '·hidden');`,
  },
  {
    id: 'list-paragraph-styles',
    test: 'runs_clean',
    fn: 'paged.paragraphStyles',
    feature: 'scripting.collections',
    title: 'List the paragraph styles',
    summary: 'The paragraph stylesheet — the source of the styleRefs you hand to applyStyle, plus each style BasedOn parent.',
    seed: 'styled-story',
    level: 'beginner',
    lookFor: 'The console prints every paragraph style and its BasedOn parent.',
    script: `const styles = JSON.parse(paged.paragraphStyles());
console.log(styles.length, 'paragraph styles:');
for (const s of styles) console.log(' -', s.name, s.basedOn ? '(based on ' + s.basedOn + ')' : '');`,
  },
  {
    id: 'list-character-styles',
    test: 'runs_clean',
    fn: 'paged.characterStyles',
    feature: 'scripting.collections',
    title: 'List the character styles',
    summary: 'Character (inline) styles — the run-level counterpart to paragraph styles, for emphasis, small caps, a coloured lead-in.',
    seed: 'styled-story',
    level: 'beginner',
    lookFor: 'The console prints the character stylesheet.',
    script: `const styles = JSON.parse(paged.characterStyles());
console.log(styles.length, 'character styles:');
for (const s of styles) console.log(' -', s.name);`,
  },
  {
    id: 'list-object-styles',
    test: 'runs_clean',
    fn: 'paged.objectStyles',
    feature: 'scripting.collections',
    title: 'List the object styles',
    summary: 'Object styles bundle frame appearance (fill, stroke, effects, text-frame options) for one-click consistency across a layout.',
    seed: 'swatches-and-styles',
    level: 'beginner',
    lookFor: 'The console reports the object-style count.',
    script: `const styles = JSON.parse(paged.objectStyles());
console.log(styles.length, 'object style(s) defined');
for (const s of styles) console.log(' -', s.name);`,
  },
  {
    id: 'audit-links',
    test: 'runs_clean',
    fn: 'paged.links',
    alsoFns: ['paged.placeImage'],
    feature: 'scripting.collections',
    title: 'Audit placed-image links',
    summary: 'Place an image, then read the Links collection — each row reports the host frame, the asset URI and whether it resolved (a preflight check).',
    seed: 'image-frame',
    level: 'intermediate',
    lookFor: 'The console lists one placed-image link with its URI and status.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.placeImage(ref, 'https://docs.paged.media/preview/sample.png', 'fillProportional');
const links = JSON.parse(paged.links());
console.log(links.length, 'placed-image link(s):');
for (const l of links) console.log(' -', l.hostKind, '·', l.uri, '·', l.status || 'unresolved');`,
  },
  {
    id: 'list-conditions',
    test: 'runs_clean',
    fn: 'paged.conditions',
    feature: 'scripting.collections',
    title: 'List conditional-text conditions',
    summary: 'Conditions tag text for show/hide versioning (e.g. a Draft watermark, EN vs DE copy). Read the ones this document defines.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The console reports how many conditions the document defines (none on a fresh document).',
    script: `const conds = JSON.parse(paged.conditions());
console.log(conds.length, 'conditional-text condition(s)');
for (const c of conds) console.log(' -', c.name, c.visible ? '·shown' : '·hidden');`,
  },
  {
    id: 'list-condition-sets',
    test: 'runs_clean',
    fn: 'paged.conditionSets',
    feature: 'scripting.collections',
    title: 'List condition sets',
    summary: 'A condition set is a saved visibility snapshot across all conditions — one click to flip a document between, say, a print and a web variant.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The console reports the condition-set count.',
    script: `const sets = JSON.parse(paged.conditionSets());
console.log(sets.length, 'condition set(s)');
for (const s of sets) console.log(' -', s.name, '→', s.conditions.length, 'conditions');`,
  },
  {
    id: 'read-collection',
    test: 'runs_clean',
    fn: 'paged.collection',
    feature: 'scripting.collections',
    title: 'Read any typed collection by name',
    summary: 'One generic accessor over every document collection — here the spreads, so you can enumerate the layout sheet by sheet.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The console prints each spread and its page count.',
    script: `const spreads = JSON.parse(paged.collection('spreads'));
console.log(spreads.length, 'spread(s):');
for (const sp of spreads) console.log(' -', sp.label, '·', sp.pageCount, 'page(s)');`,
  },
  {
    id: 'read-document-meta',
    test: 'runs_clean',
    fn: 'paged.documentMeta',
    feature: 'scripting.inspection',
    title: 'Read whole-document metadata',
    summary: 'The single-shot document snapshot — page count, the new-object fill/stroke defaults, and the active colour-management settings.',
    seed: 'blank',
    level: 'beginner',
    lookFor: 'The console prints the page count and the document default fill/stroke.',
    script: `const meta = JSON.parse(paged.documentMeta());
console.log('pages:', meta.pageCount);
console.log('default fill:', meta.defaultFillColor ?? 'none', '· default stroke:', meta.defaultStrokeColor ?? 'none');
console.log('CMYK profile:', meta.cmykProfileName ?? '(working space)');`,
  },
  {
    id: 'read-stories',
    test: 'runs_clean',
    fn: 'paged.stories',
    feature: 'scripting.inspection',
    title: 'List the document stories',
    summary: 'Every text flow with its character and paragraph counts plus an overset flag — the source of the story ids text edits address.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The console prints the story id, character count and overset state.',
    script: `const stories = JSON.parse(paged.stories());
for (const s of stories) {
  console.log('story', s.selfId, '·', s.characterCount, 'chars /', s.paragraphCount, 'paras',
    s.overset ? '· OVERSET' : '');
}`,
  },
  {
    id: 'read-selection',
    test: 'runs_clean',
    fn: 'paged.selection',
    feature: 'scripting.inspection',
    title: 'Read the current selection',
    summary: 'What the user (or your last insert) has selected — the parsed element you address as kind:id for every property write.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The console prints the selected frame address.',
    script: `const sel = JSON.parse(paged.selection());
console.log(sel.length, 'element(s) selected');
for (const el of sel) console.log(' -', el.kind + ':' + el.id);`,
  },
  {
    id: 'read-content-selection',
    test: 'runs_clean',
    fn: 'paged.contentSelection',
    alsoFns: ['paged.setContentSelection', 'paged.stories'],
    feature: 'scripting.inspection',
    title: 'Read the text caret / range',
    summary: 'The text-side selection (caret or highlighted range). Here we place a range over the first word, then read it back.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The console reports a 5-character text range.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
paged.setContentSelection({ storyId: sid, start: 0, end: 5 });
const raw = paged.contentSelection();
const cs = raw === null ? null : JSON.parse(raw);
console.log(cs ? ('caret over ' + (cs.end - cs.start) + ' chars in ' + cs.storyId) : 'no text selection');`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Selection state (application state — not undoable)
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'clear-selection',
    test: 'runs_clean',
    fn: 'paged.clearSelection',
    feature: 'scripting.full-mutation-surface',
    title: 'Deselect everything',
    summary: 'Drop the element selection — e.g. to dismiss handles before exporting a clean preview.',
    seed: 'one-text-frame-selected',
    level: 'beginner',
    lookFor: 'The selection count goes from 1 to 0.',
    script: `console.log('before:', JSON.parse(paged.selection()).length, 'selected');
paged.clearSelection();
console.log('after:', JSON.parse(paged.selection()).length, 'selected');`,
  },
  {
    id: 'set-content-selection',
    test: 'runs_clean',
    fn: 'paged.setContentSelection',
    alsoFns: ['paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Place a text range from a script',
    summary: 'Drive the text caret like the Type tool — select a heading run so a follow-up style or edit lands exactly there.',
    seed: 'styled-story',
    level: 'intermediate',
    lookFor: 'The first heading word is highlighted as a text range.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
paged.setContentSelection({ storyId: sid, start: 0, end: 7 });   // the "Heading" run
const cs = JSON.parse(paged.contentSelection());
console.log('selected chars', cs.start, '..', cs.end, 'in', cs.storyId);`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Pages & masters
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'insert-page',
    test: 'insert_page',
    fn: 'paged.insertPage',
    alsoFns: ['paged.pages'],
    feature: 'scripting.structural-authoring',
    title: 'Add a page to the document',
    summary: 'Append a page after a given one (it inherits the default master). Returns the new page selfId for chaining further inserts.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The document grows from 1 to 2 pages.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const np = paged.insertPage(pid);
console.log('added page', np);
console.log('pages now:', JSON.parse(paged.pages()).length);`,
  },
  {
    id: 'delete-page',
    test: 'delete_page',
    fn: 'paged.deletePage',
    alsoFns: ['paged.insertPage', 'paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Remove a page',
    summary: 'Delete a page by id. We add a spare page first (you cannot delete a document down to zero pages), then remove it.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The page count goes 1 → 2 → 1.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const extra = paged.insertPage(pid);
console.log('pages after add:', JSON.parse(paged.pages()).length);
paged.deletePage(extra);
console.log('pages after delete:', JSON.parse(paged.pages()).length);`,
  },
  {
    id: 'resize-page',
    test: 'resize_page',
    fn: 'paged.resizePage',
    alsoFns: ['paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Change the page size to A4',
    summary: 'Set a page GeometricBounds in points. Here we switch US Letter (612×792) to A4 (595.28×841.89 pt).',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The page becomes narrower and taller (A4 proportions).',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
paged.resizePage(pid, [0, 0, 841.89, 595.28]);   // [t,l,b,r] A4 in pt
console.log('resized to', JSON.parse(paged.pages())[0].sizePt.join(' × '), 'pt');`,
  },
  {
    id: 'apply-master',
    test: 'runs_clean',
    fn: 'paged.applyMasterToPage',
    alsoFns: ['paged.pages', 'paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Apply a master to a page',
    summary: 'Masters carry shared furniture (running heads, folios). Apply the first master to a page; omit the id to detach it instead.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The page picks up the master spread (or detaches when none is defined).',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const masters = JSON.parse(paged.collection('masterPages'));
const masterId = masters.length ? masters[0].selfId : undefined;
console.log('applied master', masterId ?? '(detach)', '→', paged.applyMasterToPage(pid, masterId));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Frames — graphic frames, grouping & story threading
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'insert-graphic-frame',
    test: 'runs_clean',
    fn: 'paged.insertFrame',
    alsoFns: ['paged.pages'],
    feature: 'scripting.structural-authoring',
    title: 'Draw a graphic (picture) frame',
    summary: 'A non-text frame — the usual target for placeImage. Returns its kind:id address (and auto-selects it).',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'An empty picture frame appears, ready for an image, filled with a 20% grey here.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const frame = paged.insertFrame(pid, [120, 120, 360, 432]);   // [t,l,b,r] pt
console.log('created', frame);
if (frame) {
  paged.set(frame, 'frameFillColor', 'Color/Black');
  paged.set(frame, 'frameFillTint', 20);
}`,
  },
  {
    id: 'group-frames',
    test: 'runs_clean',
    fn: 'paged.createGroup',
    alsoFns: ['paged.tree'],
    feature: 'scripting.structural-authoring',
    title: 'Group elements together',
    summary: 'Bundle two-or-more page items so they move and transform as one unit (e.g. a logo lock-up). Needs ≥2 valid members.',
    seed: 'two-frames',
    level: 'intermediate',
    lookFor: 'The two frames become a single selectable group.',
    script: `const refs = [];
for (const sp of JSON.parse(paged.tree()))
  for (const pg of sp.children ?? [])
    for (const fr of pg.children ?? []) refs.push(fr.kind + ':' + fr.id);
console.log('grouping', refs.length, 'items →', paged.createGroup(refs));`,
  },
  {
    id: 'thread-frames',
    test: 'thread_frames',
    fn: 'paged.linkFrames',
    alsoFns: ['paged.insertTextFrame', 'paged.insertText', 'paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Thread a story across two frames',
    summary: 'When copy overflows one frame, thread it into a second so the text continues — the core of multi-frame article flow.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Overset copy in a short first frame flows on into the second frame.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const a = paged.insertTextFrame(pid, [72, 72, 150, 280]);     // short — will overflow
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'This column holds far more copy than the short first frame can show, so it oversets and must continue in a threaded second frame further down the page.');
const b = paged.insertTextFrame(pid, [170, 72, 440, 280]);    // empty continuation
console.log('threaded', a, '→', b, ':', paged.linkFrames(a, b));`,
  },
  {
    id: 'unthread-frame',
    test: 'unthread_frame',
    fn: 'paged.unlinkFrames',
    alsoFns: ['paged.linkFrames', 'paged.insertTextFrame', 'paged.insertText'],
    feature: 'scripting.full-mutation-surface',
    title: 'Break a text thread',
    summary: 'Cut the link leaving a frame so its overflow no longer pours onward — e.g. to re-route a story into a different frame.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A threaded pair is created, then the thread out of the first frame is severed.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const a = paged.insertTextFrame(pid, [72, 72, 150, 280]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'Long copy that overflows the first frame and continues into the threaded second frame until we cut the link again.');
const b = paged.insertTextFrame(pid, [170, 72, 440, 280]);
paged.linkFrames(a, b);
console.log('unthreaded', a, ':', paged.unlinkFrames(a));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Drawing & vector paths — anchors and path operations
  // Path-point ops act on an explicit Polygon (insertPath), which carries an
  // editable PathPointArray; ovals/rectangles do not.
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'draw-custom-path',
    test: 'runs_clean',
    fn: 'paged.insertPath',
    alsoFns: ['paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Draw a custom shape (a pennant)',
    summary: 'Build an arbitrary closed path from anchors — each is { anchor, left, right } (corner points repeat the anchor). Returns the new polygon address.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A solid triangular pennant appears on the page.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const pennant = [
  { anchor: [200, 120], left: [200, 120], right: [200, 120] },
  { anchor: [340, 360], left: [340, 360], right: [340, 360] },
  { anchor: [ 60, 360], left: [ 60, 360], right: [ 60, 360] },
];
const path = paged.insertPath(pid, pennant, false);   // closed
console.log('created', path);
if (path) paged.set(path, 'frameFillColor', 'Color/Black');`,
  },
  {
    id: 'path-point-insert',
    test: 'path_point_insert',
    fn: 'paged.pathPointInsert',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Add an anchor to a shape',
    summary: 'Refine a custom path by inserting an anchor into its flat PathPointArray — turning a triangle into a quad here.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A fourth corner is added to the triangle, squaring it off.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const tri = [
  { anchor: [200, 120], left: [200, 120], right: [200, 120] },
  { anchor: [340, 360], left: [340, 360], right: [340, 360] },
  { anchor: [ 60, 360], left: [ 60, 360], right: [ 60, 360] },
];
const p = paged.insertPath(pid, tri, false);
const ok = paged.pathPointInsert(p, 3, { anchor: [60, 120], left: [60, 120], right: [60, 120] });
console.log('added anchor →', ok);`,
  },
  {
    id: 'path-point-remove',
    test: 'runs_clean',
    fn: 'paged.pathPointRemove',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Remove a redundant anchor',
    summary: 'Delete an anchor from a path by its flat index — simplifying a four-point shape back toward a triangle.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'One corner of a four-point shape is removed.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const quad = [
  { anchor: [120, 120], left: [120, 120], right: [120, 120] },
  { anchor: [320, 120], left: [320, 120], right: [320, 120] },
  { anchor: [320, 320], left: [320, 320], right: [320, 320] },
  { anchor: [120, 320], left: [120, 320], right: [120, 320] },
];
const p = paged.insertPath(pid, quad, false);
console.log('removed anchor 3 →', paged.pathPointRemove(p, 3));`,
  },
  {
    id: 'path-point-curve',
    test: 'runs_clean',
    fn: 'paged.pathPointCurveType',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Smooth a corner point',
    summary: 'Flip one anchor between corner and smooth — rounding a hard vertex into a curved transition.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The first corner of the shape becomes a smooth curve.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const tri = [
  { anchor: [200, 120], left: [200, 120], right: [200, 120] },
  { anchor: [340, 360], left: [340, 360], right: [340, 360] },
  { anchor: [ 60, 360], left: [ 60, 360], right: [ 60, 360] },
];
const p = paged.insertPath(pid, tri, false);
console.log('smoothed anchor 0 →', paged.pathPointCurveType(p, 0, true));`,
  },
  {
    id: 'path-point-set',
    test: 'runs_clean',
    fn: 'paged.pathPointSet',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Nudge one anchor handle',
    summary: 'Write a single Bezier handle (role = anchor | left | right) to reshape a path precisely.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The apex of a triangle shifts to a new position.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const tri = [
  { anchor: [200, 120], left: [200, 120], right: [200, 120] },
  { anchor: [340, 360], left: [340, 360], right: [340, 360] },
  { anchor: [ 60, 360], left: [ 60, 360], right: [ 60, 360] },
];
const p = paged.insertPath(pid, tri, false);
console.log('moved apex →', paged.pathPointSet(p, 0, 'anchor', [260, 90]));`,
  },
  {
    id: 'path-open-at',
    test: 'runs_clean',
    fn: 'paged.pathOpenAt',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Cut a closed path open',
    summary: 'Open a closed contour at a chosen anchor — turning a filled silhouette into an open stroked path.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A closed shape is split open at its first corner.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const quad = [
  { anchor: [120, 120], left: [120, 120], right: [120, 120] },
  { anchor: [320, 120], left: [320, 120], right: [320, 120] },
  { anchor: [320, 320], left: [320, 320], right: [320, 320] },
  { anchor: [120, 320], left: [120, 320], right: [120, 320] },
];
const p = paged.insertPath(pid, quad, false);
console.log('opened at anchor 0 →', paged.pathOpenAt(p, 0));`,
  },
  {
    id: 'outline-stroke',
    test: 'runs_clean',
    fn: 'paged.outlineStroke',
    alsoFns: ['paged.insertLine'],
    feature: 'scripting.full-mutation-surface',
    title: 'Outline a rule into a filled shape',
    summary: 'Convert a stroked path into the filled outline of that stroke — so an 8pt rule becomes an editable band (cap/join = butt|round|square / miter|round|bevel).',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A thick diagonal rule turns into a closed filled band.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const rule = paged.insertLine(pid, [72, 96], [400, 300]);
paged.set(rule, 'frameStrokeWeight', 8);
console.log('outlined →', paged.outlineStroke(rule, 8, 'round', 'round', 4));`,
  },
  {
    id: 'offset-path',
    test: 'runs_clean',
    fn: 'paged.offsetPath',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Inset a shape (keyline)',
    summary: 'Inset (delta < 0) or outset (delta > 0) a closed contour — e.g. to build a registration keyline just inside a shape.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The shape contracts by 10pt all round.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const shape = [
  { anchor: [200, 120], left: [200, 120], right: [200, 120] },
  { anchor: [360, 380], left: [360, 380], right: [360, 380] },
  { anchor: [ 60, 380], left: [ 60, 380], right: [ 60, 380] },
];
const p = paged.insertPath(pid, shape, false);
console.log('inset 10pt →', paged.offsetPath(p, -10, 'miter', 4));`,
  },
  {
    id: 'simplify-path',
    test: 'runs_clean',
    fn: 'paged.simplifyPath',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Simplify a path',
    summary: 'Re-express a path with fewer anchors within a pt tolerance — lightening a dense traced outline.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The path is re-expressed within a 3pt tolerance.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const shape = [
  { anchor: [120, 120], left: [120, 120], right: [120, 120] },
  { anchor: [320, 120], left: [320, 120], right: [320, 120] },
  { anchor: [320, 320], left: [320, 320], right: [320, 320] },
  { anchor: [120, 320], left: [120, 320], right: [120, 320] },
];
const p = paged.insertPath(pid, shape, false);
console.log('simplified →', paged.simplifyPath(p, 3));`,
  },
  {
    id: 'pathfinder-union',
    test: 'runs_clean',
    fn: 'paged.pathfinderBoolean',
    alsoFns: ['paged.insertPath'],
    feature: 'scripting.full-mutation-surface',
    title: 'Merge shapes with Pathfinder',
    summary: 'Combine overlapping shapes into one silhouette (kind = union | intersect | subtract | exclude). The kept shape absorbs the others.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Two overlapping squares merge into a single union outline.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const sqA = [
  { anchor: [120, 120], left: [120, 120], right: [120, 120] },
  { anchor: [300, 120], left: [300, 120], right: [300, 120] },
  { anchor: [300, 300], left: [300, 300], right: [300, 300] },
  { anchor: [120, 300], left: [120, 300], right: [120, 300] },
];
const sqB = [
  { anchor: [220, 220], left: [220, 220], right: [220, 220] },
  { anchor: [400, 220], left: [400, 220], right: [400, 220] },
  { anchor: [400, 400], left: [400, 400], right: [400, 400] },
  { anchor: [220, 400], left: [220, 400], right: [220, 400] },
];
const a = paged.insertPath(pid, sqA, false);
const b = paged.insertPath(pid, sqB, false);
console.log('union →', paged.pathfinderBoolean(a, [b], 'union'));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Tables — build a price / spec table, then edit its structure
  // Each example mints its own <Table> with insertTable (returns the table id).
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'table-insert-row',
    fn: 'paged.insertTableRow',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    test: 'paged_insert_table_row_extends_a_fresh_table',
    title: 'Add a row to a spec table',
    summary: 'Insert an empty body row at an index — e.g. to add another line item to a price table.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A four-row table gains a fifth row.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });   // a 4-row price table
console.log('added line item →', paged.insertTableRow(sid, table, 1));`,
  },
  {
    id: 'table-delete-row',
    test: 'runs_clean',
    fn: 'paged.deleteTableRow',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a table row',
    summary: 'Remove a body row by index — pruning a discontinued line item.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A four-row table drops to three rows.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('removed row →', paged.deleteTableRow(sid, table, 2));`,
  },
  {
    id: 'table-insert-column',
    test: 'runs_clean',
    fn: 'paged.insertTableColumn',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Add a column to a table',
    summary: 'Insert an empty column at an index — e.g. adding a "Unit price" column beside the description.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A three-column table gains a fourth column.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('added column →', paged.insertTableColumn(sid, table, 1));`,
  },
  {
    id: 'table-delete-column',
    test: 'runs_clean',
    fn: 'paged.deleteTableColumn',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a table column',
    summary: 'Remove a column by index — dropping a column the layout no longer needs.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A three-column table drops to two columns.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('removed column →', paged.deleteTableColumn(sid, table, 2));`,
  },
  {
    id: 'table-insert-header',
    test: 'runs_clean',
    fn: 'paged.insertHeaderRow',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Add a repeating header row',
    summary: 'Promote a header band that repeats at the top of the table wherever it breaks across frames or pages.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The table gains a header band above the body rows.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('added header band →', paged.insertHeaderRow(sid, table));`,
  },
  {
    id: 'table-remove-header',
    test: 'runs_clean',
    fn: 'paged.removeHeaderRow',
    alsoFns: ['paged.insertTable', 'paged.insertHeaderRow', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Remove the header band',
    summary: 'Drop the first header row — demoting it back into the body.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The header band is removed from the table.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3, headerRows: 1 });
console.log('removed header →', paged.removeHeaderRow(sid, table));`,
  },
  {
    id: 'table-insert-footer',
    test: 'runs_clean',
    fn: 'paged.insertFooterRow',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Add a totals footer band',
    summary: 'Add a footer band that repeats at the bottom of the table — the natural home for a totals row.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The table gains a footer band below the body rows.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('added totals footer →', paged.insertFooterRow(sid, table));`,
  },
  {
    id: 'table-remove-footer',
    test: 'runs_clean',
    fn: 'paged.removeFooterRow',
    alsoFns: ['paged.insertTable', 'paged.insertFooterRow', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Remove the footer band',
    summary: 'Drop the last footer row from the table.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The footer band is removed from the table.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3, footerRows: 1 });
console.log('removed footer →', paged.removeFooterRow(sid, table));`,
  },
  {
    id: 'table-cell-span',
    test: 'runs_clean',
    fn: 'paged.setCellSpan',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Merge cells for a spanning title',
    summary: 'Set a cell row/column span — merge the top-left 2×2 block into one cell for a section title that spans columns.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The top-left four cells merge into one spanning cell.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 4 });
console.log('merged 2×2 →', paged.setCellSpan(sid, table, 0, 0, 2, 2));`,
  },
  {
    id: 'table-row-height',
    test: 'runs_clean',
    fn: 'paged.setRowHeight',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Set a fixed row height',
    summary: 'Give a row a fixed height in points — e.g. a roomy 28pt header band. Pass null to clear back to auto.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The first row becomes a fixed 28pt tall.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('header row 28pt →', paged.setRowHeight(sid, table, 0, 28));`,
  },
  {
    id: 'table-column-width',
    test: 'runs_clean',
    fn: 'paged.setColumnWidth',
    alsoFns: ['paged.insertTable', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Set a fixed column width',
    summary: 'Pin a column to a width in points — e.g. a 140pt label column. Pass null to clear back to auto.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The first column becomes a fixed 140pt wide.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 4, cols: 3 });
console.log('label column 140pt →', paged.setColumnWidth(sid, table, 0, 140));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Styles — create, rename, delete, and set properties on stylesheets
  // create* returns the new style selfId; rename/delete take that id.
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'create-character-style',
    test: 'create_character_style',
    fn: 'paged.createCharacterStyle',
    feature: 'scripting.full-mutation-surface',
    title: 'Define an Emphasis character style',
    summary: 'Create an inline (run-level) style — here an "Emphasis" style for bolding a phrase consistently. Returns its selfId.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A new Emphasis character style is added to the stylesheet.',
    script: `const id = paged.createCharacterStyle({ name: 'Emphasis' });
console.log('created character style', id);`,
  },
  {
    id: 'rename-character-style',
    test: 'style_crud_outcomes',
    fn: 'paged.renameCharacterStyle',
    alsoFns: ['paged.createCharacterStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Rename a character style',
    summary: 'Create a style, then give it a clearer display name.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The style is renamed from Emph to Emphasis.',
    script: `const id = paged.createCharacterStyle({ name: 'Emph' });
console.log('renamed →', paged.renameCharacterStyle(id, 'Emphasis'));`,
  },
  {
    id: 'delete-character-style',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteCharacterStyle',
    alsoFns: ['paged.createCharacterStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete an unused character style',
    summary: 'Clean up the stylesheet by removing a style you no longer need.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A just-created character style is removed again.',
    script: `const id = paged.createCharacterStyle({ name: 'Scratch' });
console.log('deleted →', paged.deleteCharacterStyle(id));`,
  },
  {
    id: 'create-object-style',
    test: 'style_crud_outcomes',
    fn: 'paged.createObjectStyle',
    feature: 'scripting.full-mutation-surface',
    title: 'Define a Photo Frame object style',
    summary: 'Create an object style — a reusable bundle of frame appearance (fill, stroke, effects). Returns its selfId.',
    seed: 'swatches-and-styles',
    level: 'pro',
    lookFor: 'A new Photo Frame object style is added.',
    script: `const id = paged.createObjectStyle({ name: 'Photo Frame' });
console.log('created object style', id);`,
  },
  {
    id: 'rename-object-style',
    test: 'style_crud_outcomes',
    fn: 'paged.renameObjectStyle',
    alsoFns: ['paged.createObjectStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Rename an object style',
    summary: 'Create an object style and rename it.',
    seed: 'swatches-and-styles',
    level: 'pro',
    lookFor: 'The object style is renamed.',
    script: `const id = paged.createObjectStyle({ name: 'Box' });
console.log('renamed →', paged.renameObjectStyle(id, 'Sidebar Box'));`,
  },
  {
    id: 'delete-object-style',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteObjectStyle',
    alsoFns: ['paged.createObjectStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete an object style',
    summary: 'Remove an object style from the document.',
    seed: 'swatches-and-styles',
    level: 'pro',
    lookFor: 'A just-created object style is removed.',
    script: `const id = paged.createObjectStyle({ name: 'Scratch' });
console.log('deleted →', paged.deleteObjectStyle(id));`,
  },
  {
    id: 'create-cell-style',
    test: 'style_crud_outcomes',
    fn: 'paged.createCellStyle',
    feature: 'scripting.full-mutation-surface',
    title: 'Define a Header Cell style',
    summary: 'Create a cell style — reusable cell fill, insets and edge strokes for table cells. Returns its selfId.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A new Header Cell style is added.',
    script: `const id = paged.createCellStyle({ name: 'Header Cell' });
console.log('created cell style', id);`,
  },
  {
    id: 'rename-cell-style',
    test: 'style_crud_outcomes',
    fn: 'paged.renameCellStyle',
    alsoFns: ['paged.createCellStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Rename a cell style',
    summary: 'Create a cell style and rename it.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The cell style is renamed.',
    script: `const id = paged.createCellStyle({ name: 'Cell' });
console.log('renamed →', paged.renameCellStyle(id, 'Body Cell'));`,
  },
  {
    id: 'delete-cell-style',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteCellStyle',
    alsoFns: ['paged.createCellStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a cell style',
    summary: 'Remove a cell style from the document.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A just-created cell style is removed.',
    script: `const id = paged.createCellStyle({ name: 'Scratch' });
console.log('deleted →', paged.deleteCellStyle(id));`,
  },
  {
    id: 'create-table-style',
    test: 'style_crud_outcomes',
    fn: 'paged.createTableStyle',
    feature: 'scripting.full-mutation-surface',
    title: 'Define a Price List table style',
    summary: 'Create a table style — a reusable look for an entire table (banding, borders). Returns its selfId.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A new Price List table style is added.',
    script: `const id = paged.createTableStyle({ name: 'Price List' });
console.log('created table style', id);`,
  },
  {
    id: 'rename-table-style',
    test: 'style_crud_outcomes',
    fn: 'paged.renameTableStyle',
    alsoFns: ['paged.createTableStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Rename a table style',
    summary: 'Create a table style and rename it.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The table style is renamed.',
    script: `const id = paged.createTableStyle({ name: 'Tbl' });
console.log('renamed →', paged.renameTableStyle(id, 'Spec Table'));`,
  },
  {
    id: 'delete-table-style',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteTableStyle',
    alsoFns: ['paged.createTableStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a table style',
    summary: 'Remove a table style from the document.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A just-created table style is removed.',
    script: `const id = paged.createTableStyle({ name: 'Scratch' });
console.log('deleted →', paged.deleteTableStyle(id));`,
  },
  {
    id: 'rename-paragraph-style',
    test: 'style_crud_outcomes',
    fn: 'paged.renameParagraphStyle',
    alsoFns: ['paged.createParagraphStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Rename a paragraph style',
    summary: 'Create a paragraph style and give it a production-ready name.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The Body style is renamed to Body Text.',
    script: `const id = paged.createParagraphStyle({ name: 'Body' });
console.log('renamed →', paged.renameParagraphStyle(id, 'Body Text'));`,
  },
  {
    id: 'delete-paragraph-style',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteParagraphStyle',
    alsoFns: ['paged.createParagraphStyle'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a paragraph style',
    summary: 'Remove a paragraph style from the stylesheet.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A just-created paragraph style is removed.',
    script: `const id = paged.createParagraphStyle({ name: 'Scratch' });
console.log('deleted →', paged.deleteParagraphStyle(id));`,
  },
  {
    id: 'set-style-property',
    test: 'runs_clean',
    fn: 'paged.setStyleProperty',
    alsoFns: ['paged.createParagraphStyle'],
    paths: ['characterFontSize', 'paragraphSpaceAfter'],
    feature: 'scripting.full-mutation-surface',
    title: 'Set body type to 10pt on a style',
    summary: 'Edit a style definition itself (collection = paragraph|character|object|cell|table) so every paragraph using it updates at once.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The Body style is set to 10pt with 4pt space-after.',
    script: `const id = paged.createParagraphStyle({ name: 'Body' });
paged.setStyleProperty('paragraph', id, 'characterFontSize', 10);
paged.setStyleProperty('paragraph', id, 'paragraphSpaceAfter', 4);
console.log('Body style → 10pt / 4pt after');`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Numbering lists — list resources for ordered procedures
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'create-numbering-list',
    test: 'style_crud_outcomes',
    fn: 'paged.createNumberingList',
    feature: 'scripting.full-mutation-surface',
    title: 'Define a numbered-list resource',
    summary: 'Create a <NumberingList> — the named counter a paragraph style points at for ordered procedures. Returns its id.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A new Steps numbering list is defined.',
    script: `const id = paged.createNumberingList({ name: 'Steps' });
console.log('created numbering list', id);`,
  },
  {
    id: 'edit-numbering-list',
    test: 'style_crud_outcomes',
    fn: 'paged.editNumberingList',
    alsoFns: ['paged.createNumberingList'],
    feature: 'scripting.full-mutation-surface',
    title: 'Continue numbering across stories',
    summary: 'Edit a numbering list so its counter continues across stories — keeping one sequence over a multi-frame procedure.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'The list is set to continue numbering across stories.',
    script: `const id = paged.createNumberingList({ name: 'Steps' });
console.log('continue across stories →', paged.editNumberingList(id, { continueAcrossStories: true }));`,
  },
  {
    id: 'delete-numbering-list',
    test: 'style_crud_outcomes',
    fn: 'paged.deleteNumberingList',
    alsoFns: ['paged.createNumberingList'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a numbering list',
    summary: 'Remove a numbered-list resource from the document.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A just-created numbering list is removed.',
    script: `const id = paged.createNumberingList({ name: 'Scratch' });
console.log('deleted →', paged.deleteNumberingList(id));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Sections & page numbering
  // insertSection returns a bool; discover the new id via collection('sections').
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'insert-section',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.insertSection',
    alsoFns: ['paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Start a front-matter section',
    summary: 'Anchor a <Section> at a page to restart page numbering — here lower-roman with an "i" front-matter scheme.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A section begins at page 1 with lower-roman numbering.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const ok = paged.insertSection(pid, { style: 'lowerRoman', start: 1 });
console.log('front-matter section →', ok);
console.log('sections now:', JSON.parse(paged.collection('sections')).length);`,
  },
  {
    id: 'edit-section',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.editSection',
    alsoFns: ['paged.insertSection', 'paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Set a section prefix',
    summary: 'Edit a section discovered from the sections collection — give it an "A-" chapter prefix on the folio.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The section gains an A- page-number prefix.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertSection(pid, { style: 'arabic', start: 1 });
const secId = JSON.parse(paged.collection('sections'))[0].selfId;
console.log('prefix A- →', paged.editSection(secId, { prefix: 'A-' }));`,
  },
  {
    id: 'delete-section',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.deleteSection',
    alsoFns: ['paged.insertSection', 'paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a section',
    summary: 'Remove a section so its page-numbering restart reverts to the previous scheme.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A just-created section is removed.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertSection(pid, { style: 'arabic', start: 1 });
const secId = JSON.parse(paged.collection('sections'))[0].selfId;
console.log('deleted →', paged.deleteSection(secId));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Conditional text
  // A fresh document defines no conditions, so these report false cleanly
  // (no error) — on a document with conditions they flip real visibility.
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'set-condition-visible',
    test: 'runs_clean',
    fn: 'paged.setConditionVisible',
    alsoFns: ['paged.conditions'],
    feature: 'scripting.full-mutation-surface',
    title: 'Hide a conditional-text condition',
    summary: 'Flip a condition visible/hidden — e.g. hide the Draft watermark for a final export. Acts on the first defined condition.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The first condition is hidden (or reports false when none are defined).',
    script: `const conds = JSON.parse(paged.conditions());
const target = conds.length ? conds[0].selfId : 'Condition/none';
console.log('hide', target, '→', paged.setConditionVisible(target, false));`,
  },
  {
    id: 'activate-condition-set',
    test: 'runs_clean',
    fn: 'paged.activateConditionSet',
    alsoFns: ['paged.conditionSets'],
    feature: 'scripting.full-mutation-surface',
    title: 'Activate a condition set',
    summary: 'Switch the document to one saved visibility set ("show only this set") — e.g. flip to the German-language variant.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The first condition set activates (or reports false when none exist).',
    script: `const sets = JSON.parse(paged.conditionSets());
const target = sets.length ? sets[0].selfId : 'ConditionSet/none';
console.log('activate', target, '→', paged.activateConditionSet(target));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Layers
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'layer-insert',
    test: 'layer_insert',
    fn: 'paged.layerInsert',
    alsoFns: ['paged.layers'],
    feature: 'scripting.full-mutation-surface',
    title: 'Add a named layer',
    summary: 'Append a layer at a zero-based stacking index — here an "Annotations" layer above the artwork.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'An Annotations layer is added to the stack.',
    script: `console.log('added layer →', paged.layerInsert(0, 'Annotations'));
console.log('layers:', JSON.parse(paged.layers()).map(function (l) { return l.name; }).join(', '));`,
  },
  {
    id: 'layer-move',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.layerMove',
    alsoFns: ['paged.layerInsert', 'paged.layers'],
    feature: 'scripting.full-mutation-surface',
    title: 'Reorder a layer in the stack',
    summary: 'Move a layer to a new zero-based index — sending the background to the very bottom.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'The Background layer moves to the bottom of the stack.',
    script: `paged.layerInsert(0, 'Background');
paged.layerInsert(1, 'Artwork');
const bg = JSON.parse(paged.layers()).find(function (l) { return l.name === 'Background'; });
console.log('sent to back →', paged.layerMove(bg.selfId, 0));`,
  },
  {
    id: 'layer-remove',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.layerRemove',
    alsoFns: ['paged.layerInsert', 'paged.layers'],
    feature: 'scripting.full-mutation-surface',
    title: 'Remove an empty layer',
    summary: 'Delete a layer by id — tidying up an empty scratch layer.',
    seed: 'blank',
    level: 'intermediate',
    lookFor: 'A just-added layer is removed again.',
    script: `paged.layerInsert(0, 'Scratch');
const id = JSON.parse(paged.layers()).find(function (l) { return l.name === 'Scratch'; }).selfId;
console.log('removed →', paged.layerRemove(id));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Ruler guides — read the spread for the spread id + minted guide ids
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'insert-guide',
    test: 'insert_guide',
    fn: 'paged.insertGuide',
    alsoFns: ['paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Place a column guide',
    summary: 'Add a ruler guide (orientation = vertical | horizontal) at a page-local position — here a vertical guide at 144pt (2 inches).',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A vertical guide appears two inches in from the left.',
    script: `const spread = JSON.parse(paged.collection('spreads'))[0].selfId;
console.log('column guide at 144pt →', paged.insertGuide(spread, 'vertical', 144, 0));`,
  },
  {
    id: 'move-guide',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.moveGuide',
    alsoFns: ['paged.insertGuide', 'paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Nudge a ruler guide',
    summary: 'Move a guide along its perpendicular axis. We add one, read its minted id from the spread, then slide it.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The guide slides from 144pt to 216pt.',
    script: `const spread = JSON.parse(paged.collection('spreads'))[0].selfId;
paged.insertGuide(spread, 'vertical', 144, 0);
const guides = JSON.parse(paged.collection('spreads'))[0].guides;
const g = guides[guides.length - 1].id;
console.log('moved to 216pt →', paged.moveGuide(g, 216));`,
  },
  {
    id: 'delete-guide',
    test: 'section_layer_guide_outcomes',
    fn: 'paged.deleteGuide',
    alsoFns: ['paged.insertGuide', 'paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Delete a ruler guide',
    summary: 'Remove a guide by its minted id (read from the spread guides list).',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A just-added guide is removed.',
    script: `const spread = JSON.parse(paged.collection('spreads'))[0].selfId;
paged.insertGuide(spread, 'horizontal', 200, 0);
const guides = JSON.parse(paged.collection('spreads'))[0].guides;
const g = guides[guides.length - 1].id;
console.log('deleted →', paged.deleteGuide(g));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Variable & placeholder fields
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'insert-field',
    test: 'insert_field',
    fn: 'paged.insertField',
    alsoFns: ['paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Insert an automatic page number',
    summary: 'Drop a field marker into a story (fieldKind = "pageNumber" | "nextPageNumber" | a plugin placeholder) — the live folio in a running footer.',
    seed: 'one-text-frame-selected',
    level: 'pro',
    lookFor: 'A page-number marker is inserted at the start of the story.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
console.log('page-number field →', paged.insertField(sid, 0, 'pageNumber'));`,
  },
  {
    id: 'set-field-value',
    test: 'runs_clean',
    fn: 'paged.setFieldValue',
    alsoFns: ['paged.insertField', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Resolve a data-merge placeholder',
    summary: 'Insert a plugin placeholder field, then set its cached display value — the heart of a data-merge (e.g. a price).',
    seed: 'one-text-frame-selected',
    level: 'pro',
    lookFor: 'A SKU placeholder is inserted then resolved to a value.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertField(sid, 0, { placeholder: { plugin: 'merge', key: 'price' } });
console.log('resolved price →', paged.setFieldValue(sid, 0, '$49.00'));`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Text: range delete & redo
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'delete-range',
    test: 'delete_range',
    fn: 'paged.deleteRange',
    alsoFns: ['paged.stories'],
    feature: 'scripting.text-authoring',
    title: 'Delete a run of text',
    summary: 'Remove a [start, end) character range from a story — here the heading word, by character offset.',
    seed: 'styled-story',
    level: 'intermediate',
    lookFor: 'The first word (the heading) is deleted from the story.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const before = JSON.parse(paged.stories())[0].characterCount;
paged.deleteRange(sid, 0, 7);   // remove "Heading"
console.log('chars', before, '→', JSON.parse(paged.stories())[0].characterCount);`,
  },
  {
    id: 'redo-write',
    test: 'runs_clean',
    fn: 'paged.redo',
    alsoFns: ['paged.undo', 'paged.set'],
    feature: 'scripting.undo-redo',
    title: 'Redo an undone change',
    summary: 'Every write lands on the same Operation channel as the UI, so redo re-applies exactly what undo reverted.',
    seed: 'one-text-frame-selected',
    level: 'intermediate',
    lookFor: 'The frame turns red, undo reverts it, redo re-applies the red fill.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameFillColor', 'Color/Red');
paged.undo();
console.log('redo →', paged.redo());   // red again`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Document & colour configuration
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'set-document-defaults',
    test: 'runs_clean',
    fn: 'paged.setDocumentDefaults',
    feature: 'scripting.full-mutation-surface',
    title: 'Set new-object defaults',
    summary: 'Define the fill/stroke/weight new frames inherit — here no fill, a 1pt black stroke, so drawn boxes start as keylines.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'New objects default to a 1pt black stroke with no fill.',
    script: `console.log('defaults set →', paged.setDocumentDefaults({ stroke: 'Color/Black', weight: 1 }));`,
  },
  {
    id: 'set-color-settings',
    test: 'runs_clean',
    fn: 'paged.setColorSettings',
    feature: 'scripting.full-mutation-surface',
    title: 'Configure colour management',
    summary: 'Replace the document colour-management policy — preserve embedded profiles, relative-colorimetric intent, black-point compensation on.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The document colour-management settings are updated.',
    script: `console.log('colour settings →', paged.setColorSettings({
  rgbPolicy: 'PreserveEmbeddedProfiles',
  intent: 'relativeColorimetric',
  bpc: true,
}));`,
  },
  {
    id: 'set-proof-setup',
    test: 'runs_clean',
    fn: 'paged.setProofSetup',
    feature: 'scripting.full-mutation-surface',
    title: 'Soft-proof for CMYK press',
    summary: 'Configure on-screen soft-proofing — simulate a SWOP CMYK press with paper-white simulation. Pass profileName null to turn proofing off.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Soft-proofing is configured for a SWOP CMYK press.',
    script: `console.log('proof setup →', paged.setProofSetup({
  profileName: 'US Web Coated (SWOP) v2',
  simulatePaperWhite: true,
}));`,
  },
  {
    id: 'set-ink-setting',
    test: 'runs_clean',
    fn: 'paged.setInkSetting',
    alsoFns: ['paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Convert a spot ink to process',
    summary: 'Adjust an ink output setting (Ink Manager) — convert a spot to process at output. This blank document defines no spot inks, so it reports false cleanly.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'The first spot ink converts to process (or reports false when none exist).',
    script: `const inks = JSON.parse(paged.collection('inks'));
// headless: a blank document has no spot inks, so this returns false (no error).
const spot = inks.length ? inks[0].spotId : 'Color/None';
console.log('convert to process →', paged.setInkSetting(spot, { convertToProcess: true }));`,
  },
  {
    id: 'set-lab-for-spots',
    test: 'runs_clean',
    fn: 'paged.setUseStandardLabForSpots',
    feature: 'scripting.full-mutation-surface',
    title: 'Prefer Lab for spot previews',
    summary: 'Preview spot colours from their Lab primary rather than the CMYK alternate — closer to the swatch-book appearance.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Spot-colour previews switch to their Lab values.',
    script: `console.log('use Lab for spots →', paged.setUseStandardLabForSpots(true));`,
  },
  {
    id: 'import-swatch-library',
    test: 'runs_clean',
    fn: 'paged.importSwatchLibrary',
    feature: 'scripting.full-mutation-surface',
    title: 'Import an .ase swatch library',
    summary: 'Import an Adobe Swatch Exchange (.ase) library as one undoable step. Pass the file as a number[] of bytes.',
    seed: 'swatches-and-styles',
    level: 'pro',
    lookFor: 'With real .ase bytes the palette grows; headless (no bytes) it reports false.',
    script: `// headless: pass a real .ase file as number[] of bytes; the empty array below
// returns false cleanly (no error) because there is nothing to parse.
const aseBytes = [];
console.log('imported swatches →', paged.importSwatchLibrary(aseBytes, 'Brand'));`,
  },
  {
    id: 'set-plugin-metadata',
    test: 'runs_clean',
    fn: 'paged.setPluginMetadata',
    feature: 'scripting.full-mutation-surface',
    title: 'Tag a frame with plugin metadata',
    summary: 'Write a key/value pair into a frame Label, in the reserved x-paged:<plugin> namespace, with a { v, data } envelope — e.g. a review status.',
    seed: 'image-frame',
    level: 'pro',
    lookFor: 'The selected frame carries an x-paged:review label.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
const envelope = JSON.stringify({ v: 1, data: { state: 'approved', reviewer: 'A. Editor' } });
console.log('tagged →', paged.setPluginMetadata(ref, 'x-paged:review', envelope, 'review'));`,
  },
  {
    id: 'replace-image-bytes',
    test: 'runs_clean',
    fn: 'paged.replaceImageBytes',
    feature: 'scripting.full-mutation-surface',
    title: 'Clear a frame inline image',
    summary: 'Commit inline image bytes on a graphic frame (a number[] of u8), or pass null to clear them. Here we clear the selected frame.',
    seed: 'image-frame',
    level: 'pro',
    lookFor: 'The frame inline image bytes are cleared (pass real PNG bytes to set them).',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
// pass a number[] of PNG/JPEG bytes to SET the image; null clears it.
console.log('cleared inline bytes →', paged.replaceImageBytes(ref, null));`,
  },
  {
    id: 'batch-mutations',
    test: 'runs_clean',
    fn: 'paged.batch',
    alsoFns: ['paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Two-column layout in one undo step',
    summary: 'Apply an array of { op, args } mutations as ONE undoable step — here two text frames for a two-column page, created atomically.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Two side-by-side text columns appear, undoable as a single step.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const ok = paged.batch([
  { op: 'insertTextFrame', args: { pageId: pid, bounds: [72, 72, 720, 290] } },
  { op: 'insertTextFrame', args: { pageId: pid, bounds: [72, 306, 720, 540] } },
]);
console.log('two-column layout →', ok);`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Workflows — composite recipes that chain several host fns into one
  // real desktop-publishing task. (No backing core test yet — see report.)
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'workflow-two-column-article',
    test: 'workflow_two_column_article',
    fn: 'paged.insertTextFrame',
    alsoFns: ['paged.insertText', 'paged.createParagraphStyle', 'paged.applyStyle', 'paged.set', 'paged.pages'],
    paths: ['textFrameColumnCount', 'textFrameColumnGutter'],
    feature: 'scripting.text-authoring',
    title: 'Lay out a two-column article',
    summary: 'Create a text frame, pour a heading + body, split it into two columns with a gutter, and style the heading — a complete article block.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A two-column article with a distinct heading on the first line.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const frame = paged.insertTextFrame(pid, [72, 72, 720, 540]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'Headline goes here\\nBody copy flows beneath the headline and fills both columns with continuous text set at a comfortable reading size.');
// Two columns with a 14pt gutter.
paged.set(frame, 'textFrameColumnCount', 2);
paged.set(frame, 'textFrameColumnGutter', 14);
// A heading style on the first line.
const heading = paged.createParagraphStyle({ name: 'Article Heading' });
paged.applyStyle(sid, 0, 17, heading);
console.log('two-column article laid out in', frame);`,
  },
  {
    id: 'workflow-price-table',
    test: 'workflow_price_table',
    fn: 'paged.insertTable',
    alsoFns: ['paged.insertHeaderRow', 'paged.setColumnWidth', 'paged.setRowHeight', 'paged.stories'],
    feature: 'scripting.full-mutation-surface',
    title: 'Build a 3-column price table',
    summary: 'Mint a table, promote a repeating header band, pin the label column wide and the header row tall — a ready price list.',
    seed: 'styled-story',
    level: 'pro',
    lookFor: 'A 3-column table with a tall repeating header and a wide first column.',
    script: `const sid = JSON.parse(paged.stories())[0].selfId;
const table = paged.insertTable(sid, { rows: 5, cols: 3 });   // Item · Qty · Price
paged.insertHeaderRow(sid, table);
paged.setRowHeight(sid, table, 0, 26);     // tall header band
paged.setColumnWidth(sid, table, 0, 220);  // wide Item column
paged.setColumnWidth(sid, table, 1, 80);   // narrow Qty
console.log('price table', table, 'ready');`,
  },
  {
    id: 'workflow-image-with-caption',
    test: 'workflow_image_with_caption',
    fn: 'paged.placeImage',
    alsoFns: ['paged.insertFrame', 'paged.insertTextFrame', 'paged.insertText', 'paged.set', 'paged.pages'],
    paths: ['characterFontSize'],
    feature: 'scripting.structural-authoring',
    title: 'Place an image with a caption',
    summary: 'Draw a picture frame, place an image fitted proportionally, then add a small caption frame directly beneath it.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A fitted image above a small italic-sized caption line.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const figure = paged.insertFrame(pid, [96, 96, 360, 432]);
paged.placeImage(figure, 'https://docs.paged.media/preview/sample.png', 'fillProportional');
// Caption frame beneath the image.
const caption = paged.insertTextFrame(pid, [366, 96, 392, 432]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'Figure 1. A placed image fitted into its frame.');
const range = 'storyRange:' + sid + '@0..48';
paged.set(range, 'characterFontSize', 8);
console.log('captioned figure', figure, '+', caption);`,
  },
  {
    id: 'workflow-thread-overset',
    test: 'workflow_thread_overset',
    fn: 'paged.linkFrames',
    alsoFns: ['paged.insertTextFrame', 'paged.insertText', 'paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Thread overset copy onto a second page',
    summary: 'Pour a long story into a short frame, add a fresh page, and thread the overflow into a frame there — continuing the flow.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A story overflows page 1 and continues in a frame on page 2.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const a = paged.insertTextFrame(pid, [72, 72, 200, 300]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'A feature article whose copy runs well past the bottom of this first short frame, so the overset must continue onto the next page to be read in full.');
const p2 = paged.insertPage(pid);
const b = paged.insertTextFrame(p2, [72, 72, 720, 300]);
console.log('continued onto page 2 →', paged.linkFrames(a, b));`,
  },
  {
    id: 'workflow-pull-quote',
    test: 'workflow_pull_quote',
    fn: 'paged.set',
    alsoFns: ['paged.selection'],
    paths: ['frameFillColor', 'frameFillTint', 'frameStrokeColor', 'frameStrokeWeight', 'frameInsetSpacing', 'characterFontSize'],
    feature: 'scripting.property-readwrite',
    title: 'Style a pull-quote with a hairline rule',
    summary: 'Turn the selected frame into a pull-quote: a 10% grey panel, a 2pt rule, generous inset, and enlarged 18pt type.',
    seed: 'one-text-frame-selected',
    level: 'pro',
    lookFor: 'A tinted pull-quote panel with a 2pt rule and larger type.',
    script: `const [el] = JSON.parse(paged.selection());
const ref = el.kind + ':' + el.id;
paged.set(ref, 'frameFillColor', 'Color/Black');
paged.set(ref, 'frameFillTint', 10);              // 10% grey panel
paged.set(ref, 'frameStrokeColor', 'Color/Black');
paged.set(ref, 'frameStrokeWeight', 2);           // 2pt rule
paged.set(ref, 'frameInsetSpacing', [12, 12, 12, 12]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.set('storyRange:' + sid + '@0..40', 'characterFontSize', 18);
console.log('pull-quote styled on', ref);`,
  },
  {
    id: 'workflow-section-numbering',
    test: 'workflow_section_numbering',
    fn: 'paged.insertSection',
    alsoFns: ['paged.insertPage', 'paged.editSection', 'paged.collection', 'paged.pages'],
    feature: 'scripting.full-mutation-surface',
    title: 'Front-matter then body page numbering',
    summary: 'Start the document in lower-roman front matter, add a page, then begin an arabic body section restarting at 1 — classic book folios.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Page 1 numbers as roman front matter; a later section restarts arabic at 1.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
paged.insertSection(pid, { style: 'lowerRoman', start: 1 });   // front matter: i, ii…
const body = paged.insertPage(pid);
paged.insertSection(body, { style: 'arabic', start: 1 });      // body restarts at 1
console.log('sections:', JSON.parse(paged.collection('sections')).length);`,
  },
  {
    id: 'workflow-running-footer',
    test: 'workflow_running_footer',
    fn: 'paged.insertField',
    alsoFns: ['paged.insertTextFrame', 'paged.insertText', 'paged.set', 'paged.pages'],
    paths: ['characterFontSize'],
    feature: 'scripting.full-mutation-surface',
    title: 'Build a running footer with a folio',
    summary: 'Add a footer text frame, type a running head, and drop a live page-number field after it — the page folio.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'A small footer line reading the running head followed by a live page number.',
    script: `const pid = JSON.parse(paged.pages())[0].selfId;
const footer = paged.insertTextFrame(pid, [740, 72, 760, 540]);
const sid = JSON.parse(paged.stories())[0].selfId;
paged.insertText(sid, 0, 'PAGED MEDIA QUARTERLY   ');
paged.insertField(sid, JSON.parse(paged.stories())[0].characterCount, 'pageNumber');
paged.set('storyRange:' + sid + '@0..24', 'characterFontSize', 8);
console.log('running footer placed in', footer);`,
  },
  {
    id: 'workflow-column-guides',
    test: 'workflow_column_guides',
    fn: 'paged.insertGuide',
    alsoFns: ['paged.collection'],
    feature: 'scripting.full-mutation-surface',
    title: 'Set up a column grid with guides',
    summary: 'Drop evenly-spaced vertical guides across the page to scaffold a multi-column grid before placing frames.',
    seed: 'blank',
    level: 'pro',
    lookFor: 'Three vertical guides divide the page into a column grid.',
    script: `const spread = JSON.parse(paged.collection('spreads'))[0].selfId;
let placed = 0;
for (const x of [153, 306, 459]) {          // quarter / half / three-quarter
  if (paged.insertGuide(spread, 'vertical', x, 0)) placed++;
}
console.log('placed', placed, 'column guides');`,
  },
];

/** Index by primary fn → its examples (first is the default showcase). */
export function examplesForFn(fn: string): ScriptingExample[] {
  return SCRIPTING_EXAMPLES.filter((e) => e.fn === fn);
}

/** Look up one example by id. */
export function exampleById(id: string): ScriptingExample | undefined {
  return SCRIPTING_EXAMPLES.find((e) => e.id === id);
}
