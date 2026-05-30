import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Static in-site search for the GitHub Pages export: `staticGET` emits a static
// search index into the export (no server route), which the client loads via
// Fumadocs' `type: 'static'` search (configured on RootProvider). A hosted
// search service is a later upgrade once content stabilizes (briefing §7).
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
