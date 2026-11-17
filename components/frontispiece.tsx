import { SITE_ID } from '@/lib/site';

/**
 * The home hero's frontispiece — the one image that tells the two sites apart
 * at a glance, a small plate beside the headline. docs.paged.media keeps the
 * engraved Gutenberg portrait (the project); idml.paged.media shows the format
 * itself: the package, drawn in the brand's line-icon hand, with the parts a
 * reader finds inside it. Styles: app/edition.css.
 */
export function Frontispiece() {
  return (
    <figure className="paged-frontispiece">
      <div className="paged-cropmarks paged-frontispiece-frame">
        <div className="paged-frontispiece-plate">
          {SITE_ID === 'idml' ? (
            <PackagePlate />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/gutenberg.svg" alt="Engraved portrait of Johannes Gutenberg" className="paged-engraving" />
          )}
        </div>
      </div>
      <figcaption className="type-meta">
        {SITE_ID === 'idml' ? (
          <>
            Frontispiece · the IDML package
            <br />a ZIP of XML parts
          </>
        ) : (
          <>
            Frontispiece · Johannes Gutenberg
            <br />
            c. 1400–1468
          </>
        )}
      </figcaption>
    </figure>
  );
}

/** The package glyph (components/icons.tsx `package`) as a plate, with its parts. */
function PackagePlate() {
  const parts = ['designmap.xml', 'Spreads/', 'Stories/', 'Resources/'];
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Drawing of an IDML package and the parts inside it">
      <g
        transform="translate(62 30) scale(4)"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={0.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 8l7.5-4 7.5 4v8l-7.5 4-7.5-4z" />
        <path d="M4.5 8l7.5 4 7.5-4" />
        <path d="M12 12v8" />
        <path d="M8.25 6l7.5 4" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--color-ink-soft)" textAnchor="middle" letterSpacing="0.02em">
        {parts.map((p, i) => (
          <text key={p} x="110" y={136 + i * 14}>
            {p}
          </text>
        ))}
      </g>
      <path d="M78 186h64" stroke="var(--color-accent)" strokeWidth={1} />
    </svg>
  );
}
