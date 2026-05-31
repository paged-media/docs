import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

// Emit a static /llms.txt into the export (output: 'export'). This is the
// llms.txt index — a Markdown map of the reference for LLMs/agents. force-static
// is required for a route handler under static export (same as robots/sitemap).
export const dynamic = 'force-static';
export const revalidate = false;

export function GET() {
  return new Response(llms(source).index());
}
