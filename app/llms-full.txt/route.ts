import { source } from '@/lib/source';
import { getLLMText } from '@/lib/get-llm-text';

// Emit a static /llms-full.txt into the export: the entire reference as one
// Markdown document, so an LLM can ingest the whole corpus in a single fetch.
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  const scanned = await Promise.all(source.getPages().map(getLLMText));
  return new Response(scanned.join('\n\n'));
}
