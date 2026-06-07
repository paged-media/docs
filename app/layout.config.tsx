import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { GithubInfoSafe } from '@/components/github-info-safe';
import { Wordmark } from '@/components/wordmark';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Wordmark />,
  },
  // Light-only (paper): the brand ships no dark palette, so the nav's
  // light/dark toggle is removed entirely.
  themeSwitch: { enabled: false },
  links: [
    {
      type: 'custom',
      // Stars/forks for the public renderer engine. Fetched at build time
      // (output: 'export' renders it once) and baked into the static HTML;
      // GITHUB_TOKEN (set in CI) lifts the API rate limit, and the Safe
      // wrapper degrades to a plain repo link if the API is unreachable.
      children: (
        <GithubInfoSafe owner="paged-media" repo="core" token={process.env.GITHUB_TOKEN} />
      ),
    },
  ],
  // Search uses the Fumadocs default (Orama) wired in app/api/search/route.ts.
};
