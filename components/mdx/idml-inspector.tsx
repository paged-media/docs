/**
 * <IdmlInspector /> — the client-side IDML inspector (tools/inspector).
 *
 * Server side, it hands the client two things the browser can't compute: which
 * element names have a page in the generated element reference (with the href
 * resolved for this build and the summary for the tooltip), and a small example
 * package for the "open a sample" button, assembled from the same parts the CI
 * gate validates. Everything else happens in the reader's browser
 * (components/inspector/).
 */
import { assembleExampleBase64 } from '@/lib/assemble-example';
import { getIdmlReference } from '@/lib/generated';
import { resolveHref } from '@/lib/site';
import type { ElementRefs } from '@/components/inspector/annotated-xml';
import { IdmlInspectorLoader } from '@/components/inspector/loader';

const SAMPLE = 'two-page-spread';

export function IdmlInspector() {
  const refs: ElementRefs = {};
  for (const e of getIdmlReference().elements) {
    refs[e.name] = { href: resolveHref(`/docs/idml/reference/${e.slug}`), summary: e.summary ?? null };
  }
  let sample: { name: string; base64: string } | undefined;
  try {
    sample = { name: SAMPLE, base64: assembleExampleBase64(SAMPLE) };
  } catch {
    sample = undefined;
  }
  return <IdmlInspectorLoader refs={refs} sample={sample} />;
}
