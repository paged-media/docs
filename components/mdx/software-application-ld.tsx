/**
 * <SoftwareApplicationLd> — emits schema.org SoftwareApplication JSON-LD for
 * Paged, for the comparison/landing pages. Helps search + generative engines bind
 * a stable entity to "Paged" (entity consistency is a GEO lever). Hand-placed on
 * the pages where it makes sense rather than injected everywhere.
 */
import { JsonLd } from '@/components/json-ld';

export function SoftwareApplicationLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Paged',
    applicationCategory: 'Desktop publishing software',
    applicationSubCategory: 'IDML editor',
    operatingSystem: 'Web, Windows, macOS, Linux',
    description:
      'Paged is an open-source desktop publishing platform built on a structurally valid IDML container, with a plugin SDK and an automation-first architecture — combining the open format of Scribus with the extensibility of the InDesign ecosystem.',
    url: 'https://paged.media',
    softwareHelp: 'https://docs.paged.media',
    license: 'https://spdx.org/licenses/MPL-2.0.html',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  return <JsonLd data={data} />;
}
