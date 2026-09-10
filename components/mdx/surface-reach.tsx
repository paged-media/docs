/**
 * <SurfaceReach /> — what each programmable surface can actually reach.
 *
 * The index above names the surfaces and describes them. This answers the
 * question a reader arrives with: they all sound complete, so which one can
 * do the thing I want? Every number comes from the capability x surface
 * matrix, whose cells are derived from the gate that owns each surface —
 * nothing here is written by hand, including the reasons. Server component.
 */
import { getSurfaces, type SurfaceCounts } from '@/lib/generated';

/** Numerator for "reachable at all" — named plus the general door. */
function reach(c: SurfaceCounts): number {
  return c.named + c.generic;
}

function cell(c: SurfaceCounts, total: number): string {
  if (c.na === total) return '—';
  if (c.generic === 0) return `${c.named} of ${total}`;
  return `${c.named} named · ${c.generic} generic`;
}

export function SurfaceReach() {
  const data = getSurfaces();
  if (data.surfaces.length === 0) return null;

  return (
    <div className="not-prose" style={{ margin: '1.25rem 0' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px 8px 0', fontWeight: 640 }}>Surface</th>
              <th style={{ padding: '8px 10px', fontWeight: 640 }}>
                Authoring operations
                <span style={{ display: 'block', fontWeight: 400, opacity: 0.7, fontSize: 11.5 }}>
                  of {data.opCount}
                </span>
              </th>
              <th style={{ padding: '8px 10px', fontWeight: 640 }}>
                Message kinds
                <span style={{ display: 'block', fontWeight: 400, opacity: 0.7, fontSize: 11.5 }}>
                  of {data.kindCount}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.surfaces.map((s) => (
              <tr key={s.key} style={{ borderBottom: '1px solid var(--color-rule)', verticalAlign: 'top' }}>
                <td style={{ padding: '10px 10px 10px 0' }}>
                  {s.href ? (
                    <a href={s.href} style={{ color: 'inherit' }}>
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                </td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 }}>
                  {cell(s.ops, data.opCount)}
                  {s.ops.blocked > 0 && (
                    <span style={{ opacity: 0.7 }}> · {s.ops.blocked} not reachable</span>
                  )}
                </td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 }}>
                  {cell(s.kinds, data.kindCount)}
                  {s.kinds.blocked > 0 && (
                    <span style={{ opacity: 0.7 }}> · {s.kinds.blocked} not reachable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, opacity: 0.8, marginTop: 10 }}>
        <strong>named</strong> — a dedicated entry point spells the capability: a subcommand, a{' '}
        <code>paged.*</code> function, a typed method. <strong>generic</strong> — reachable through
        the surface&rsquo;s general door, so nothing is blocked but the caller supplies the wire
        name. <strong>not reachable</strong> — and every one of those carries a written reason
        upstream, because a surface that quietly cannot do something is the failure this table
        exists to prevent. <strong>&mdash;</strong> — structurally not applicable: the viewer SDK
        has no write surface by design.
      </p>
      {data.protocol !== null && (
        <p style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4, fontFamily: 'var(--font-mono, monospace)' }}>
          protocol {data.protocol} · {reach(data.surfaces[0].ops)} of {data.opCount} operations
          reachable from scripting
        </p>
      )}
    </div>
  );
}
