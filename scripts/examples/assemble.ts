import { zipSync, type Zippable } from 'fflate';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Assemble an unzipped example package directory into a valid `.idml` (UCF zip),
 * reproducing the byte rules in core/crates/paged-gen/src/package.rs:
 *
 *   - `mimetype` is the FIRST entry and STORED (uncompressed), with no trailing
 *     newline (the file on disk already has none).
 *   - every other part is deflated.
 *   - canonical entry order; fixed 1980-01-01 timestamps for byte-stable output.
 *   - forward-slash paths only; no directory entries.
 *
 * The SAME function feeds the CI validator (assemble → paged-inspect) and, later,
 * the live preview (assemble → WebGPU render), so the validated package and the
 * previewed package are byte-identical.
 */
const EPOCH = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));

// Canonical UCF order. `mimetype` and `designmap.xml` are exact; the rest match
// by directory prefix. Anything unlisted sorts last (stable, alphabetical).
const PREFIX_ORDER = ['META-INF/', 'Resources/', 'XML/', 'MasterSpreads/', 'Spreads/', 'Stories/'];

function walk(dir: string, base: string = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

function orderKey(path: string): number {
  if (path === 'mimetype') return 0;
  if (path === 'designmap.xml') return 1;
  const i = PREFIX_ORDER.findIndex((p) => path.startsWith(p));
  return i === -1 ? PREFIX_ORDER.length + 2 : i + 2;
}

export function assembleIdml(packageDir: string): Uint8Array {
  const files = walk(packageDir).sort((a, b) => {
    const ka = orderKey(a);
    const kb = orderKey(b);
    return ka !== kb ? ka - kb : a.localeCompare(b);
  });

  const zip: Zippable = {};
  for (const rel of files) {
    const data = new Uint8Array(readFileSync(join(packageDir, rel)));
    // level 0 => stored (mimetype must not be compressed); 6 => deflate.
    zip[rel] = [data, { level: rel === 'mimetype' ? 0 : 6, mtime: EPOCH }];
  }
  return zipSync(zip, { mtime: EPOCH });
}
