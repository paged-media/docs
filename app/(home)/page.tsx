import Link from 'next/link';
import { Pic } from '@/components/icons';

/**
 * The docs.paged.media landing page — the brand home (home.jsx): a two-column
 * hero with the Gutenberg frontispiece, the reader-tier band (form, not color —
 * tier glyphs + roman numerals, never traffic lights), and the "where to begin"
 * grid. The masthead + WIP banner come from the layout; the colophon footer
 * follows via SiteFooter.
 */
const TIERS: [icon: string, name: string, numeral: string, desc: string][] = [
  ['tierBeginner', 'Beginner', 'I', 'Plain-language explanations. Start here if IDML or paged media is new to you.'],
  ['tierIntermediate', 'Intermediate', 'II', 'Working knowledge — package structure, stories, styles, and how pages compose.'],
  ['tierPro', 'Pro', 'III', 'Deep reference — geometry, edge cases, renderer behavior, and the format in full.'],
];

const START: [icon: string, title: string, desc: string, href: string][] = [
  ['page', 'Foundations', 'What IDML is, paged media, the document model.', '/docs/foundations'],
  ['package', 'IDML structure', 'The package, designmap, spreads, and stories.', '/docs/package-anatomy'],
  ['renderer', 'Rendering', 'How document structure becomes visual pages.', '/docs/the-renderer'],
];

const ctaBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  padding: '13px 20px',
  textDecoration: 'none',
  borderRadius: 2,
};

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-8) var(--space-6) var(--space-7)' }}>
        <div className="home-hero">
          <div>
            <div className="section-label" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-4)' }}>
              Paged · paged media, IDML first
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(48px, 7vw, 104px)', lineHeight: 0.92, margin: 0 }}>
              The IDML living
              <br />
              documentation
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-text-serif)',
                fontSize: 'clamp(18px, 1.4vw, 21px)',
                lineHeight: 1.55,
                color: 'var(--color-ink-soft)',
                margin: 'var(--space-5) 0 0',
                maxWidth: '52ch',
                textWrap: 'pretty',
              }}
            >
              An independent, technically deep reference for the IDML file format and the Paged native
              renderer — authored from first principles, learning in public as the renderer teaches us.
              Every example is one our renderer accepts.
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
              <Link
                href="/docs/foundations"
                style={{ ...ctaBase, background: 'var(--color-accent)', color: 'var(--color-paper-soft)' }}
              >
                Start here <Pic name="arrowRight" size={16} />
              </Link>
              <Link
                href="/docs"
                style={{ ...ctaBase, background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-ink)' }}
              >
                Browse the reference
              </Link>
            </div>
          </div>

          {/* frontispiece */}
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="paged-cropmarks" style={{ padding: 4 }}>
              <div
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'var(--color-paper-soft)',
                  border: '1px solid var(--color-rule)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/gutenberg.svg"
                  alt="Engraved portrait of Johannes Gutenberg"
                  style={{ width: '106%', height: '106%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
            <figcaption className="type-meta" style={{ textAlign: 'center' }}>
              Frontispiece · Johannes Gutenberg
              <br />
              c. 1400–1468
            </figcaption>
          </figure>
        </div>
      </section>

      {/* READER TIERS */}
      <section style={{ background: 'var(--color-paper-soft)', borderTop: '1px solid var(--color-rule)', borderBottom: '1px solid var(--color-rule)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-7) var(--space-6)' }}>
          <div style={{ maxWidth: '44ch', marginBottom: 'var(--space-6)' }}>
            <div className="section-label" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>
              Reader tiers
            </div>
            <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3vw, 40px)', margin: 0 }}>
              One page, one tier, one job.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.5, color: 'var(--color-ink-soft)', margin: 'var(--space-3) 0 0' }}>
              Every page is written for a single reader and a single task. Filter the whole reference to
              your depth — no traffic lights, just the shape of the page you&rsquo;re about to read.
            </p>
          </div>
          <div className="tiers-grid">
            {TIERS.map(([icon, name, numeral, desc], i) => (
              <div
                key={name}
                style={{
                  paddingLeft: i === 0 ? 0 : 'var(--space-5)',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--color-rule)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pic name={icon} size={40} color="var(--color-ink)" stroke={1.4} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-rule-strong)' }}>{numeral}</span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display-serif)',
                    fontWeight: 600,
                    fontSize: 26,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-ink)',
                    margin: 'var(--space-4) 0 var(--space-2)',
                  }}
                >
                  {name}
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-ink-soft)', margin: 0 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHERE TO BEGIN */}
      <section style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-7) var(--space-6) var(--space-8)' }}>
        <div className="section-label" style={{ marginBottom: 'var(--space-5)' }}>
          Where to begin
        </div>
        <div className="start-grid">
          {START.map(([icon, title, desc, href]) => (
            <Link key={title} href={href} className="start-card">
              <Pic name={icon} size={22} color="var(--color-ink-soft)" />
              <h3
                style={{
                  fontFamily: 'var(--font-text-serif)',
                  fontWeight: 650,
                  fontSize: 24,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-ink)',
                  margin: 'var(--space-3) 0 var(--space-2)',
                }}
              >
                {title}
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-ink-soft)', margin: 0 }}>
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
