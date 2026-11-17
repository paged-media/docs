import { FOOTER_COLUMNS, FOOTER_STRAP, HOME_HREF, localHref } from '@/lib/masthead-nav';

/**
 * The footer paged.media, docs.paged.media and idml.paged.media share (the V5
 * dark footer, docs/adr/810-next-edition-chrome.md): on night, the `Paged.`
 * wordmark and its strap, then Discover / Make / Understand
 * (lib/masthead-nav.ts), then the colophon: who makes Paged, the independence
 * note, the licences.
 *
 * The full footer closes the two home pages, with the project's mission under
 * the strap. Every docs page gets the `compact` variant: the same columns and
 * colophon in a shorter band, so a reader at the end of an article is not
 * handed the mission statement again. Styles: app/editorial.css.
 */
export function SiteFooter({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const full = variant === 'full';
  return (
    <footer className={full ? 'paged-footer' : 'paged-footer is-compact'}>
      <div className="paged-footer-inner">
        <div className="paged-footer-top">
          <div className="paged-footer-brand">
            <a className="paged-wordmark paged-footer-mark" href={HOME_HREF} aria-label="Paged. — paged.media">
              Paged<b>.</b>
            </a>
            <p className="paged-footer-strap">{FOOTER_STRAP}</p>
            {full ? (
              <p className="paged-footer-mission">
                Paged brings enterprise desktop publishing to the web: an open-source IDML parser and renderer at its
                core, and the open reference for the format, built in the browser with WebGPU and WebAssembly.
              </p>
            ) : null}
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} className="paged-footer-col" aria-label={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={localHref(link.href)}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="paged-footer-bottom">
          <p>
            Paged and paged.media are an open project from{' '}
            <a href="https://andthenext.at" rel="noreferrer noopener">
              And The Next GmbH
            </a>
            .
          </p>
          {full ? (
            <p>
              Paged is an independent open-source project and is not affiliated with, endorsed by, or sponsored by
              Adobe Inc. IDML and InDesign are referenced solely for interoperability and descriptive purposes. We are
              deeply grateful to Adobe for opening up the IDML format for exchange, and thank them wholeheartedly for
              making projects like this possible.
            </p>
          ) : (
            <p>
              Independent, and not affiliated with, endorsed by, or sponsored by Adobe Inc.; IDML and InDesign are named
              for interoperability only.
            </p>
          )}
          <p>
            Documentation content <strong>CC&nbsp;BY&nbsp;4.0</strong>; site code <strong>MIT</strong>. Set in
            Newsreader and DM&nbsp;Sans. ©&nbsp;2026 And The Next GmbH
          </p>
        </div>
      </div>
    </footer>
  );
}
