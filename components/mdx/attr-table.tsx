import { SupportBadge, type SupportStatus } from './support-badge';

/**
 * A consistent element-reference table. A reference page declares an element's
 * attributes once as `rows`; names and value domains are facts (verified against
 * the spec's element reference), and `support` is the renderer's honest status.
 */
export interface AttrRow {
  /** Attribute name, exactly as it appears in IDML (a fact). */
  attr: string;
  /** Type / allowed values (a fact). */
  type: string;
  /** Renderer support for this attribute (omit if not meaningful per-attribute). */
  support?: SupportStatus;
  /** Short clean-room note: what it means / how we treat it. */
  note?: string;
}

export function AttrTable({ element, rows }: { element?: string; rows: AttrRow[] }) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border bg-fd-muted/50 text-left">
            <th className="px-3 py-2 font-medium">
              Attribute{element ? <span className="text-fd-muted-foreground"> · {element}</span> : null}
            </th>
            <th className="px-3 py-2 font-medium">Type / values</th>
            <th className="px-3 py-2 font-medium">Support</th>
            <th className="px-3 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.attr} className="border-b border-fd-border/60 align-top last:border-0">
              <td className="px-3 py-2 font-mono text-[0.8rem]">{r.attr}</td>
              <td className="px-3 py-2 font-mono text-[0.8rem] text-fd-muted-foreground">{r.type}</td>
              <td className="px-3 py-2">{r.support ? <SupportBadge status={r.support} compact /> : '—'}</td>
              <td className="px-3 py-2 text-fd-muted-foreground">{r.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
