/**
 * <EditorFigure id="template-filler" /> — a still of the editor (or of one of
 * this site's tools), with its caption and a provenance line naming the commit
 * it was recorded at. <EditorFigures ids={[…]} /> sets several side by side.
 *
 * The ids, captions, alt text and provenance are data/editor-figures.ts; the
 * file is public/editor/<id>.webp. A figure whose file or provenance is missing
 * renders nothing, so a page can name its slot before the still exists; the
 * build warns when a file is there without its provenance.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EDITOR_FIGURES, type EditorFigure as Entry } from '@/data/editor-figures';
import { formatDay } from '@/lib/evidence';
import { webpSize } from '@/lib/webp-size';
import { withCode } from './inline-code';

const REPOS = {
  paged: { url: 'https://github.com/paged-media/paged', words: 'Recorded in the Paged editor' },
  docs: { url: 'https://github.com/paged-media/docs', words: 'Captured from this site’s build' },
} as const;

interface Ready {
  id: string;
  entry: Entry & { provenance: NonNullable<Entry['provenance']> };
  src: string;
  size: { width: number; height: number } | null;
}

function ready(id: string): Ready | null {
  const entry = (EDITOR_FIGURES as Record<string, Entry>)[id];
  if (!entry) {
    console.warn(`EditorFigure: no figure "${id}" in data/editor-figures.ts`);
    return null;
  }
  const file = join(process.cwd(), 'public', 'editor', `${id}.webp`);
  if (!existsSync(file)) return null;
  if (!entry.provenance) {
    console.warn(`EditorFigure: public/editor/${id}.webp is there but data/editor-figures.ts gives it no provenance; it is not shown`);
    return null;
  }
  return { id, entry: entry as Ready['entry'], src: `/editor/${id}.webp`, size: webpSize(file) };
}

function Provenance({ f }: { f: Ready }) {
  const repo = REPOS[f.entry.repo];
  const { commit, capturedAt } = f.entry.provenance;
  return (
    <span className="paged-editor-figure-source">
      {repo.words} at{' '}
      <a href={`${repo.url}/commit/${commit}`}>
        <code>{commit.slice(0, 9)}</code>
      </a>
      , <time dateTime={capturedAt}>{formatDay(capturedAt)}</time>.
    </span>
  );
}

function Still({ f }: { f: Ready }) {
  return (
    // A static export serves the still as it is (no image optimiser).
    <img src={f.src} alt={f.entry.alt} width={f.size?.width} height={f.size?.height} loading="lazy" decoding="async" />
  );
}

export function EditorFigure({ id }: { id: string }) {
  const f = ready(id);
  if (!f) return null;
  return (
    <figure className="not-prose paged-editor-figure" id={`figure-${id}`}>
      <Still f={f} />
      <figcaption>
        <span className="paged-editor-figure-caption">{withCode(f.entry.caption)}</span>
        <Provenance f={f} />
      </figcaption>
    </figure>
  );
}

export function EditorFigures({ ids, label }: { ids: string[]; label?: string }) {
  const figures = ids.map(ready).filter((f): f is Ready => f !== null);
  if (!figures.length) return null;
  return (
    <div className="not-prose paged-editor-figures" role="group" aria-label={label}>
      {figures.map((f) => (
        <figure key={f.id} className="paged-editor-figure" id={`figure-${f.id}`}>
          <Still f={f} />
          <figcaption>
            <span className="paged-editor-figure-caption">{withCode(f.entry.caption)}</span>
            <Provenance f={f} />
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
