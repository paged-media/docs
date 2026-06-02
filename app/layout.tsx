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
import { Analytics } from '@/components/analytics';

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
    template: '%s · Paged IDML Reference',
    default: 'Paged · The IDML Living Documentation',
  },
  description:
    'An independent, living reference for the IDML file format and the Paged ' +
    'native renderer. Authored from first principles.',
  metadataBase: new URL('https://docs.paged.media'),
  // The brand registration mark (a printer's crop/registration target) as the
  // favicon — the project's printer's-mark identity.
  icons: { icon: '/brand/registration-mark.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <WipBanner />
        {/* Light-only (paper): the brand ships no dark palette, so the theme
            toggle is disabled and the page is forced to the light theme. */}
        <RootProvider
          theme={{ enabled: false, defaultTheme: 'light', forcedTheme: 'light' }}
          search={{ options: { type: 'static' } }}
        >
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
