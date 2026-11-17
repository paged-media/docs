import './global.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { RecordStrip } from '@/components/record-strip';
import PagedSearchDialog from '@/components/search-dialog';
import { Analytics, GoogleAnalytics } from '@/components/analytics';
import { site } from '@/lib/site';
import { OG_IMAGE } from '@/lib/metadata';

// The brand's two faces, self-hosted from app/fonts/ (README there: source,
// version, licence). Each exposes a CSS variable that app/brand.css puts first
// in its font roles; the mono is the brand's system stack. No font is fetched
// from a CDN at build or run time.
const newsreader = localFont({
  src: [
    { path: './fonts/newsreader-latin-opsz-wght-normal.woff2', style: 'normal', weight: '200 800' },
    { path: './fonts/newsreader-latin-opsz-wght-italic.woff2', style: 'italic', weight: '200 800' },
  ],
  display: 'swap',
  variable: '--font-newsreader',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
const dmSans = localFont({
  src: [
    { path: './fonts/dm-sans-latin-opsz-wght-normal.woff2', style: 'normal', weight: '100 1000' },
    { path: './fonts/dm-sans-latin-opsz-wght-italic.woff2', style: 'italic', weight: '100 1000' },
  ],
  display: 'swap',
  variable: '--font-dm-sans',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
});

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
    <html lang="en" className={`${newsreader.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {/* The reader's system setting picks paper or night (the `.dark` tokens
            in app/global.css); the theme switch overrides it. */}
        <RootProvider
          theme={{ defaultTheme: 'system', enableSystem: true }}
          // Our dialog (components/search-dialog.tsx): one row per page, kind
          // labels and filters, exact title matches first; static index.
          search={{ SearchDialog: PagedSearchDialog }}
        >
          {/* The record strip: the engine release, the capability record's
              date (marked "not current" past its age) and the status page. */}
          <RecordStrip />
          {children}
        </RootProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
