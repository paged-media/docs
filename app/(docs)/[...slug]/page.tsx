import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';
import { DifficultyLabel } from '@/components/mdx/difficulty-label';
import { RelatedAcrossPillars } from '@/components/mdx/related-across-pillars';
import { JsonLd } from '@/components/json-ld';
import { pageRobots, canonicalPath, OG_IMAGE } from '@/lib/metadata';
import { buildJsonLd, parseFaq, type BreadcrumbCrumb } from '@/lib/structured-data';
import { parseGlossary } from '@/lib/glossary';
import { getChapterCrosslink } from '@/lib/generated';
import { site, SITE_ID } from '@/lib/site';
import type { Tier, Diataxis, Status } from '@/lib/frontmatter';

type PageProps = { params: Promise<{ slug: string[] }> };

/**
 * Auto cross-site block. The two sites link into each other off the generated
 * graph (crosslinks.json), so authors don't hand-maintain links:
 *  - an IDML chapter index (idml.paged.media/<chapter>/) shows the Paged
 *    surfaces that act on that chapter;
 *  - a Paged developer page maps to the IDML chapters it operates on.
 * Returns null (renders nothing) when there's no cross-link for the page.
 */
function autoCrossLink(slug: string[]) {
  if (slug.length !== 1) return null;
  const [chapter] = slug;
  if (SITE_ID === 'idml') return <RelatedAcrossPillars chapter={chapter} />;
  const surface = chapter === 'sdk' ? 'sdk' : chapter === 'scripting' ? 'script' : null;
  return surface ? <RelatedAcrossPillars surface={surface} /> : null;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  // Structured data, generated from the page's own Markdown + frontmatter.
  const processed = await page.data.getText('processed').catch(() => '');
  const jsonLd = buildJsonLd({
    title: page.data.title,
    description: page.data.description,
    url: canonicalPath(page.url),
    dateModified: (page.data as { reviewed?: string }).reviewed,
    tier: page.data.tier as Tier,
    crumbs: breadcrumbs(params.slug, page.data.title, page.url),
    faq: parseFaq(processed),
    // The glossary's entries become a DefinedTermSet (lib/glossary.ts).
    terms: params.slug.length === 1 && params.slug[0] === 'glossary' ? parseGlossary(processed) : undefined,
  });

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <JsonLd data={jsonLd} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {/* Auto-rendered from frontmatter so the label can never disagree with it. */}
      <DifficultyLabel tier={page.data.tier as Tier} mode={page.data.diataxis as Diataxis} />
      <DocsBody>
        <MDX components={getMDXComponents()} />
        {autoCrossLink(params.slug)}
      </DocsBody>
    </DocsPage>
  );
}

// Site › Chapter › Page — built from the route, the chapter crumb titled from
// its own index page (or the cross-link graph when it has none).
function breadcrumbs(slug: string[], title: string, url: string): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [{ name: site.name, url: '/' }];
  if (slug.length >= 2) {
    const chapterUrl = `/${slug[0]}`;
    const chapterTitle =
      source.getPage([slug[0]])?.data.title ?? getChapterCrosslink(slug[0])?.title ?? slug[0];
    crumbs.push({ name: chapterTitle, url: canonicalPath(chapterUrl) });
  }
  crumbs.push({ name: title, url: canonicalPath(url) });
  return crumbs;
}

// The root (`[]`) is the home page (app/(home)), not a docs page.
export function generateStaticParams() {
  return source.generateParams().filter((p) => p.slug.length > 0);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const title = `${page.data.title} · ${site.name}`;
  const description = page.data.description;
  const url = canonicalPath(page.url);

  return {
    title: { absolute: title },
    description,
    // Canonical (resolved against metadataBase) with the trailing slash the
    // export serves, so the canonical and the served URL are the same string.
    alternates: { canonical: url },
    robots: pageRobots(page.data.status as Status),
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: site.name,
      locale: 'en_US',
      images: [OG_IMAGE],
      ...((page.data as { reviewed?: string }).reviewed
        ? { modifiedTime: (page.data as { reviewed?: string }).reviewed }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
