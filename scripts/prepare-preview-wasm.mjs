#!/usr/bin/env node
// prepare-preview-wasm.mjs — stage the WebGPU live-preview wasm from the
// PUBLISHED npm package into public/preview, where the static export serves it.
//
// Decision-B path: the preview no longer builds paged-sdk from a core checkout
// (the retired scripts/build-preview-wasm.sh). It consumes the wasm bundled with
// `@paged-media/idml-viewer` — the published viewer at the release pinned in
// package.json (0.35.0 → core v0.35.0). That package ships `wasm/paged_sdk.js`
// (the wasm-bindgen `--target web` glue) + `wasm/paged_sdk_bg.wasm`, already
// wasm-opt'd by core's publish workflow.
//
// We copy both into public/preview so they are served as plain static assets,
// loaded lazily by the LivePreview client component (NOT bundled into any page
// JS — the 7 MB wasm only travels on interaction/viewport). The component loads
// the glue from /preview/paged_sdk.js and passes an explicit wasmUrl of
// /preview/paged_sdk_bg.wasm, so resolution doesn't depend on import.meta.url
// surviving the static export's asset hashing.
//
// Runs on `pnpm prepare:preview` (and before `pnpm build` via the build script).
// Idempotent; safe to re-run.

import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const DOCS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(DOCS_ROOT, 'public', 'preview');

// Resolve the installed package's wasm dir via its main entry (works under
// pnpm's symlinked store, no hard-coded node_modules path). The package's
// `exports` map doesn't expose package.json, so resolve the entry (dist/index.js)
// and walk up out of dist/ to the package root.
const entry = require.resolve('@paged-media/idml-viewer'); // .../dist/index.js
const WASM_DIR = join(dirname(entry), '..', 'wasm');

const FILES = ['paged_sdk.js', 'paged_sdk_bg.wasm', 'paged_sdk.d.ts'];

mkdirSync(OUT_DIR, { recursive: true });
for (const f of FILES) {
  copyFileSync(join(WASM_DIR, f), join(OUT_DIR, f));
  console.log(`prepare-preview-wasm: ${f} → public/preview/`);
}

// Same toolchain guard as before — assert the externref table is growable so we
// never ship a preview that dies at runtime with "Table.grow failed". The
// published wasm should always pass; this is cheap insurance.
execFileSync(
  process.execPath,
  [join(DOCS_ROOT, 'scripts', 'verify-preview-wasm.mjs'), join(OUT_DIR, 'paged_sdk_bg.wasm')],
  { stdio: 'inherit' },
);
