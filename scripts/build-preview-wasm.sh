#!/usr/bin/env bash
# build-preview-wasm.sh — build the WebGPU paged-sdk (ViewerSession) wasm that
# powers the docs <live preview>, from a sibling `core` checkout.
#
# SUPERSEDED for the normal path: the live preview now consumes the PUBLISHED
# `@paged-media/idml-viewer` package, whose bundled wasm `scripts/prepare-preview-wasm.mjs`
# stages into public/preview (run by `pnpm build`). CI (pages.yml) uses that path —
# no core checkout. This script is kept only as a build-from-core ESCAPE HATCH for
# iterating on UNPUBLISHED engine changes before a release: run it to overwrite
# public/preview with a locally-built paged-sdk (mirrors ~/paged/sync-wasm.sh).
#
# Output (docs/public/preview/ — served statically, loaded on demand by the
# LivePreview client component):
#   paged_sdk.js        ES-module loader (`--target web`)
#   paged_sdk_bg.wasm   binary (gitignored)
#   paged_sdk.d.ts      type definitions (tracked, for reference)
#
# NOTE: the WebGPU ViewerSession currently lives on the core branch
# `paged-sdk-webgpu-session`. Build from whatever the core checkout has checked
# out; bump docs/core.pin once that branch merges to main.
set -euo pipefail

DOCS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_DIR="${CORE_DIR:-$DOCS_ROOT/../core}"
OUT_DIR="$DOCS_ROOT/public/preview"
TARGET_DIR="$CORE_DIR/target/wasm32-unknown-unknown/release"

if [ ! -d "$CORE_DIR" ]; then
  echo "error: core checkout not found at $CORE_DIR (set CORE_DIR=...)" >&2
  exit 1
fi
if ! command -v wasm-bindgen >/dev/null; then
  WB_VER=$(awk '/^name = "wasm-bindgen"$/{getline; gsub(/version = "|"/,""); print; exit}' "$CORE_DIR/Cargo.lock")
  echo "error: wasm-bindgen-cli not on PATH (install: cargo install wasm-bindgen-cli --version $WB_VER)" >&2
  exit 1
fi

echo "building paged-sdk (wasm32, --features gpu) from $CORE_DIR …"
( cd "$CORE_DIR" && cargo build --release --target wasm32-unknown-unknown -p paged-sdk --features gpu )

mkdir -p "$OUT_DIR"
echo "wasm-bindgen → $OUT_DIR"
wasm-bindgen "$TARGET_DIR/paged_sdk.wasm" --target web --out-dir "$OUT_DIR" --out-name paged_sdk

if command -v wasm-opt >/dev/null; then
  echo "wasm-opt -Oz ($(wasm-opt --version)) …"
  # Keep reference-types/bulk-memory ON: wasm-bindgen's externref table relies on
  # them, and an opt pass that drops the feature can rebind the exported
  # __wbindgen_externrefs table to the fixed-size funcref table (see the guard
  # below). Harmless on a correct binaryen; defensive on a marginal one.
  wasm-opt -Oz --enable-reference-types --enable-bulk-memory \
    "$OUT_DIR/paged_sdk_bg.wasm" -o "$OUT_DIR/paged_sdk_bg.wasm"
else
  echo "warning: wasm-opt not found; shipping unoptimized wasm" >&2
fi

# Guard: some binaryen versions (e.g. Ubuntu apt's v116) miscompile the
# reference-types tables so the live preview dies at runtime with
# "WebAssembly.Table.grow(): failed to grow table by 4". Fail the build here
# rather than deploy a dead preview. Runs locally and in CI.
echo "verifying preview wasm …"
node "$DOCS_ROOT/scripts/verify-preview-wasm.mjs" "$OUT_DIR/paged_sdk_bg.wasm"

echo "done:"
ls -lh "$OUT_DIR"
