import type { ReactNode } from 'react';
import Link from '@/components/site-link';
import { Fact } from '@/components/mdx/fact';
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
 * The front page of either site, in the V5 form (docs/adr/810): a hero with a
 * red mono kicker path, a two-line headline whose second line is red italic,
 * the lede and two actions, the frontispiece as a small plate beside it; then
 * the questions a reader arrives with as numbered index rows, each answered by
 * one page; then "where to begin" as a three-up bridge. The copy comes from
 * HOME[SITE_ID]; the layout is shared. Masthead and ribbon come from the root
 * layout, the footer from (home)/layout.tsx. Styles: app/edition.css.
 */
type Row = { question: string; answer: ReactNode; href: string; more?: { label: string; href: string } };
type Card = { title: string; desc: string; href: string };

interface HomeCopy {
  kicker: string;
  title: [string, string];
  lede: string;
  start: string;
  browse: { label: string; href: string };
  questions: { kicker: string; title: [string, string]; line: string; rows: Row[] };
  begin: { kicker: string; title: [string, string]; cards: Card[] };
}

const HOME: Record<typeof SITE_ID, HomeCopy> = {
  idml: {
    kicker: 'The independent IDML atlas / A neutral reference',
    title: ['Inside', 'the IDML.'],
    lede:
      'Inspect a publication through its package, its spread geometry, the frames that own its text, its stories ' +
      'and its styles. An independent reference for IDML, the open XML package an InDesign document becomes when ' +
      'it travels as text, written from first principles; every example is checked by opening it in InDesign.',
    start: '/docs/idml/foundations',
    browse: { label: 'Browse the elements', href: '/docs/idml/reference' },
    questions: {
      kicker: 'Start from a question / 01',
      title: ['What do you', 'need to know?'],
      line: 'Each question is answered by one page. Follow it, and the reference takes you on from there.',
      rows: [
        { question: 'What’s inside a package?', answer: 'The ZIP container, the design map, and the parts it names.', href: '/docs/idml/package-anatomy' },
        { question: 'How is text stored?', answer: 'Stories as style runs, paragraph marks, and the frames that show them.', href: '/docs/idml/stories-text/story-structure' },
        { question: 'Where do things sit on the page?', answer: 'Spread coordinates, transforms, bounds and paths.', href: '/docs/idml/geometry-coordinates' },
        {
          question: 'What does this element mean?',
          // What the reference covers, said as the census measured it (data/facts.json).
          answer: (
            <>
              <Fact id="idml.reference.elements" /> elements with an entry, from <Fact id="idml.census.elements" /> observed
              across <Fact id="idml.census.documents" /> documents, with their attributes and counts.
            </>
          ),
          href: '/docs/idml/reference',
          more: { label: 'How the census counts', href: '/docs/idml/meta/census' },
        },
        { question: 'How do the parts relate?', answer: 'One verified page, followed from its package to a frame, its story and its style.', href: '/docs/idml/field-guide' },
        { question: 'What is in my file?', answer: 'Open an .idml file in the browser and walk its parts. Nothing is uploaded.', href: '/docs/idml/tools/inspector' },
      ],
    },
    begin: {
      kicker: 'Where to begin / 02',
      title: ['Three ways', 'into the format.'],
      cards: [
        { title: 'Foundations', desc: 'What IDML is, why it is a package, and how to read one by hand.', href: '/docs/idml/foundations' },
        { title: 'Package anatomy', desc: 'The ZIP container, the design map, and the parts it points to.', href: '/docs/idml/package-anatomy' },
        { title: 'Stories & text', desc: 'Where the words live, how they thread, and how styles apply.', href: '/docs/idml/stories-text' },
      ],
    },
  },
  paged: {
    kicker: 'The technical handbook / Learning by making',
    title: ['Documentation,', 'composed for clarity.'],
    lede:
      'Paged is the open-source system that reads, renders and edits IDML: a render engine that rasterises on the ' +
      'CPU or with WebGPU, a viewer SDK, the paged.* scripting layer, a command line, and a plugin platform. This ' +
      'is how to build with it.',
    start: '/docs/paged/overview',
    browse: { label: 'See what works today', href: '/docs/paged/state' },
    questions: {
      kicker: 'Start from a task / 01',
      title: ['What do you', 'want to build?'],
      line: 'Each task is answered by one page, with runnable examples and the engine release it was checked against.',
      rows: [
        { question: 'Show a document in a web page?', answer: 'Load an .idml file, render its pages with WebGPU, drive the camera.', href: '/docs/paged/sdk' },
        { question: 'Change a document from code?', answer: 'Read, edit and author documents with the paged.* scripting layer.', href: '/docs/paged/scripting' },
        { question: 'Work from a terminal?', answer: 'Open, author, render, export and verify documents with the paged command.', href: '/docs/paged/cli' },
        { question: 'Extend the editor?', answer: 'Add tools, panels, commands and content types with the plugin SDK.', href: '/docs/paged/plugin-sdk' },
        { question: 'What works today?', answer: 'Every capability, the layers that implement it, and the tests behind it.', href: '/docs/paged/state' },
      ],
    },
    begin: {
      kicker: 'Where to begin / 02',
      title: ['Three ways', 'into Paged.'],
      cards: [
        { title: 'Overview', desc: 'What Paged is, and how the engine, the SDKs and the editor fit together.', href: '/docs/paged/overview' },
        { title: 'The engine', desc: 'How the parser and the renderer turn an IDML package into pages.', href: '/docs/paged/engine' },
        { title: 'Plugins', desc: 'The first-party content plugins, all built on the plugin SDK.', href: '/docs/paged/plugins' },
      ],
    },
  },
};

const copy = HOME[SITE_ID];
const pad = (n: number) => String(n).padStart(2, '0');

function Arrow() {
  return (
    <svg className="paged-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function Heading({ kicker, title, line }: { kicker: string; title: [string, string]; line?: string }) {
  return (
    <header className="paged-section-heading">
      <p className="paged-kicker">{kicker}</p>
      <h2>
        {title[0]}
        <br />
        <em>{title[1]}</em>
      </h2>
      {line ? <p className="paged-section-line">{line}</p> : null}
    </header>
  );
}

export default function HomePage() {
  return (
    <main className="paged-home">
      <JsonLd data={buildSiteJsonLd()} />

      <section className="paged-home-hero">
        <div className="paged-container paged-home-hero-grid">
          <div className="paged-home-hero-copy">
            <p className="paged-kicker">{copy.kicker}</p>
            <h1 className="paged-home-title">
              {copy.title[0]}
              <br />
              <em>{copy.title[1]}</em>
            </h1>
            <p className="paged-home-lede">{copy.lede}</p>
            <div className="paged-home-actions">
              <Link href={copy.start} className="paged-button is-primary">
                Start here <Arrow />
              </Link>
              <Link href={copy.browse.href} className="paged-button">
                {copy.browse.label} <Arrow />
              </Link>
            </div>
          </div>
          <aside className="paged-home-aside">
            <Frontispiece />
          </aside>
        </div>
      </section>

      <section className="paged-home-section">
        <div className="paged-container">
          <Heading {...copy.questions} />
          <ol className="paged-index">
            {copy.questions.rows.map((row, i) => (
              <li key={row.question} className="paged-index-item">
                <Link href={row.href} className="paged-index-row">
                  <span className="paged-index-num">{pad(i + 1)}</span>
                  <span className="paged-index-title">{row.question}</span>
                  <span className="paged-index-desc">{row.answer}</span>
                  <Arrow />
                </Link>
                {/* A second link sits beside the row, never inside it (a link in a link). */}
                {row.more ? (
                  <p className="paged-index-more">
                    <Link href={row.more.href}>{row.more.label}</Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="paged-home-section is-bridge">
        <div className="paged-container">
          <Heading kicker={copy.begin.kicker} title={copy.begin.title} />
          <div className="paged-bridge">
            {copy.begin.cards.map((card, i) => (
              <Link key={card.title} href={card.href} className="paged-bridge-card">
                <span className="paged-kicker">Where to begin / {pad(i + 1)}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <Arrow />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
