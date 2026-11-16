/**
 * <ActivityFeed /> — the interleaved cross-repo commit timeline, and
 * <RepoActivity repo="…" /> — one repo's recent commits. Generated from the
 * GitHub commit feed pulled at build time (`.generated/activity.json`), so it
 * shows the repositories as they stood at the last deploy, and says so: the
 * pull date leads the feed.
 *
 *   <ActivityFeed />            cross-repo timeline (default 40)
 *   <ActivityFeed limit={20} />
 *   <RepoActivity repo="core" />
 */
import Link from '@/components/site-link';
import { formatDay } from '@/lib/evidence';
import { getActivity, type Commit } from '@/lib/generated';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 11 };

function RepoChip({ repo }: { repo: string }) {
  return (
    <code
      style={{
        ...mono,
        background: 'color-mix(in srgb, var(--color-rule) 16%, transparent)',
        borderRadius: 3,
        padding: '0 6px',
        color: 'var(--color-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      {repo}
    </code>
  );
}

function Row({ c, showRepo }: { c: Commit; showRepo: boolean }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 45%, transparent)' }}>
      <span style={{ ...mono, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{c.date?.slice(0, 10)}</span>
      {showRepo && c.repo ? <RepoChip repo={c.repo} /> : null}
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, flex: 1 }}>
        <Link href={c.url} style={{ color: 'inherit', textDecoration: 'none' }}>
          {c.message}
        </Link>
      </span>
      <Link href={c.url} style={{ ...mono, color: 'var(--color-muted)', textDecoration: 'none' }}>
        {c.sha?.slice(0, 7)}
      </Link>
    </li>
  );
}

function Empty() {
  return (
    <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
      No activity data. Run <code>pnpm generate:docs</code>.
    </p>
  );
}

export function ActivityFeed({ limit = 40 }: { limit?: number }) {
  const { timeline, generatedAt, repoCount } = getActivity();
  if (!timeline.length) return <Empty />;
  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <div className="paged-activity-pulled">
        <p className="paged-activity-pulled-date">
          {generatedAt ? (
            <>
              Pulled from GitHub on <time dateTime={generatedAt}>{formatDay(generatedAt)}</time>
            </>
          ) : (
            'Pulled from GitHub when this site was built'
          )}
        </p>
        <p className="paged-activity-pulled-note">
          The latest commits across {repoCount} repositories, as they stood when this site was last built. The feed is
          only as fresh as the last deploy: anything committed since then is not listed yet.
        </p>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {timeline.slice(0, limit).map((c) => (
          <Row key={`${c.repo}-${c.sha}`} c={c} showRepo />
        ))}
      </ul>
    </div>
  );
}

export function RepoActivity({ repo, limit = 8 }: { repo: string; limit?: number }) {
  const { perRepo, generatedAt } = getActivity();
  const commits = perRepo[repo] ?? [];
  if (!commits.length) return <Empty />;
  return (
    <div className="not-prose" style={{ margin: '0.75rem 0' }}>
      {generatedAt ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)', margin: '0 0 0.25rem' }}>
          As pulled from GitHub on <time dateTime={generatedAt}>{formatDay(generatedAt)}</time>, when this site was
          last built.
        </p>
      ) : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {commits.slice(0, limit).map((c) => (
          <Row key={c.sha} c={{ ...c, repo }} showRepo={false} />
        ))}
      </ul>
    </div>
  );
}
