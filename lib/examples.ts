import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build-time access to the shared `examples/` directory (briefing §6.2). Each
 * example is a minimal, complete IDML package stored as unzipped human-readable
 * XML parts; the chapter-relevant `editable` part is imported into MDX as text
 * for the static raw/annotated/tree views. The SAME files are validated against
 * the renderer in CI — a broken example breaks the build.
 *
 * Server-only (reads from disk). The example components are async server
 * components, so this never reaches the client bundle.
 */
const ROOT = join(process.cwd(), 'examples');

export type ExampleView = 'raw' | 'annotated' | 'tree' | 'live';

export interface ExampleAnnotation {
  /** A line number or "start-end" range within the editable part. */
  lines: string;
  note: string;
}

export interface ExampleManifest {
  id: string;
  title: string;
  tier: 'beginner' | 'intermediate' | 'pro';
  chapter: string;
  concept?: string;
  /** Directory (relative to the example dir) holding the unzipped package parts. */
  packageDir: string;
  editable: { part: string; language: string; label: string };
  views: ExampleView[];
  annotations?: ExampleAnnotation[];
  expect?: { opens?: boolean; builds?: boolean; pages?: number; stories?: number };
  pathological?: boolean;
  license?: string;
}

export interface ExampleData {
  manifest: ExampleManifest;
  /** Contents of the editable part — what the static views render. */
  editableSource: string;
  /** The editable part's path within the package (for labels / the live view). */
  editablePart: string;
}

export function getExample(id: string): ExampleData {
  const dir = join(ROOT, id);
  const manifest = JSON.parse(readFileSync(join(dir, 'example.json'), 'utf8')) as ExampleManifest;
  const editableSource = readFileSync(join(dir, manifest.packageDir, manifest.editable.part), 'utf8');
  return { manifest, editableSource, editablePart: manifest.editable.part };
}
