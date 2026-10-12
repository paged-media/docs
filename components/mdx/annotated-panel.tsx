'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExampleAnnotation } from '@/lib/examples';

/**
 * The annotated view's client half: the server-highlighted code (each line
 * tagged `data-line`, annotated lines `data-note`) beside its notes. Hovering
 * or focusing a note lights the lines it is about; hovering a marked line
 * lights its note — so "L7" never has to be counted by eye.
 */
export function AnnotatedPanel({ html, annotations }: { html: string; annotations: ExampleAnnotation[] }) {
  const codeRef = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState<number | null>(null);

  // Light the active note's lines.
  useEffect(() => {
    const root = codeRef.current;
    if (!root) return;
    for (const line of root.querySelectorAll<HTMLElement>('.line[data-note]')) {
      line.classList.toggle('is-hot', hot !== null && line.dataset.note === String(hot));
    }
  }, [hot]);

  const onCodeOver = (e: React.MouseEvent) => {
    const line = (e.target as HTMLElement).closest<HTMLElement>('.line[data-note]');
    setHot(line ? Number(line.dataset.note) : null);
  };

  return (
    <div className="paged-annotated">
      <div
        ref={codeRef}
        className="paged-code-numbered paged-annotated-code"
        onMouseOver={onCodeOver}
        onMouseLeave={() => setHot(null)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ol className="paged-marginalia" onMouseLeave={() => setHot(null)}>
        {annotations.map((a, i) => (
          <li
            key={i}
            tabIndex={0}
            className={hot === i ? 'is-hot' : undefined}
            onMouseEnter={() => setHot(i)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
          >
            <span className="paged-marginalia-ref">L{a.lines}</span>
            <span className="paged-marginalia-note">{a.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
