import { createHighlighter, type Highlighter } from 'shiki';

let hl: Highlighter | undefined;

async function getHighlighter(): Promise<Highlighter> {
  hl ??= await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['xml', 'json', 'bash', 'rust', 'typescript'],
  });
  return hl;
}

/**
 * Annotation syntax: a line ending in a trailing `<!--#N-->` marker is tagged
 * with callout N. We detect the markers on the ORIGINAL source, strip them so the
 * rendered code stays valid IDML, then tag the corresponding rendered lines.
 */
const MARKER = /<!--#(\d+)-->\s*$/;

export async function highlight(code: string, lang = 'xml', annotate = false): Promise<string> {
  const h = await getHighlighter();

  let source = code;
  const callouts = new Map<number, string>();
  if (annotate) {
    const lines = code.split('\n');
    source = lines
      .map((line, i) => {
        const m = line.match(MARKER);
        if (m) {
          callouts.set(i + 1, m[1]);
          return line.replace(MARKER, '');
        }
        return line;
      })
      .join('\n');
  }

  return h.codeToHtml(source, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
    transformers: callouts.size
      ? [
          {
            line(node, line) {
              const callout = callouts.get(line);
              if (callout) node.properties['data-callout'] = callout;
            },
          },
        ]
      : [],
  });
}
