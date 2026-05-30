import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Fumadocs default in-site search (Orama). A hosted search service is a later
// upgrade once content stabilizes (briefing §7).
export const { GET } = createFromSource(source);
