import { GithubInfo } from 'fumadocs-ui/components/github-info';

/**
 * GithubInfo, but a build that cannot reach api.github.com (rate limit,
 * outage) degrades to a plain repo link instead of failing the whole
 * static export. GithubInfo fetches during SSG; with `output: 'export'`
 * a thrown fetch error is fatal for every prerendered page — the public
 * docs build must not depend on GitHub API availability.
 */
export async function GithubInfoSafe(props: {
  owner: string;
  repo: string;
  token?: string;
}) {
  try {
    // Probe with the same auth GithubInfo will use; if it fails, fall back.
    const res = await fetch(
      `https://api.github.com/repos/${props.owner}/${props.repo}`,
      {
        headers: props.token ? { Authorization: `Bearer ${props.token}` } : {},
        cache: 'force-cache',
      },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return <GithubInfo {...props} />;
  } catch {
    return (
      <a
        href={`https://github.com/${props.owner}/${props.repo}`}
        rel="noreferrer noopener"
        target="_blank"
        className="text-sm text-fd-muted-foreground hover:text-fd-accent-foreground"
      >
        {props.owner}/{props.repo}
      </a>
    );
  }
}
