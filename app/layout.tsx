import './global.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import {
  Newsreader,
  Source_Serif_4,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Cormorant_Garamond,
} from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { WipBanner } from '@/components/wip-banner';
import PagedSearchDialog from '@/components/search-dialog';
import { Analytics, GoogleAnalytics } from '@/components/analytics';
import { site, SITE_ID } from '@/lib/site';
import { OG_IMAGE } from '@/lib/metadata';

// The brand four-role type system, self-hosted by next/font (no CDN @import):
// Newsreader (display serif) · Source Serif 4 (reading serif) · IBM Plex Sans
// (UI) · IBM Plex Mono (code) · Cormorant Garamond (the `paged.` wordmark).
// Each exposes a CSS variable that app/brand.css points the --font-* tokens at.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-newsreader',
});
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-source-serif',
});
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

const fontVars = [
  newsreader.variable,
  sourceSerif.variable,
  plexSans.variable,
  plexMono.variable,
  cormorant.variable,
].join(' ');

export const metadata: Metadata = {
  title: {
    template: `%s · ${site.name}`,
    default: site.homeTitle,
  },
  description: site.description,
  metadataBase: new URL(site.origin),
  applicationName: site.name,
  // The brand registration mark (a printer's crop/registration target) as the
  // favicon — the project's printer's-mark identity.
  icons: { icon: '/brand/registration-mark.svg' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_US',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
  alternates: {
    types: { 'text/plain': '/llms.txt' },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {/* The IDML reference is a finished reference, not a build log: no banner there. */}
        {SITE_ID !== 'idml' && <WipBanner />}
        {/* Paper is the default; the theme switch offers night paper (the
            `.dark` tokens in app/global.css). */}
        <RootProvider
          theme={{ defaultTheme: 'light', enableSystem: false }}
          // Our dialog (components/search-dialog.tsx): one row per page, kind
          // labels and filters, exact title matches first; static index.
          search={{ SearchDialog: PagedSearchDialog }}
        >
          {children}
        </RootProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
