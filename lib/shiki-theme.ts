import type { ThemeRegistration } from 'shiki';

/**
 * Editorial XML syntax theme — the brand's restrained, paper-based code
 * palette (app/brand.css --code-*, vendored from the brand), never a neon IDE.
 * `pagedEditorialDark` is the same palette lifted for night (global.css
 * `.dark` --code-* tokens), which the example lab also uses on its slate.
 * Token colors: tag #1f3f5b · attribute #7a3e12 · string #3e5637 ·
 * comment #5f6059 · punctuation #55574f · text/ink #171815 on #f8f5eb.
 */
export const pagedEditorial: ThemeRegistration = {
  name: 'paged-editorial',
  type: 'light',
  colors: {
    'editor.foreground': '#171815',
    'editor.background': '#f8f5eb',
  },
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5f6059', fontStyle: 'italic' } },
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
      settings: { foreground: '#55574f' },
    },
  ],
};

const DARK: Record<string, string> = {
  '#171815': '#e9eae3', // ink → night ink
  '#f8f5eb': '#29302e', // panel → night, raised
  '#5f6059': '#9ca49d', // comment → night muted
  '#1f3f5b': '#93b6db', // tag
  '#7a3e12': '#e2a676', // attribute
  '#3e5637': '#a9c79a', // string
  '#55574f': '#b4bab3', // punctuation
};

/** The editorial palette on night paper: every light colour mapped to its dark twin. */
export const pagedEditorialDark: ThemeRegistration = {
  ...pagedEditorial,
  name: 'paged-editorial-dark',
  type: 'dark',
  colors: Object.fromEntries(Object.entries(pagedEditorial.colors ?? {}).map(([k, v]) => [k, DARK[v] ?? v])),
  settings: (pagedEditorial.settings ?? []).map((rule) => ({
    ...rule,
    settings: { ...rule.settings, ...(rule.settings?.foreground ? { foreground: DARK[rule.settings.foreground] ?? rule.settings.foreground } : {}) },
  })),
};
