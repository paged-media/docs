import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { docsFrontmatter } from './lib/frontmatter';

// This file may export ONLY collections (a fumadocs-mdx constraint). The schema,
// enums, and types live in ./lib/frontmatter.
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsFrontmatter,
    // Expose the processed Markdown of each page so the LLM routes
    // (app/llms.txt, app/llms-full.txt) can emit pages as plain Markdown via
    // `page.data.getText('processed')`.
    postprocess: { includeProcessedMarkdown: true },
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
