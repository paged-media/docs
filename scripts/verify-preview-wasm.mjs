#!/usr/bin/env node
// verify-preview-wasm.mjs — guard the live-preview wasm against a known
// toolchain footgun.
//
// wasm-bindgen emits TWO tables: a fixed-size funcref table (the indirect call
// table) and a GROWABLE externref table that its JS glue grows at init via
// `wasm.__wbindgen_externrefs.grow(4)`. Some binaryen versions (notably the
// v116 shipped by Ubuntu's apt) miscompile this: after `wasm-opt` the exported
// `__wbindgen_externrefs` ends up bound to the *funcref* table (which has
// max == min and cannot grow), so the preview dies at runtime with
// "WebAssembly.Table.grow(): failed to grow table by 4".
//
// Both binaries look structurally identical except for which table index the
// export resolves to — so this check reads the export and asserts the table it
// points at is growable (no maximum). Run after wasm-opt; non-zero exit fails
// the build (and the Pages deploy) instead of shipping a dead preview.

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: verify-preview-wasm.mjs <paged_sdk_bg.wasm>');
  process.exit(2);
}

const b = readFileSync(path);
let p = 8; // skip magic (\0asm) + version
function leb() {
  let r = 0, s = 0, byte;
  do { byte = b[p++]; r |= (byte & 0x7f) << s; s += 7; } while (byte & 0x80);
  return r >>> 0;
}

let importedTableCount = 0;
const definedTables = []; // { elemType, growable, min, max }
const tableExports = []; // { name, index }

while (p < b.length) {
  const id = b[p++];
  const size = leb();
  const end = p + size;
  if (id === 2) { // imports — imported tables occupy the low indices
    const n = leb();
    for (let i = 0; i < n; i++) {
      const ml = leb(); p += ml;
      const fl = leb(); p += fl;
      const kind = b[p++];
      if (kind === 0x00) leb();                       // func: typeidx
      else if (kind === 0x01) { p++; const fb = leb(); leb(); if (fb & 1) leb(); importedTableCount++; }
      else if (kind === 0x02) { const fb = leb(); leb(); if (fb & 1) leb(); }
      else if (kind === 0x03) { p++; p++; }           // global
    }
  } else if (id === 4) { // table section
    const n = leb();
    for (let i = 0; i < n; i++) {
      const elemType = b[p++];
      const fb = b[p++];
      const min = leb();
      let max = null;
      if (fb & 1) max = leb();
      definedTables.push({ elemType, growable: (fb & 1) === 0, min, max });
    }
  } else if (id === 7) { // export section
    const n = leb();
    for (let i = 0; i < n; i++) {
      const nl = leb();
      const name = b.slice(p, p + nl).toString('utf8'); p += nl;
      const kind = b[p++];
      const idx = leb();
      if (kind === 1) tableExports.push({ name, index: idx });
    }
  }
  p = end;
}

const exp = tableExports.find((e) => e.name === '__wbindgen_externrefs');
if (!exp) {
  // No externref table export — either an older glue or no reference types.
  // Nothing to assert; treat as OK so the check never blocks unrelated builds.
  console.log('verify-preview-wasm: no __wbindgen_externrefs export; skipping.');
  process.exit(0);
}

const localIdx = exp.index - importedTableCount;
const table = definedTables[localIdx];
if (!table) {
  console.error(`verify-preview-wasm: __wbindgen_externrefs exports table #${exp.index}, which is out of range.`);
  process.exit(1);
}

if (!table.growable) {
  console.error(
    `verify-preview-wasm: BROKEN wasm — __wbindgen_externrefs is bound to table #${exp.index} ` +
    `(min=${table.min}, max=${table.max}), which is NOT growable. The live preview will fail at ` +
    `runtime with "WebAssembly.Table.grow(): failed to grow table by 4". This is the binaryen ` +
    `reference-types miscompile; pin a known-good binaryen (>= v119).`,
  );
  process.exit(1);
}

console.log(
  `verify-preview-wasm: OK — __wbindgen_externrefs -> table #${exp.index} ` +
  `(externref, min=${table.min}, growable). Live preview can initialize.`,
);
