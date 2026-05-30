import './global.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { WipBanner } from '@/components/wip-banner';
import { Analytics } from '@/components/analytics';

export const metadata: Metadata = {
  title: {
    template: '%s · Paged IDML Reference',
    default: 'Paged · The IDML Living Documentation',
  },
  description:
    'An independent, living reference for the IDML file format and the Paged ' +
    'native renderer. Authored from first principles.',
  metadataBase: new URL('https://docs.paged.media'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <WipBanner />
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
