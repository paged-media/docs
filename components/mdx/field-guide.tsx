import type { CSSProperties } from 'react';
import Link from '@/components/site-link';
import { getFieldGuide, getRefElement, type FieldGuideKey } from '@/lib/generated';
import { FieldGuideEnhance } from './field-guide-enhance';

/**
 * <FieldGuide /> — idml.paged.media/field-guide/, V5's illustrated field guide
 * with real content (docs/adr/810-next-edition-chrome.md): one InDesign-verified
 * example's page as the plate, on paper inside a night workspace; hotspots A, B
 * and C on its text frame, the frame's story and the paragraph style the story
 * applies; beside it the five stops from the package to the style, each with
 * the attribute names the example's XML gives that element, and a link to its
 * reference entry.
 *
 * Every position and every name comes from the example's IDML, read at build
 * time by scripts/generate/gen-field-guide.mjs; nothing here is placed by hand.
 *
 * Without JavaScript it is a page of anchors: a hotspot or a stop links to its
 * card, all five cards are in the HTML, and the one in the address is marked
 * (:target). FieldGuideEnhance only switches the highlight in place.
 * Styles: app/edition.css (`.paged-guide`).
 */
const pad = (n: number) => String(n).padStart(2, '0');
const cardId = (key: FieldGuideKey) => `guide-${key}`;

function NorthEast() {
  return (
    <svg className="paged-guide-ne" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function FieldGuide() {
  const guide = getFieldGuide();
  if (!guide) {
    return (
      <p className="not-prose">
        No field guide data in this build. Run <code>pnpm generate:docs</code>.
      </p>
    );
  }
  const { example, frame, hotspots, entries } = guide;
  const refHref = (element: string) => {
    const slug = getRefElement(element)?.slug;
    return slug ? `/docs/idml/reference/${slug}` : '/docs/idml/reference';
  };
  const hotspotOf = (key: FieldGuideKey) => hotspots.find((h) => h.key === key);
  const frameBox = { left: `${frame.x}%`, top: `${frame.y}%`, width: `${frame.w}%`, height: `${frame.h}%` } as CSSProperties;
  const commit = example.commit?.slice(0, 7);
  const version = example.indesignVersion.split('.').slice(0, 3).join('.');

  return (
    <section className="not-prose paged-guide" data-guide="" aria-label="Field guide: one page, followed through its package">
      <div className="paged-guide-grid">
        <figure className="paged-guide-figure">
          <div className="paged-guide-sheet" style={{ aspectRatio: `${example.raster.width} / ${example.raster.height}` }}>
            {example.raster.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- a static export; the raster is the evidence
              <img
                src={example.raster.src}
                srcSet={example.raster.src3x ? `${example.raster.src} 1x, ${example.raster.src3x} 3x` : undefined}
                width={example.raster.width}
                height={example.raster.height}
                alt={`Page 1 of the example “${example.title}”, as InDesign exports it: one line of text near the top of a large text frame.`}
              />
            ) : null}
            <span className="paged-guide-frame" style={frameBox} aria-hidden="true" />
            {/* Each mark sits just under the point it marks, a dot or the span of the indent. */}
            {hotspots.map((h) => (
              <span
                key={`mark-${h.key}`}
                className="paged-guide-mark"
                data-guide-mark={h.key}
                data-kind={h.span ? 'span' : 'dot'}
                style={h.span ? { left: `${h.span.x}%`, top: `${h.y}%`, width: `${h.span.w}%` } : { left: `${h.x}%`, top: `${h.y}%` }}
                aria-hidden="true"
              />
            ))}
            {hotspots.map((h) => (
              <a
                key={h.key}
                href={`#${cardId(h.key)}`}
                className="paged-guide-hotspot"
                data-guide-key={h.key}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                aria-label={`${h.label}: ${entries.find((e) => e.key === h.key)?.title.toLowerCase()}`}
              >
                {h.label}
              </a>
            ))}
          </div>
          <figcaption className="paged-guide-caption">
            <span className="paged-kicker">Plate 001 · Select a hotspot or a stop</span>
            <span>
              {hotspots.map((h, i) => (
                <span key={h.key}>
                  {i ? '; ' : ''}
                  <b>{h.label}</b> on {h.at}
                </span>
              ))}
              . The red outline is the frame’s bounds.
            </span>
            <span>
              The example <code>examples/{example.id}</code>
              {commit ? (
                <>
                  {' '}
                  at commit{' '}
                  <a href={`https://github.com/paged-media/docs/tree/${example.commit}/examples/${example.id}`}>{commit}</a>
                </>
              ) : null}
              : page 1 as InDesign {version} exports it, verified {example.verifiedAt}. Positions are read from its IDML
              when the site is built.
            </span>
          </figcaption>
        </figure>

        <div className="paged-guide-control">
          <p className="paged-kicker">Relationship / from the package to the style</p>
          <ol className="paged-guide-list">
            {entries.map((e, i) => {
              const h = hotspotOf(e.key);
              return (
                <li key={e.key}>
                  <a href={`#${cardId(e.key)}`} className="paged-guide-stop" data-guide-key={e.key}>
                    <b>{pad(i + 1)}</b>
                    <span>{e.title}</span>
                    {h ? <i aria-hidden="true">{h.label}</i> : null}
                  </a>
                  <Link href={refHref(e.element)} className="paged-guide-entry" aria-label={`${e.element}, in the element reference`}>
                    <NorthEast />
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="paged-guide-answers">
            {entries.map((e, i) => (
              <article key={e.key} id={cardId(e.key)} className="paged-guide-answer" data-guide-card={e.key} aria-labelledby={`${cardId(e.key)}-title`}>
                <p className="paged-kicker">
                  {pad(i + 1)} / {e.element} / {e.part}
                </p>
                <h3 id={`${cardId(e.key)}-title`}>{e.title}</h3>
                <p className="paged-guide-text">{e.text}</p>
                <p className="paged-guide-attrs" aria-label={`Attributes of ${e.element} in this example`}>
                  {e.attributes.map((a, j) => (
                    <span key={a}>
                      {j ? <span aria-hidden="true"> / </span> : null}
                      <code>{a}</code>
                    </span>
                  ))}
                </p>
                {e.children.length ? (
                  <p className="paged-guide-holds">
                    Holds{' '}
                    {e.children.map((c, j) => (
                      <span key={c}>
                        {j ? ', ' : ''}
                        <code>{c}</code>
                      </span>
                    ))}
                  </p>
                ) : null}
                <Link href={refHref(e.element)} className="paged-guide-read">
                  Read the reference entry for {e.element} <NorthEast />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
      <FieldGuideEnhance initial="frame" />
    </section>
  );
}
