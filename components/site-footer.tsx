import { Pic } from '@/components/icons';

/**
 * The colophon footer — the brand DocsFooter (Components.jsx): a 2px ink top
 * rule, the `paged.` wordmark + repo link, the project mission (whose closing
 * paragraph is the Adobe disclaimer), the display-serif "three things working in
 * concert" line, the type colophon, and the CC BY 4.0 / MIT licensing split.
 */
const serifP = {
  fontFamily: 'var(--font-text-serif)',
  fontSize: 15.5,
  lineHeight: 1.6,
  color: 'var(--color-ink-soft)',
} as const;

export function SiteFooter() {
  return (
    <footer style={{ borderTop: '2px solid var(--color-ink)', background: 'var(--color-paper)', marginTop: 'var(--space-9)' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-7) var(--space-6) var(--space-6)' }}>
        {/* wordmark + repo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-rule)',
          }}
        >
          <span className="paged-wordmark" style={{ fontSize: 24 }}>
            paged<span style={{ color: 'var(--color-accent)' }}>.</span>
          </span>
          <a
            href="https://github.com/paged-media"
            rel="noreferrer noopener"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-muted)',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            <Pic name="package" size={15} /> github.com/paged-media
          </a>
        </div>

        {/* mission */}
        <div style={{ columnWidth: 300, columnGap: 48, marginTop: 'var(--space-5)' }}>
          <p style={{ ...serifP, margin: '0 0 1em' }}>
            Paged brings enterprise Desktop Publishing directly to the web. No more bloated applications.
            No more hidden, proprietary technologies. Just as Scribus and others democratized DTP before
            it, Paged sets out to open this domain up to everyone — leveraging modern technologies like
            WebGPU and WebAssembly to deliver professional-grade publishing performance natively in the
            browser.
          </p>
          <p style={{ ...serifP, margin: '0 0 1em' }}>
            At its core, Paged is an open-source IDML parser and renderer. It reads IDML files, parses
            them, and renders them faithfully on the web.
          </p>
          <p style={{ ...serifP, margin: 0 }}>
            Paged also aims to be the open IDML reference — an easily accessible, authoritative resource
            providing deep insight into the structure and inner workings of the IDML format, which has
            long been underdocumented and locked behind proprietary tooling.
          </p>
        </div>

        {/* three things in concert */}
        <p
          style={{
            fontFamily: 'var(--font-display-serif)',
            fontSize: 'clamp(19px, 2vw, 26px)',
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            margin: 'var(--space-6) 0 0',
            maxWidth: '34ch',
          }}
        >
          Three things working in concert: a <em style={{ color: 'var(--color-accent)' }}>mission</em> to
          democratize Desktop Publishing for the web era, a faithful open IDML{' '}
          <em style={{ color: 'var(--color-accent)' }}>engine</em>, and the definitive open{' '}
          <em style={{ color: 'var(--color-accent)' }}>reference</em> for the format.
        </p>

        {/* attribution / disclaimer / licensing */}
        <div
          style={{
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-rule)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4) var(--space-6)',
          }}
        >
          <p className="type-meta" style={{ lineHeight: 1.6, margin: 0 }}>
            Paged and paged.media are an open project from{' '}
            <a href="https://andthenext.at" rel="noreferrer noopener" style={{ color: 'var(--color-ink-soft)' }}>
              And The Next GmbH
            </a>
            .
          </p>
          <p className="type-meta" style={{ lineHeight: 1.6, margin: 0, color: 'var(--color-rule-strong)' }}>
            Paged is an independent open-source project and is not affiliated with, endorsed by, or
            sponsored by Adobe Inc. IDML and InDesign are referenced solely for interoperability and
            descriptive purposes. We are deeply grateful to Adobe for opening up the IDML format for
            exchange, and thank them wholeheartedly for making projects like this possible.
          </p>
          <p className="type-meta" style={{ lineHeight: 1.6, margin: 0 }}>
            Documentation content is licensed{' '}
            <strong style={{ fontWeight: 600, color: 'var(--color-ink-soft)' }}>CC&nbsp;BY&nbsp;4.0</strong>;
            site code is licensed{' '}
            <strong style={{ fontWeight: 600, color: 'var(--color-ink-soft)' }}>MIT</strong>.
            <br />© 2026 And The Next GmbH
          </p>
        </div>
      </div>
    </footer>
  );
}
