import { createHighlighter, type Highlighter } from 'shiki';
import { pagedEditorial, pagedEditorialDark } from './shiki-theme';

let hl: Highlighter | undefined;

async function getHighlighter(): Promise<Highlighter> {
  hl ??= await createHighlighter({
    themes: [pagedEditorial, pagedEditorialDark],
    langs: ['xml', 'json', 'bash', 'rust', 'typescript'],
  });
  return hl;
}

/**
 * Annotation syntax: a line ending in a trailing `<!--#N-->` marker is tagged
 * with callout N. We detect the markers on the ORIGINAL source, strip them so the
 * rendered code stays valid IDML, then tag the corresponding rendered lines.
 *
 * Every line also carries its number (`data-line`, shown by the numbered views'
 * gutter), and a line inside an annotation's `lines` range ("5", "20-25")
 * carries that note's index (`data-note`), so the annotated view can mark it
 * and tie it to the note beside it.
 */
const MARKER = /<!--#(\d+)-->\s*$/;

/** "5" → [5, 5]; "20-25" → [20, 25]; anything else → null. */
export function lineRange(lines: string): [number, number] | null {
  const m = lines.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  return [a, m[2] ? Number(m[2]) : a];
}

export async function highlight(
  code: string,
  lang = 'xml',
  annotate = false,
  notes: { lines: string }[] = [],
): Promise<string> {
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
  const ranges = notes.map((n) => lineRange(n.lines));
  const noteOf = (line: number) => ranges.findIndex((r) => r !== null && line >= r[0] && line <= r[1]);

  return h.codeToHtml(source, {
    lang,
    // Both themes via the `--shiki-light` / `--shiki-dark` variable contract
    // (global.css picks one by the `.dark` class).
    themes: { light: 'paged-editorial', dark: 'paged-editorial-dark' },
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          node.properties['data-line'] = line;
          const callout = callouts.get(line);
          if (callout) node.properties['data-callout'] = callout;
          const note = noteOf(line);
          if (note !== -1) node.properties['data-note'] = note;
        },
      },
    ],
  });
}
