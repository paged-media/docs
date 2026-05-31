import type { InferPageType } from 'fumadocs-core/source';
import type { source } from '@/lib/source';

/**
 * Render one docs page as plain Markdown for LLM consumption: a title + URL
 * heading followed by the page's processed Markdown (JSX/components stripped to
 * their text). Used by the /llms.txt and /llms-full.txt routes.
 *
 * Requires `includeProcessedMarkdown: true` on the docs collection
 * (source.config.ts), which is what makes `getText('processed')` available.
 */
export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
