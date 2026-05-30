import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared normalizer for the clean-room similarity check (briefing §6.1). The
 * SAME normalizer must run on both sides — the offline baseline extraction and
 * this in-repo candidate check — or the comparison is meaningless. The baseline
 * records which normalizer version produced it.
 */
export const NORMALIZER_VERSION = 1;
export const SHINGLE_N = 5;

let vocab: Set<string> | undefined;
function loadVocab(): Set<string> {
  if (!vocab) {
    const txt = readFileSync(join(process.cwd(), 'cleanroom', 'vocabulary.txt'), 'utf8');
    vocab = new Set(
      txt
        .split('\n')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && !s.startsWith('#')),
    );
  }
  return vocab;
}

/** Reduce MDX to masked connective prose: drop frontmatter, code, tags, and the
 *  shared IDML vocabulary; keep only the explanatory words. */
export function normalize(input: string): string {
  let s = input;
  s = s.replace(/^---\n[\s\S]*?\n---\n/, ' '); // frontmatter
  s = s.replace(/```[\s\S]*?```/g, ' '); // fenced code
  s = s.replace(/`[^`]*`/g, ' '); // inline code
  s = s.replace(/<[^>]+>/g, ' '); // JSX / XML tags (incl. ExampleEmbed)
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // links → text
  s = s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const v = loadVocab();
  return s
    .split(/\s+/)
    .filter((w) => w && !v.has(w))
    .join(' ');
}

/** Non-invertible fingerprint: SHA-1 (truncated) of each n-gram of masked prose.
 *  The baseline stores these hashes — never the spec text itself. */
export function fingerprint(text: string): Set<string> {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + SHINGLE_N <= words.length; i++) {
    const gram = words.slice(i, i + SHINGLE_N).join(' ');
    out.add(createHash('sha1').update(gram).digest('hex').slice(0, 16));
  }
  return out;
}
