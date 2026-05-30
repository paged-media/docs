import { highlight } from '@/lib/shiki';
import { CopyButton } from './copy-button';

/** Syntax-highlighted source with a copy button (briefing §6.2 "raw" view). */
export async function RawView({ code, lang = 'xml' }: { code: string; lang?: string }) {
  const html = await highlight(code, lang);
  return (
    <figure className="not-prose group relative overflow-hidden rounded-lg border border-fd-border">
      <CopyButton text={code} />
      <div className="overflow-x-auto p-4 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
