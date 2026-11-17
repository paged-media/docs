/**
 * The editor stills the docs show (components/mdx/editor-figure.tsx). Each id is
 * a file, `public/editor/<id>.webp`, recorded from the real editor (the
 * monorepo's film stills, `apps/editor/apps/canvas/tests/films/stills/`) or, for
 * the docs' own tools, from this site's build (`scripts/capture-inspector.mjs`).
 *
 * A figure shows only when its file is there AND its provenance is filled in:
 * the commit the still was recorded at (in `repo`) and the day. Until then the
 * page renders nothing in its place; the build names the gap.
 */
export interface EditorFigure {
  /** What the still shows, under it. */
  caption: string;
  /** The image's text alternative. */
  alt: string;
  /** Where the commit is: the editor (paged-media/paged) or this site (paged-media/docs). */
  repo: 'paged' | 'docs';
  /** Filled in when the still is recorded. */
  provenance: { commit: string; capturedAt: string } | null;
}

export const EDITOR_FIGURES = {
  'profile-full': {
    caption: '`full`: the whole editor, with every bundle, panel, tool, menu and mode.',
    alt: 'The Paged editor in the full profile: menu bar, tool rail, canvas, panels and the mode bar.',
    repo: 'paged',
    provenance: null,
  },
  'profile-solo-draw': {
    caption: '`solo:draw`: one module’s application, with its own tools and menus and no mode bar.',
    alt: 'The Paged editor in the solo:draw profile: the draw module’s tools and menus around the canvas.',
    repo: 'paged',
    provenance: null,
  },
  'profile-template-fill': {
    caption: '`template-fill`: Undo, Redo and Save, a short tool rail, and the template form as the inspector.',
    alt: 'The Paged editor in the template-fill profile: a template on the canvas with its fields outlined and the form beside it.',
    repo: 'paged',
    provenance: null,
  },
  'profile-viewer': {
    caption: '`viewer`: the canvas and its page thumbnails, with a hand and zoom rail.',
    alt: 'The Paged editor in the viewer profile: the canvas, page thumbnails and a two-tool rail.',
    repo: 'paged',
    provenance: null,
  },
  'template-filler': {
    caption: 'A filler session: the template form lists the fields, and the canvas outlines each field with its label.',
    alt: 'A template open in the template-fill preset, its fields dashed on the canvas and listed in the form beside it.',
    repo: 'paged',
    provenance: null,
  },
  'plugin-panel': {
    caption: 'A plugin’s panel in the editor: what `host.contribute` registers, docked beside the canvas.',
    alt: 'The Paged editor with a plugin panel open in the dock beside the canvas.',
    repo: 'paged',
    provenance: null,
  },
  inspector: {
    caption: 'The inspector with the sample package open and a text frame chosen: the package’s parts, the frame’s path and references, the page, and the spread’s element tree beside its XML, the frame marked in both.',
    alt: 'The IDML inspector: the list of the package’s parts, a strip with the chosen text frame’s path and references, the rendered page, and the spread’s element tree beside its XML with the text frame highlighted in both.',
    repo: 'docs',
    provenance: { commit: 'd6b24016c85caa719bc35425f56c30089a707af7', capturedAt: '2026-11-17' },
  },
} satisfies Record<string, EditorFigure>;

export type EditorFigureId = keyof typeof EDITOR_FIGURES;
