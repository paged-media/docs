import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';
import { DifficultyLabel } from '@/components/mdx/difficulty-label';
import { RelatedAcrossPillars } from '@/components/mdx/related-across-pillars';
import { JsonLd } from '@/components/json-ld';
import { pageRobots } from '@/lib/metadata';
import { buildJsonLd, parseFaq, type BreadcrumbCrumb } from '@/lib/structured-data';
import { getChapterCrosslink } from '@/lib/generated';
import type { Tier, Diataxis, Status } from '@/lib/frontmatter';

type PageProps = { params: Promise<{ slug?: string[] }> };

/**
 * Auto cross-pillar block. The two references link into each other off the
 * generated graph (crosslinks.json), so authors don't hand-maintain links:
 *  - an IDML chapter index (/docs/idml/<chapter>) shows the Paged surfaces that
 *    act on that chapter;
 *  - a Paged developer page maps to the IDML chapters it operates on.
 * Returns null (renders nothing) when there's no cross-link for the page.
 */
function autoCrossLink(slug?: string[]) {
  if (!slug || slug.length < 2) return null;
  const [pillar, second] = slug;
  if (pillar === 'idml' && slug.length === 2) {
    // chapter index page → its Paged surfaces
    return <RelatedAcrossPillars chapter={second} />;
  }
  if (pillar === 'paged' && slug.length === 2) {
    const surface = second === 'sdk' ? 'sdk' : second === 'scripting' ? 'script' : null;
    if (surface) return <RelatedAcrossPillars surface={surface} />;
  }
  return null;
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
    url: page.url,
    dateModified: (page.data as { reviewed?: string }).reviewed,
    crumbs: breadcrumbs(params.slug, page.data.title, page.url),
    faq: parseFaq(processed),
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

// Home › Pillar › Section › Page — built from the route, with the chapter crumb
// titled from the cross-link graph when the page sits inside an IDML chapter.
function breadcrumbs(slug: string[] | undefined, title: string, url: string): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [{ name: 'Documentation', url: '/docs' }];
  if (!slug?.length) return crumbs;
  if (slug[0] === 'idml') crumbs.push({ name: 'IDML Reference', url: '/docs/idml' });
  else if (slug[0] === 'paged') crumbs.push({ name: 'Paged', url: '/docs/paged' });
  if (slug.length >= 3) {
    const chapter = getChapterCrosslink(slug[1]);
    crumbs.push({ name: chapter?.title ?? slug[1], url: `/docs/${slug[0]}/${slug[1]}` });
  }
  crumbs.push({ name: title, url });
  return crumbs;
}

export function generateStaticParams() {
  return source.generateParams();
}

// Which pillar a page belongs to — drives the title suffix and OG section, so
// search/AI results read "<Page> · IDML Reference" or "<Page> · Paged" instead
// of the old single-tree suffix.
function pillarSuffix(slug?: string[]): string {
  if (slug?.[0] === 'idml') return 'IDML Reference';
  if (slug?.[0] === 'paged') return 'Paged';
  return 'Paged';
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const suffix = pillarSuffix(params.slug);
  const absoluteTitle = params.slug?.length
    ? `${page.data.title} · ${suffix}`
    : 'Paged · The IDML Living Documentation';
  const description = page.data.description;

  return {
    title: { absolute: absoluteTitle },
    description,
    // Canonical (resolved against metadataBase) — trailing-slash output means the
    // canonical and the served URL agree, which matters for both SEO and GEO.
    alternates: { canonical: page.url },
    robots: pageRobots(page.data.status as Status),
    openGraph: {
      type: 'article',
      title: absoluteTitle,
      description,
      url: page.url,
      siteName: 'Paged',
    },
    twitter: {
      card: 'summary_large_image',
      title: absoluteTitle,
      description,
    },
  };
}
