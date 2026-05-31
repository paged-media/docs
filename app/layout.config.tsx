import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { GithubInfo } from 'fumadocs-ui/components/github-info';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Paged · IDML Reference',
  },
  links: [
    {
      type: 'custom',
      // Stars/forks for the public renderer engine. GithubInfo fetches at build
      // time (output: 'export' renders it once), so the count is baked into the
      // static HTML; GITHUB_TOKEN (set in CI) lifts the API rate limit.
      children: (
        <GithubInfo owner="paged-media" repo="core" token={process.env.GITHUB_TOKEN} />
      ),
    },
  ],
  // Search uses the Fumadocs default (Orama) wired in app/api/search/route.ts.
};
