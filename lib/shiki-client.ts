import type { HighlighterCore } from 'shiki/core';
import { pagedEditorial, pagedEditorialDark } from './shiki-theme';

/**
 * Shiki for the browser, kept small: `shiki/core` with the XML grammar only and
 * the JavaScript regex engine (no Oniguruma wasm), in the same editorial theme
 * the server highlighter uses (lib/shiki.ts). Loaded on first use, so a page
 * that never highlights on the client never fetches it.
 *
 * Highlighting is linear in the input but heavy per token; above
 * `HIGHLIGHT_LIMIT` characters callers show plain text instead.
 */
export const HIGHLIGHT_LIMIT = 200_000;

let hl: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  hl ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, xml] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/xml.mjs'),
    ]);
    return createHighlighterCore({
      themes: [pagedEditorial, pagedEditorialDark],
      langs: [xml.default],
      engine: createJavaScriptRegexEngine(),
    });
  })().catch((e) => {
    hl = undefined; // a failed chunk load may succeed on the next try
    throw e;
  });
  return hl;
}

/** XML → highlighted HTML (`.shiki` markup, styled by global.css), or null above the cap. */
export async function highlightXml(code: string): Promise<string | null> {
  if (code.length > HIGHLIGHT_LIMIT) return null;
  const h = await getHighlighter();
  return h.codeToHtml(code, {
    lang: 'xml',
    themes: { light: 'paged-editorial', dark: 'paged-editorial-dark' },
    defaultColor: false,
    // Each line carries its number for the numbered views' gutter (global.css).
    transformers: [{ line: (node, line) => void (node.properties['data-line'] = line) }],
  });
}
