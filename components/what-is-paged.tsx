/**
 * "What is Paged" — the project's mission statement, shown at the bottom of every
 * page via {@link SiteFooter}. Authored content owned by the Paged team
 * (source: thoughts/docs/paged/docs/content/what-is-paged.md). Its closing
 * paragraph is the site's vendor disclaimer, so no separate attribution line is
 * needed alongside it.
 */
export function WhatIsPaged() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 leading-relaxed">
      <p>
        <strong className="text-fd-foreground">Paged</strong> brings enterprise
        Desktop Publishing directly to the web. No more bloated applications. No
        more hidden, proprietary technologies. Just as Scribus and others
        democratized DTP before it, Paged sets out to open this domain up to
        everyone — leveraging modern technologies like{' '}
        <strong className="text-fd-foreground">WebGPU</strong> and{' '}
        <strong className="text-fd-foreground">WebAssembly</strong> to deliver
        professional-grade publishing performance natively in the browser.
      </p>
      <p>
        At its core, Paged is an{' '}
        <strong className="text-fd-foreground">
          open-source IDML parser and renderer
        </strong>
        . It reads IDML files, parses them, and renders them faithfully on the
        web.
      </p>
      <p>
        Paged also aims to be the{' '}
        <strong className="text-fd-foreground">open IDML reference</strong> — an
        easily accessible, authoritative resource providing deep insight into the
        structure and inner workings of the IDML format, which has long been
        underdocumented and locked behind proprietary tooling.
      </p>
      <p>
        Three things working in concert: a mission to democratize Desktop
        Publishing for the web era, a faithful open IDML engine, and the
        definitive open reference for the format.
      </p>
      <p>
        <strong className="text-fd-foreground">Paged</strong> and{' '}
        <strong className="text-fd-foreground">paged.media</strong> are an open
        project from{' '}
        <a
          href="https://andthenext.at"
          rel="noreferrer noopener"
          className="underline underline-offset-4 hover:text-fd-foreground"
        >
          And The Next GmbH
        </a>
        . Find the repositories at{' '}
        <a
          href="https://github.com/paged-media"
          rel="noreferrer noopener"
          className="underline underline-offset-4 hover:text-fd-foreground"
        >
          github.com/paged-media
        </a>
        .
      </p>
      <hr className="my-1 border-fd-border" />
      <p className="text-xs italic">
        Paged is an independent open-source project and is not affiliated with,
        endorsed by, or sponsored by Adobe Inc. IDML and InDesign are referenced
        solely for interoperability and descriptive purposes. We are deeply
        grateful to Adobe for opening up the IDML format for exchange, and thank
        them wholeheartedly for making projects like this possible.
      </p>
    </section>
  );
}
