import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const EXAMPLES_ROOT = join(process.cwd(), 'examples');

export type ExampleView = 'raw' | 'annotated' | 'tree' | 'live';

export interface ExampleManifest {
  id: string;
  title: string;
  tier: 'beginner' | 'intermediate' | 'pro';
  chapter: string;
  concept?: string;
  packageDir: string;
  editable: { part: string; language: string; label: string };
  views: ExampleView[];
  annotations?: { lines: string; note: string }[];
  expect?: {
    opens?: boolean;
    builds?: boolean;
    pages?: number;
    stories?: number;
    frames?: number;
    paragraphs?: number;
    runs?: number;
  };
  pathological?: boolean;
  license?: string;
}

/** Every example directory (skips `_schema`, `_fonts`, `.generated`, …). */
export function listExamples(): string[] {
  return readdirSync(EXAMPLES_ROOT)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(join(EXAMPLES_ROOT, name)).isDirectory())
    .filter((name) => existsSync(join(EXAMPLES_ROOT, name, 'example.json')))
    .sort();
}

export function exampleDir(id: string): string {
  return join(EXAMPLES_ROOT, id);
}

export function readManifest(id: string): ExampleManifest {
  return JSON.parse(readFileSync(join(exampleDir(id), 'example.json'), 'utf8')) as ExampleManifest;
}
