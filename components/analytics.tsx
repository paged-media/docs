import Script from 'next/script';

const DOMAIN = 'docs.paged.media';

/**
 * Cookieless, GDPR-friendly analytics (briefing §8). No consent banner. Plausible
 * by default — swap `src` / attributes for a self-hosted Plausible or Umami
 * without touching anything else. Env-gated so it no-ops in dev and preview;
 * only production sets NEXT_PUBLIC_ANALYTICS=1.
 */
export function Analytics() {
  if (process.env.NEXT_PUBLIC_ANALYTICS !== '1') return null;
  return <Script defer data-domain={DOMAIN} src="https://plausible.io/js/script.js" />;
}
