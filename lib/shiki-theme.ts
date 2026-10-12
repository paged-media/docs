import type { ThemeRegistration } from 'shiki';

/**
 * Editorial XML syntax theme — the brand's restrained, paper-based code
 * palette (colors_and_type.css §CODE), never a neon IDE. `pagedEditorialDark`
 * is the same palette lifted for the night-paper theme (global.css `.dark`
 * --code-* tokens).
 * Token colors: tag #1f3f5b · attribute #7a3e12 · string #3e5637 ·
 * comment #8a8176 · punctuation #5f5a53 · text/ink #151412.
 */
export const pagedEditorial: ThemeRegistration = {
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

const DARK: Record<string, string> = {
  '#151412': '#ece5d8', // ink
  '#fbf7ef': '#1e1b18', // panel
  '#8a8176': '#8f8679', // comment
  '#1f3f5b': '#93b6db', // tag
  '#7a3e12': '#e2a676', // attribute
  '#3e5637': '#a9c79a', // string
  '#5f5a53': '#aaa298', // punctuation
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
