'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * <Sidenote id="vello-cpu">A note beside the sentence it qualifies.</Sidenote>
 *
 * A margin note, written inline in the paragraph it belongs to (one line of
 * text: a blank line inside it would put a paragraph inside a paragraph).
 *
 * - Where the article column has room beside the reading measure (the
 *   three-pane layout on a wide screen), the note sits in the outer margin,
 *   level with its marker.
 * - On a narrower screen the marker is a button that discloses the note inline
 *   (`aria-expanded`). Before the script runs the note shows inline, so it is
 *   never out of reach without JavaScript.
 * - Each note has a stable permalink, `#note-<id>`: the `id` is the author's,
 *   not a running count, so adding a note never moves another's link. Opening
 *   that link discloses the note on a narrow screen.
 *
 * Notes are numbered per page by a CSS counter (app/editorial.css).
 */
export function Sidenote({ id, children }: { id: string; children: ReactNode }) {
  const anchor = `note-${id}`;
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setReady(true);
    const reveal = () => {
      if (window.location.hash === `#${anchor}`) setOpen(true);
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [anchor]);
  return (
    <span className="paged-sidenote" data-ready={ready ? '' : undefined} data-open={open ? '' : undefined}>
      {/* The marker: a plain numeral where the note sits in the margin, a
          disclosure button where it does not (the CSS shows one of the two). */}
      <span className="paged-sidenote-mark" aria-hidden="true" />
      <button
        type="button"
        className="paged-sidenote-toggle"
        aria-expanded={open}
        aria-controls={anchor}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{'Note '}</span>
      </button>
      <span className="paged-sidenote-body" id={anchor} role="note">
        <a className="paged-sidenote-link" href={`#${anchor}`} aria-label="Link to this note" />
        {children}
      </span>
    </span>
  );
}
