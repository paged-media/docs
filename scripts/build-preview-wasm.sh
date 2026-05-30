#!/usr/bin/env bash
# build-preview-wasm.sh — build the WebGPU paged-sdk (ViewerSession) wasm that
# powers the docs <live preview>, from a sibling `core` checkout.
#
# Interim build-from-core bridge (Decision B not yet done; mirrors the editor's
# apps/canvas/build-wasm.sh and ~/paged/sync-wasm.sh). Once @paged-media/sdk is
# published to npm, the preview should consume the published package instead and
# this script can be retired.
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
  echo "wasm-opt -Oz …"
  wasm-opt -Oz "$OUT_DIR/paged_sdk_bg.wasm" -o "$OUT_DIR/paged_sdk_bg.wasm"
else
  echo "warning: wasm-opt not found; shipping unoptimized wasm" >&2
fi

echo "done:"
ls -lh "$OUT_DIR"
