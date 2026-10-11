import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * The identity of an example's package: sha256 over the sorted list of
 * `<path>\0<sha256 of its bytes>\n`, one line per part. It hashes the PARTS,
 * not the assembled zip, so a change to the assembler does not invalidate
 * every verification while any edit to any part does.
 */
export function partsHash(packageDir: string): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name !== '.DS_Store') files.push(p);
    }
  };
  walk(packageDir);
  const lines = files
    .map((p) => relative(packageDir, p).split(sep).join('/'))
    .sort()
    .map((rel) => `${rel}\0${createHash('sha256').update(readFileSync(join(packageDir, rel))).digest('hex')}\n`);
  return `sha256:${createHash('sha256').update(lines.join('')).digest('hex')}`;
}
