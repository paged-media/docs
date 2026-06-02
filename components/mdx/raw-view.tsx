import { highlight } from '@/lib/shiki';

/**
 * The "raw" view body (briefing §6.2): Shiki-highlighted source in the brand's
 * editorial XML palette. The panel chrome (border, path strip, copy) lives in
 * the Source Code Panel shell (`ExampleTabs`); this is just the code sheet, so
 * the `.shiki` element supplies its own paper-soft padding (see global.css).
 */
export async function RawView({ code, lang = 'xml' }: { code: string; lang?: string }) {
  const html = await highlight(code, lang);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
