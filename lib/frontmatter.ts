import { frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

/**
 * The page contract (briefing §4). Lives here (not in source.config.ts) because
 * fumadocs-mdx requires the config file to export ONLY collections — these enums,
 * types, and the schema are imported by it and by components.
 *
 * `noindex` is intentionally NOT a field: it is derived from `status` (see
 * lib/metadata.ts), so it can never disagree with the lifecycle.
 */
export const Tier = z.enum(['beginner', 'intermediate', 'pro']);
export type Tier = z.infer<typeof Tier>;

export const Diataxis = z.enum(['tutorial', 'how-to', 'reference', 'explanation']);
export type Diataxis = z.infer<typeof Diataxis>;

export const Status = z.enum(['stub', 'draft', 'published']);
export type Status = z.infer<typeof Status>;

export const docsFrontmatter = frontmatterSchema.extend({
  tier: Tier,
  diataxis: Diataxis,
  status: Status.default('stub'),
  owner: z.string().optional(),
  formatVersion: z.string().optional(),
});
