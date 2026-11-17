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
    caption: '`full`: the whole editor, with every bundle, panel, tool, menu and mode. A template is open, so a bar says it is being edited as a document.',
    alt: 'The Paged editor in the full profile with a business-card template open: menu bar, control bar, tool rail, canvas, panels and the mode bar, and a notice that the document is a template with four fields.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  'profile-solo-draw': {
    caption: '`solo:draw`: the draw module’s application, with its own tools and menus and no mode bar.',
    alt: 'The Paged editor in the solo:draw profile: a shorter menu bar and the draw tools around a page with four rounded shapes in pink, violet and green.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  'profile-template-fill': {
    caption: '`template-fill`: Undo, Redo and Save, a short tool rail, and the template form as the inspector.',
    alt: 'The Paged editor in the template-fill profile: the business card with its fields dashed and labelled on the canvas, and the form beside it reading 3 of 4 fields filled.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  'profile-viewer': {
    caption: '`viewer`: the canvas and its page thumbnails, with a short rail of Select, Hand and Zoom.',
    alt: 'The Paged editor in the viewer profile: the business card on the canvas, a page thumbnail below, and a rail of three tools.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  'template-filler': {
    caption: 'A filler session: the form lists the fields and counts them, and the canvas outlines each field with its label.',
    alt: 'A filler’s session on the business-card template: the name and job title filled in, the e-mail field focused in the form, and every field dashed and labelled on the card.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  'plugin-panel': {
    caption: 'A module’s panel in the dock: paged.draw’s Path options, with its width profile applied to an open path. A plugin’s panel registers the same way.',
    alt: 'The Paged editor with paged.draw’s Path options panel open beside the canvas, its Width profile section set to 1, 6 and 1 points, and a wavy open path on the page outlined with that profile.',
    repo: 'paged',
    provenance: { commit: '09a35a100', capturedAt: '2026-11-17' },
  },
  inspector: {
    caption: 'The inspector with the sample package open and a text frame chosen: the package’s parts, the frame’s path and references, the page, and the spread’s element tree beside its XML, the frame marked in both.',
    alt: 'The IDML inspector: the list of the package’s parts, a strip with the chosen text frame’s path and references, the rendered page, and the spread’s element tree beside its XML with the text frame highlighted in both.',
    repo: 'docs',
    provenance: { commit: 'd6b24016c85caa719bc35425f56c30089a707af7', capturedAt: '2026-11-17' },
  },
} satisfies Record<string, EditorFigure>;

export type EditorFigureId = keyof typeof EDITOR_FIGURES;
