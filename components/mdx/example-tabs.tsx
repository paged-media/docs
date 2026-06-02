'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { ExampleView } from '@/lib/examples';
import { Pic } from '@/components/icons';

const LABELS: Record<ExampleView, string> = {
  raw: 'Raw',
  annotated: 'Annotated',
  tree: 'Tree',
  live: 'Live',
};

/**
 * The Source Code Panel — the docs' signature component, ported from the brand
 * UI kit (`brand/ui_kits/docs/SourcePanel.jsx`): a code-specimen sheet with a
 * mono file-path strip, uppercase mono Raw / Annotated / Tree tabs (active = an
 * inset 2px ink underline), an oxblood copy action, and a paper-soft body inside
 * a 1px rule border (2px ink top for a `feature` panel). The Shiki-highlighted
 * panels are rendered on the server and passed in as `panels`; this client shell
 * owns the chrome + tab state + copy.
 */
export function ExampleTabs({
  caption,
  path,
  code,
  tabs,
  panels,
  feature,
}: {
  caption?: ReactNode;
  path?: string;
  code: string;
  tabs: ExampleView[];
  panels: Partial<Record<ExampleView, ReactNode>>;
  feature?: boolean;
}) {
  const [active, setActive] = useState<ExampleView>(tabs[0]);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const tabStyle = (selected: boolean): CSSProperties => ({
    appearance: 'none',
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 640,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '7px 8px',
    color: selected ? 'var(--color-ink)' : 'var(--color-muted)',
    boxShadow: selected ? 'inset 0 -2px 0 var(--color-ink)' : 'none',
  });

  return (
    <figure className="not-prose" style={{ margin: 'var(--space-5) 0' }}>
      {caption && (
        <figcaption
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            lineHeight: 1.45,
            color: 'var(--color-ink-soft)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {caption}
        </figcaption>
      )}
      <div
        style={{
          background: 'var(--color-paper-soft)',
          border: '1px solid var(--color-rule)',
          borderTop: feature ? '2px solid var(--color-ink)' : '1px solid var(--color-rule)',
          borderRadius: 2,
          color: 'var(--color-ink)',
          overflow: 'hidden',
        }}
      >
        {/* header / label strip — mono path on the left, views + copy on the right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            minHeight: 36,
            padding: '0 var(--space-3)',
            borderBottom: '1px solid var(--color-rule)',
            background: 'color-mix(in srgb, var(--color-paper-soft) 80%, var(--color-paper) 20%)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              lineHeight: 1,
              color: 'var(--color-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {path}
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <div role="tablist" aria-label="Source views" style={{ display: 'inline-flex', gap: 2 }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={active === tab}
                  onClick={() => setActive(tab)}
                  style={tabStyle(active === tab)}
                >
                  {LABELS[tab]}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              aria-label="Copy source"
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                lineHeight: 1,
                fontWeight: 640,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: copied ? 'var(--color-accent)' : 'var(--color-muted)',
                padding: '7px 0 7px 8px',
                transition: 'color 120ms',
              }}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.color = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.color = 'var(--color-muted)';
              }}
            >
              <Pic name={copied ? 'check' : 'page'} size={13} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* body — the active server-rendered panel */}
        <div style={{ overflowX: 'auto' }}>{panels[active]}</div>
      </div>
    </figure>
  );
}
