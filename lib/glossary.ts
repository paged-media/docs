/**
 * Glossary terms — one stable anchor per term and the schema.org
 * DefinedTermSet built from them. The glossary page writes each entry as a
 * paragraph `**Term** — definition`; the rehype pass in source.config.ts gives
 * that paragraph `id={termId(term)}`, and the docs page emits the set as
 * JSON-LD from the same Markdown, so the anchors and the structured data can
 * never disagree.
 */

/** The anchor for a term: `<Br/>` → `br`, `Self id` → `self-id`, `package / UCF` → `package-ucf`. */
export function termId(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface GlossaryTerm {
  id: string;
  name: string;
  description: string;
}

/** Entries of the glossary page, parsed from its processed Markdown. */
export function parseGlossary(markdown: string): GlossaryTerm[] {
  if (!markdown) return [];
  const terms: GlossaryTerm[] = [];
  for (const block of markdown.split(/\n\s*\n/)) {
    const m = block.trim().match(/^\*\*(.+?)\*\*\s+—\s+([\s\S]+)$/);
    if (!m) continue;
    const name = m[1].replace(/`/g, '').trim();
    const description = m[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*See [^.]*\.?$/, '')
      .trim();
    if (name && description) terms.push({ id: termId(name), name, description });
  }
  return terms;
}
