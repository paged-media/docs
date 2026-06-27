// One-shot codemod: set the `test` field on every scripting example to the
// engine test that backs it (crates/paged-script/tests/*). Named 1:1 tests use
// the example id with dashes→underscores; the grouped table-driven tests
// (runs_clean / style_crud_outcomes / section_layer_guide_outcomes) share one
// fn. The 6 examples already carrying a `test` (backed by script_basics) are
// left untouched. Idempotent — re-running changes nothing.
//
//   node scripts/scripting/wire-test-field.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'data', 'scripting', 'examples.ts');

const RUNS_CLEAN = new Set([
  'inspect-element', 'get-one-property', 'tree-walk', 'pages-list', 'apply-paragraph-style',
  'place-image', 'insert-oval', 'insert-line', 'move-frame', 'resize-frame', 'group-and-dissolve',
  'list-swatches', 'list-gradients', 'list-color-groups', 'list-layers', 'list-paragraph-styles',
  'list-character-styles', 'list-object-styles', 'audit-links', 'list-conditions', 'list-condition-sets',
  'read-collection', 'read-document-meta', 'read-stories', 'read-selection', 'read-content-selection',
  'clear-selection', 'set-content-selection', 'apply-master', 'insert-graphic-frame', 'group-frames',
  'draw-custom-path', 'path-point-remove', 'path-point-curve', 'path-point-set', 'path-open-at',
  'outline-stroke', 'offset-path', 'simplify-path', 'pathfinder-union', 'table-delete-row',
  'table-insert-column', 'table-delete-column', 'table-insert-header', 'table-remove-header',
  'table-insert-footer', 'table-remove-footer', 'table-cell-span', 'table-row-height', 'table-column-width',
  'set-style-property', 'set-condition-visible', 'activate-condition-set', 'set-field-value', 'redo-write',
  'set-document-defaults', 'set-color-settings', 'set-proof-setup', 'set-ink-setting', 'set-lab-for-spots',
  'import-swatch-library', 'set-plugin-metadata', 'replace-image-bytes', 'batch-mutations',
]);
const STYLE_CRUD = new Set([
  'rename-character-style', 'delete-character-style', 'create-object-style', 'rename-object-style',
  'delete-object-style', 'create-cell-style', 'rename-cell-style', 'delete-cell-style', 'create-table-style',
  'rename-table-style', 'delete-table-style', 'rename-paragraph-style', 'delete-paragraph-style',
  'create-numbering-list', 'edit-numbering-list', 'delete-numbering-list',
]);
const SECTION_LAYER_GUIDE = new Set([
  'insert-section', 'edit-section', 'delete-section', 'layer-move', 'layer-remove', 'move-guide', 'delete-guide',
]);

function testFor(id) {
  if (RUNS_CLEAN.has(id)) return 'runs_clean';
  if (STYLE_CRUD.has(id)) return 'style_crud_outcomes';
  if (SECTION_LAYER_GUIDE.has(id)) return 'section_layer_guide_outcomes';
  return id.replaceAll('-', '_'); // a named 1:1 test
}

const lines = readFileSync(FILE, 'utf8').split('\n');
const out = [];
let changed = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  out.push(line);
  const m = line.match(/^(\s*)id: '([a-z0-9-]+)',\s*$/);
  if (!m) continue;
  const [, indent, id] = m;
  // Does this object already declare a `test`? Scan to the object close `},`.
  let hasTest = false;
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\s{2}\},\s*$/.test(lines[j])) break; // end of this example object
    if (/^\s*test: /.test(lines[j])) { hasTest = true; break; }
  }
  if (!hasTest) {
    out.push(`${indent}test: '${testFor(id)}',`);
    changed++;
  }
}

writeFileSync(FILE, out.join('\n'));
console.log(`wire-test-field: set test on ${changed} examples.`);
