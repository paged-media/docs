import type { ReactNode } from 'react';

/**
 * "What Gutenberg would say" — the brand frontispiece aside (Components.jsx):
 * the engraved Gutenberg portrait beside a display-serif reflection, framed with
 * a 2px ink top rule. An opt-in MDX component for pages that want a moment of
 * editorial voice; the brand-voice quote belongs in the page, not the chrome.
 */
export function GutenbergAside({
  children,
  label = 'What Gutenberg would say',
}: {
  children?: ReactNode;
  label?: string;
}) {
  return (
    <aside
      className="not-prose"
      style={{
        display: 'grid',
        gridTemplateColumns: '112px 1fr',
        gap: 'var(--space-5)',
        alignItems: 'start',
        background: 'var(--color-paper-soft)',
        border: '1px solid var(--color-rule)',
        borderTop: '2px solid var(--color-ink)',
        borderRadius: 2,
        padding: 'var(--space-5)',
        margin: 'var(--space-6) 0',
      }}
    >
      <div
        style={{
          width: 112,
          height: 112,
          borderRadius: '50%',
          background: 'var(--color-paper)',
          border: '1px solid var(--color-rule)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/gutenberg.svg"
          alt="Engraved portrait of Johannes Gutenberg"
          width={112}
          height={112}
          style={{ display: 'block', width: '108%', height: '108%', objectFit: 'contain' }}
        />
      </div>
      <div>
        <div className="section-label" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-text-serif)',
            fontSize: 20,
            lineHeight: 1.46,
            color: 'var(--color-ink)',
            textWrap: 'pretty',
          }}
        >
          {children}
        </div>
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-rule)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: 'var(--color-rule-strong)' }}>—</span>
          <span className="type-meta">In the spirit of Johannes Gutenberg · c. 1400–1468 · Mainz</span>
        </div>
      </div>
    </aside>
  );
}
