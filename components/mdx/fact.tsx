/**
 * <Fact id="sheet.functions" /> — a number or licence about the platform, read
 * from `.generated/facts.json` (gen-facts.mjs evaluates data/facts.json against
 * the pulled sources). Pages never type these by hand; check:facts enforces it.
 * An unknown id renders a visible marker rather than a plausible-looking number.
 */
import { getFacts } from '@/lib/generated';

export function Fact({ id }: { id: string }) {
  const f = getFacts().facts[id];
  if (!f) {
    return (
      <span title={`unknown fact ${id} — run pnpm generate:docs`} style={{ color: 'var(--warn)' }}>
        [{id}]
      </span>
    );
  }
  return <span title={`${f.label}${f.from ? ` · from ${f.from}` : ''}`}>{f.display}</span>;
}
