/**
 * <XRef> — an inline cross-pillar prose link with a small directional marker, so
 * a sentence in the IDML reference can point into Paged (and back) without a bare
 * URL. The `to` prop uses a pillar-prefixed target:
 *
 *   <XRef to="paged:scripting/host-functions">paged.insertText</XRef>
 *   <XRef to="idml:stories-text">stories</XRef>
 *
 * `scripts/check-feature-refs.mjs` validates every `to` resolves to a real page,
 * so a renamed or removed page fails the build instead of rotting into a 404.
 */
import Link from 'fumadocs-core/link';

export function xrefHref(to: string): string {
  const [pillar, ...rest] = to.split(':');
  const path = rest.join(':').replace(/^\/+/, '');
  if (pillar === 'idml' || pillar === 'paged') return `/docs/${pillar}/${path}`;
  // Already a normal path — pass through.
  return to.startsWith('/') ? to : `/${to}`;
}

export function XRef({ to, children }: { to: string; children?: React.ReactNode }) {
  return (
    <Link href={xrefHref(to)} style={{ whiteSpace: 'nowrap' }} data-xref={to}>
      {children ?? to}
      <span aria-hidden style={{ opacity: 0.55, fontSize: '0.85em', marginLeft: 1 }}>↗</span>
    </Link>
  );
}
