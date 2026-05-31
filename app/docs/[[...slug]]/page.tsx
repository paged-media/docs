import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';
import { DifficultyLabel } from '@/components/mdx/difficulty-label';
import { pageRobots } from '@/lib/metadata';
import type { Tier, Diataxis, Status } from '@/lib/frontmatter';

type PageProps = { params: Promise<{ slug?: string[] }> };

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {/* Auto-rendered from frontmatter so the label can never disagree with it. */}
      <DifficultyLabel tier={page.data.tier as Tier} mode={page.data.diataxis as Diataxis} />
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    robots: pageRobots(page.data.status as Status),
  };
}
