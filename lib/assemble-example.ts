import { join } from 'node:path';
import { assembleIdml } from '@/scripts/examples/assemble';
import { getExample } from '@/lib/examples';

/**
 * Server-side: assemble an example's package into a complete `.idml` and return
 * it base64-encoded, so a Server Component can hand the bytes to the client
 * `LivePreview` (which feeds them to the WebGPU ViewerSession). Same assembler
 * the CI gate uses, so the previewed package is byte-identical to the validated
 * one.
 */
const ROOT = join(process.cwd(), 'examples');

export function assembleExampleBase64(id: string): string {
  const { manifest } = getExample(id);
  const bytes = assembleIdml(join(ROOT, id, manifest.packageDir));
  return Buffer.from(bytes).toString('base64');
}
