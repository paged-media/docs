import Script from 'next/script';

import { site } from '@/lib/site';

const DOMAIN = new URL(site.origin).host;

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

const GA_ID = 'G-LK286EZ3FX';

/**
 * Google Analytics 4 (gtag.js). Production-only so `next dev` doesn't pollute the
 * property with local hits; ships in the static export where
 * NODE_ENV is production. NOTE: GA4 sets cookies — unlike the cookieless
 * Plausible above, this carries a consent obligation in the EU.
 */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== 'production') return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-gtag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
