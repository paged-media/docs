import { createHighlighter, type Highlighter, type ThemeRegistration } from 'shiki';

/**
 * Editorial XML syntax theme — the brand's restrained, paper-based code
 * palette (colors_and_type.css §CODE), never a neon IDE. Light-only.
 * Token colors: tag #1f3f5b · attribute #7a3e12 · string #3e5637 ·
 * comment #8a8176 · punctuation #5f5a53 · text/ink #151412.
 */
const pagedEditorial: ThemeRegistration = {
  name: 'paged-editorial',
  type: 'light',
  colors: {
    'editor.foreground': '#151412',
    'editor.background': '#fbf7ef',
  },
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8a8176', fontStyle: 'italic' } },
    {
      scope: [
        'entity.name.tag',
        'entity.name.tag.xml',
        'entity.name.tag.localname.xml',
        'meta.tag',
        'support.class',
        'support.type',
        'entity.name.type',
        'keyword',
        'storage.type',
      ],
      settings: { foreground: '#1f3f5b' },
    },
    {
      scope: [
        'entity.other.attribute-name',
        'entity.other.attribute-name.xml',
        'entity.other.attribute-name.localname.xml',
        'variable',
        'variable.other',
        'meta.object-literal.key',
      ],
      settings: { foreground: '#7a3e12' },
    },
    {
      scope: [
        'string',
        'string.quoted.double.xml',
        'string.quoted.single.xml',
        'constant.numeric',
        'constant.language',
      ],
      settings: { foreground: '#3e5637' },
    },
    {
      scope: [
        'punctuation',
        'punctuation.definition.tag',
        'punctuation.separator',
        'punctuation.definition.string',
        'meta.tag.preprocessor.xml',
      ],
      settings: { foreground: '#5f5a53' },
    },
  ],
};

let hl: Highlighter | undefined;

async function getHighlighter(): Promise<Highlighter> {
  hl ??= await createHighlighter({
    themes: [pagedEditorial],
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
    // Single light theme via the `--shiki-light` variable contract
    // (global.css reads it). No dark theme — the site is light-only.
    themes: { light: 'paged-editorial' },
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
