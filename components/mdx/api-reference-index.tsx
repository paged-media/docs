/**
 * <ApiReferenceIndex /> — the API hub. A card grid over every generated API
 * surface, with live counts pulled from the generated catalogs so the numbers
 * never drift. Server component.
 */
import { getScripting, getSdkCatalog, getRestApi, getPluginCapabilities } from '@/lib/generated';

interface Card {
  title: string;
  href: string;
  count: string;
  blurb: string;
}

export function ApiReferenceIndex() {
  const scripting = getScripting();
  const sdk = getSdkCatalog();
  const rest = getRestApi();
  const plugin = getPluginCapabilities();

  const cards: Card[] = [
    {
      title: 'Scripting (paged.*)',
      href: '/docs/paged/scripting/host-functions',
      count: `${scripting.hostFunctionCount} functions · ${scripting.settablePathCount} paths`,
      blurb: 'The Boa host API for inspecting and authoring the open document — every function and settable path, generated from the engine catalog.',
    },
    {
      title: 'Viewer SDK',
      href: '/docs/paged/sdk/api-reference',
      count: `${sdk.memberCount} members`,
      blurb: `The full ${sdk.package} surface — viewer lifecycle, camera, navigation, rendering, events, and every exported type.`,
    },
    {
      title: 'REST API',
      href: '/docs/paged/api/rest',
      count: `${rest.endpointCount} endpoints`,
      blurb: 'The editor-server HTTP API — documents, assets, auth, and billing — generated from its OpenAPI spec.',
    },
    {
      title: 'Plugin manifest',
      href: '/docs/paged/plugin-sdk',
      count: `${plugin.capabilities.length} capabilities`,
      blurb: 'The declarative contract a plugin bundle ships — capabilities, contributions, and manifest fields.',
    },
  ];

  return (
    <div
      className="not-prose"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, margin: '1.25rem 0' }}
    >
      {cards.map((c) => (
        <a
          key={c.title}
          href={c.href}
          style={{
            display: 'block',
            textDecoration: 'none',
            color: 'inherit',
            border: '1px solid var(--color-rule)',
            borderRadius: 6,
            padding: '14px 16px',
            background: 'var(--color-paper-soft, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 16, fontWeight: 640 }}>{c.title}</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11.5,
              color: 'var(--color-accent)',
              margin: '3px 0 7px',
            }}
          >
            {c.count}
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-ink-soft, var(--color-muted))', margin: 0, lineHeight: 1.45 }}>
            {c.blurb}
          </p>
        </a>
      ))}
    </div>
  );
}
