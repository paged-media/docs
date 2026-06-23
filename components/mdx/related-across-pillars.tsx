/**
 * <RelatedAcrossPillars> — the bridge between the two references. It reads the
 * generated cross-link graph (.generated/crosslinks.json, derived from the shared
 * capability registry) so the links are LIVE: when the engine gains a scripting
 * or SDK surface for a construct, the link appears on the next build. Nothing
 * here is hand-maintained.
 *
 * Two modes:
 *   <RelatedAcrossPillars chapter="stories-text" />   — on an IDML page; shows the
 *       Paged surfaces (scripting, SDK, plugins, state) that act on this chapter.
 *   <RelatedAcrossPillars surface="sdk" />            — on a Paged developer page;
 *       shows the IDML chapters that surface acts on.
 *
 * Auto-injected by app/docs/[[...slug]]/page.tsx on chapter index pages, so most
 * pages get it for free; can also be placed by hand anywhere in MDX.
 */
import Link from 'fumadocs-core/link';
import { Pic } from '@/components/icons';
import { getChapterCrosslink, getCrosslinks } from '@/lib/generated';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside
      className="not-prose"
      style={{
        margin: '2rem 0 0.5rem',
        padding: '0.9rem 1.1rem',
        border: '1px solid var(--color-rule, #e4e0d8)',
        borderRadius: 6,
        background: 'color-mix(in srgb, var(--color-rule, #e4e0d8) 12%, transparent)',
      }}
    >
      <p
        style={{
          margin: '0 0 0.6rem',
          fontFamily: 'var(--font-sans)',
          fontSize: 10.5,
          fontWeight: 680,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>{children}</ul>
    </aside>
  );
}

function Row({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <li style={{ margin: 0 }}>
      <Link
        href={href}
        style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: 14 }}
      >
        <span style={{ position: 'relative', top: 2, color: 'var(--color-rule-strong, var(--color-muted))' }}>
          <Pic name="arrowRight" size={14} />
        </span>
        <span>
          <span style={{ fontWeight: 600, color: 'var(--color-ink, inherit)' }}>{label}</span>
          {hint ? <span style={{ color: 'var(--color-muted)' }}> — {hint}</span> : null}
        </span>
      </Link>
    </li>
  );
}

export function RelatedAcrossPillars({ chapter, surface }: { chapter?: string; surface?: string }) {
  // ── IDML page → the Paged surfaces that act on this chapter ──
  if (chapter) {
    const c = getChapterCrosslink(chapter);
    if (!c || c.pagedSurfaces.length === 0) return null;
    return (
      <Shell title="In Paged — the platform">
        {c.pagedSurfaces.map((s) => (
          <Row key={s.key} href={s.url} label={s.label} hint={s.note} />
        ))}
      </Shell>
    );
  }

  // ── Paged developer page → the IDML chapters this surface acts on ──
  if (surface) {
    const cl = getCrosslinks();
    const s = cl.surfaces[surface];
    if (!s || s.chapters.length === 0) return null;
    return (
      <Shell title="In the IDML Reference — the format">
        {s.chapters.map((ch) => {
          const meta = cl.chapters[ch];
          return <Row key={ch} href={meta?.idmlUrl ?? `/docs/idml/${ch}`} label={meta?.title ?? ch} />;
        })}
      </Shell>
    );
  }

  return null;
}
