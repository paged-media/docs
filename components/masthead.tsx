import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import {
  HOME_HREF,
  MASTHEAD_ACTION,
  MASTHEAD_NAV,
  MASTHEAD_TOOLS,
  TAGLINE,
  isCurrentSite,
  localHref,
  type ChromeLink,
} from '@/lib/masthead-nav';

/**
 * The masthead paged.media, docs.paged.media and idml.paged.media share
 * (docs/adr/810-next-edition-chrome.md): the `Paged.` wordmark, the line beside
 * it, the five sections (this site's marked with the red rule and
 * aria-current), the tools, search, the theme switch and the red "Open editor".
 * Sticky, paper at .965 over an 18px blur, a 1px ink rule under it.
 *
 * It replaces Fumadocs' own nav title and links; the docs sidebar and its
 * phone drawer stay Fumadocs' (app/(docs)/layout.tsx). Search is Fumadocs'
 * trigger (`button[data-search-full]`), opening components/search-dialog.tsx;
 * the theme switch is Fumadocs' too (`[data-theme-toggle]`).
 *
 * On a phone it is the wordmark, search and a menu: a <details>, so it opens
 * without JavaScript, holding the sections, the tools and the theme switch.
 * Every link is a plain <a>: each is another site or this site's front page.
 */
function NorthEast() {
  return (
    <svg className="paged-masthead-ne" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SectionLink({ link }: { link: ChromeLink }) {
  const current = isCurrentSite(link);
  return (
    <a
      className={current ? 'paged-masthead-link is-current' : 'paged-masthead-link'}
      href={localHref(link.href)}
      aria-current={current ? 'true' : undefined}
    >
      {link.label}
    </a>
  );
}

export function Masthead() {
  const [library, studio, atlas] = MASTHEAD_TOOLS;
  return (
    <header className="paged-masthead" data-masthead="">
      <div className="paged-masthead-inner">
        <a className="paged-wordmark paged-masthead-mark" href={HOME_HREF} aria-label="Paged. — paged.media">
          Paged<b>.</b>
        </a>
        <span className="paged-masthead-tagline">{TAGLINE}</span>
        <nav className="paged-masthead-nav" aria-label="Paged" data-masthead-nav="">
          {MASTHEAD_NAV.map((link) => (
            <SectionLink key={link.label} link={link} />
          ))}
        </nav>
        <div className="paged-masthead-tools">
          <a className="paged-masthead-tool is-library" href={localHref(library.href)}>
            {library.label}
          </a>
          <a className="paged-masthead-tool is-studio" href={localHref(studio.href)}>
            {studio.label}
            <NorthEast />
          </a>
          <a className="paged-masthead-tool is-atlas" href={localHref(atlas.href)}>
            {atlas.label}
            <NorthEast />
          </a>
          <FullSearchTrigger className="paged-masthead-search" />
          <ThemeSwitch mode="light-dark-system" className="paged-masthead-theme" />
          <a className="paged-masthead-action" href={MASTHEAD_ACTION.href}>
            {MASTHEAD_ACTION.label}
            <NorthEast />
          </a>
          <details className="paged-masthead-menu">
            <summary aria-label="Menu">
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M3 6h14M3 10h14M3 14h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </summary>
            <div className="paged-masthead-sheet">
              <nav aria-label="Paged, on a small screen">
                {[...MASTHEAD_NAV, ...MASTHEAD_TOOLS].map((link) => (
                  <SectionLink key={link.label} link={link} />
                ))}
                <a className="paged-masthead-link is-action" href={MASTHEAD_ACTION.href}>
                  {MASTHEAD_ACTION.label} <NorthEast />
                </a>
              </nav>
              <div className="paged-masthead-sheet-theme">
                <span>Theme</span>
                <ThemeSwitch mode="light-dark-system" className="paged-masthead-theme" />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
