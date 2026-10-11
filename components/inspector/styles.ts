import type { CSSProperties } from 'react';

/**
 * The inspector's shared chrome, in brand tokens: the Source Code Panel sheet
 * (components/mdx/example-tabs.tsx) for every pane, uppercase sans labels, and
 * the SDK playground's toolbar buttons.
 */
export const sheet: CSSProperties = {
  background: 'var(--color-paper-soft)',
  border: '1px solid var(--color-rule)',
  borderRadius: 2,
  color: 'var(--color-ink)',
  overflow: 'hidden',
  minWidth: 0,
};

export const strip: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 'var(--space-2) var(--space-3)',
  minHeight: 36,
  padding: '4px var(--space-3)',
  borderBottom: '1px solid var(--color-rule)',
  background: 'color-mix(in srgb, var(--color-paper-soft) 80%, var(--color-paper) 20%)',
};

export const label: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-muted)',
};

export const mono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  letterSpacing: '-0.01em',
};

export const btn: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12.5,
  padding: '4px 9px',
  border: '1px solid var(--color-rule)',
  borderRadius: 4,
  background: 'var(--color-paper)',
  color: 'var(--color-ink)',
  cursor: 'pointer',
};

export const muted: CSSProperties = { color: 'var(--color-muted)' };

/** An uppercase tab in a strip; the active one carries the inset ink underline. */
export function tab(selected: boolean): CSSProperties {
  return {
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
    padding: '9px 8px',
    color: selected ? 'var(--color-ink)' : 'var(--color-muted)',
    boxShadow: selected ? 'inset 0 -2px 0 var(--color-ink)' : 'none',
  };
}
