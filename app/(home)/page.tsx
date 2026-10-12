import Link from '@/components/site-link';
import { Pic } from '@/components/icons';
import { Frontispiece } from '@/components/frontispiece';

import { JsonLd } from '@/components/json-ld';
import { buildSiteJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';
import { SITE_ID } from '@/lib/site';

// The home page is the site root: canonical `/` (the layout supplies title,
// description and the social card).
export const metadata: Metadata = {
  alternates: { canonical: '/', types: { 'text/plain': '/llms.txt' } },
};

/**
 * The landing page of either site — the brand home (home.jsx): a two-column
 * hero with the frontispiece (Gutenberg here, the package on the IDML site),
 * a band of questions a reader arrives with, each answered by one page, and the
 * "where to begin" grid. The copy comes from HOME[SITE_ID]; the layout is
 * shared. The masthead + WIP banner come from the layout; the colophon footer
 * follows via SiteFooter.
 */
type Card = [icon: string, title: string, desc: string, href: string];

interface HomeCopy {
  eyebrow: string;
  title: [string, string];
  lede: string;
  start: string;
  browse: { label: string; href: string };
  questions: { eyebrow: string; title: string; items: Card[] };
  cards: Card[];
}

const HOME: Record<typeof SITE_ID, HomeCopy> = {
  idml: {
    eyebrow: 'IDML · the InDesign Markup Language',
    title: ['The IDML', 'reference'],
    lede:
      'An independent, in-depth reference for IDML, the open XML package an InDesign document ' +
      'becomes when it travels as text: the package, spreads and pages, stories, styles, tables, ' +
      'colour and graphics. Written from first principles, and every example is checked by opening ' +
      'it in InDesign.',
    start: '/docs/idml/foundations',
    browse: { label: 'Browse the elements', href: '/docs/idml/reference' },
    questions: {
      eyebrow: 'Start from a question',
      title: 'What do you need to know?',
      items: [
        ['package', 'What’s inside a package?', 'The ZIP container, the design map, and the parts it names.', '/docs/idml/package-anatomy'],
        ['story', 'How is text stored?', 'Stories as style runs, paragraph marks, and the frames that show them.', '/docs/idml/stories-text/story-structure'],
        ['spread', 'Where do things sit on the page?', 'Spread coordinates, transforms, bounds and paths.', '/docs/idml/geometry-coordinates'],
        ['xml', 'What does this element mean?', 'Every element and attribute, with counts from real documents.', '/docs/idml/reference'],
        ['search', 'What is in my file?', 'Open an .idml file in the browser and walk its parts. Nothing is uploaded.', '/docs/idml/tools/inspector'],
      ],
    },
    cards: [
      ['page', 'Foundations', 'What IDML is, why it is a package, and how to read one by hand.', '/docs/idml/foundations'],
      ['package', 'Package anatomy', 'The ZIP container, the design map, and the parts it points to.', '/docs/idml/package-anatomy'],
      ['story', 'Stories & text', 'Where the words live, how they thread, and how styles apply.', '/docs/idml/stories-text'],
    ],
  },
  paged: {
    eyebrow: 'Paged · open-source paged media',
    title: ['The Paged', 'documentation'],
    lede:
      'Paged is the open-source system that reads, renders and edits IDML: a WebGPU render ' +
      'engine, a viewer SDK, the paged.* scripting layer, a command line, and a plugin platform. ' +
      'This is how to build with it.',
    start: '/docs/paged/overview',
    browse: { label: 'See what works today', href: '/docs/paged/state' },
    questions: {
      eyebrow: 'Start from a task',
      title: 'What do you want to build?',
      items: [
        ['renderer', 'Show a document in a web page?', 'Load an .idml file, render its pages with WebGPU, drive the camera.', '/docs/paged/sdk'],
        ['xml', 'Change a document from code?', 'Read, edit and author documents with the paged.* scripting layer.', '/docs/paged/scripting'],
        ['page', 'Work from a terminal?', 'Open, author, render, export and verify documents with the paged command.', '/docs/paged/cli'],
        ['package', 'Extend the editor?', 'Add tools, panels, commands and content types with the plugin SDK.', '/docs/paged/plugin-sdk'],
        ['check', 'What works today?', 'Every capability, the layers that implement it, and the tests behind it.', '/docs/paged/state'],
      ],
    },
    cards: [
      ['page', 'Overview', 'What Paged is, and how the engine, the SDKs and the editor fit together.', '/docs/paged/overview'],
      ['renderer', 'The engine', 'How the parser and the renderer turn an IDML package into pages.', '/docs/paged/engine'],
      ['package', 'Plugins', 'The first-party content plugins, all built on the plugin SDK.', '/docs/paged/plugins'],
    ],
  },
};

const copy = HOME[SITE_ID];

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
      <JsonLd data={buildSiteJsonLd()} />
      {/* HERO */}
      <section style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-8) var(--space-6) var(--space-7)' }}>
        <div className="home-hero">
          <div>
            <div className="section-label" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-4)' }}>
              {copy.eyebrow}
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(48px, 7vw, 104px)', lineHeight: 0.92, margin: 0 }}>
              {copy.title[0]}
              <br />
              {copy.title[1]}
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
              {copy.lede}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
              <Link
                href={copy.start}
                style={{ ...ctaBase, background: 'var(--color-accent)', color: 'var(--color-paper-soft)' }}
              >
                Start here <Pic name="arrowRight" size={16} />
              </Link>
              <Link
                href={copy.browse.href}
                style={{ ...ctaBase, background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-ink)' }}
              >
                {copy.browse.label}
              </Link>
            </div>
          </div>

          <Frontispiece />
        </div>
      </section>

      {/* QUESTIONS — the questions a reader arrives with, each answered by one page */}
      <section style={{ background: 'var(--color-paper-soft)', borderTop: '1px solid var(--color-rule)', borderBottom: '1px solid var(--color-rule)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-7) var(--space-6)' }}>
          <div style={{ maxWidth: '44ch', marginBottom: 'var(--space-6)' }}>
            <div className="section-label" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>
              {copy.questions.eyebrow}
            </div>
            <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3vw, 40px)', margin: 0 }}>
              {copy.questions.title}
            </h2>
          </div>
          <div className="start-grid">
            {copy.questions.items.map(([icon, question, answer, href]) => (
              <Link key={question} href={href} className="start-card">
                <Pic name={icon} size={22} color="var(--color-ink-soft)" />
                <h3
                  style={{
                    fontFamily: 'var(--font-text-serif)',
                    fontWeight: 650,
                    fontSize: 22,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-ink)',
                    margin: 'var(--space-3) 0 var(--space-2)',
                  }}
                >
                  {question}
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-ink-soft)', margin: 0 }}>
                  {answer}
                </p>
              </Link>
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
          {copy.cards.map(([icon, title, desc, href]) => (
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
