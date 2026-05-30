import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { docsFrontmatter } from './lib/frontmatter';

// This file may export ONLY collections (a fumadocs-mdx constraint). The schema,
// enums, and types live in ./lib/frontmatter.
export const docs = defineDocs({
  dir: 'content/docs',
  docs: { schema: docsFrontmatter },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
