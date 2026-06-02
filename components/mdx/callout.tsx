import type { ReactNode } from 'react';
import { Pic } from '@/components/icons';

/**
 * The brand Note (Components.jsx) standing in for the Fumadocs Callout: a left
 * rule (ink, or oxblood/warn/valid by kind), a paper-soft fill, a section-label
 * heading in IBM Plex Sans, and a sans body. Crisp corners, rules over shadows.
 * Registered as both `Callout` and `Note` so authors can reach for either.
 */
type Kind = 'info' | 'note' | 'warn' | 'warning' | 'error' | 'success' | 'renderer';

const KINDS: Record<Kind, { color: string; icon: string; label: string }> = {
  info: { color: 'var(--color-ink)', icon: 'renderer', label: 'Note' },
  note: { color: 'var(--color-ink)', icon: 'renderer', label: 'Note' },
  renderer: { color: 'var(--color-accent)', icon: 'renderer', label: 'Renderer note' },
  warn: { color: 'var(--warn)', icon: 'baseline', label: 'Caution' },
  warning: { color: 'var(--warn)', icon: 'baseline', label: 'Caution' },
  error: { color: 'var(--color-accent)', icon: 'baseline', label: 'Important' },
  success: { color: 'var(--valid)', icon: 'check', label: 'Note' },
};

export function Callout({
  title,
  type = 'info',
  icon,
  children,
}: {
  title?: ReactNode;
  type?: Kind;
  icon?: string;
  children?: ReactNode;
}) {
  const k = KINDS[type] ?? KINDS.info;
  return (
    <div
      className="not-prose"
      style={{
        borderLeft: `2px solid ${k.color}`,
        background: 'var(--color-paper-soft)',
        padding: 'var(--space-3) var(--space-4)',
        margin: 'var(--space-5) 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pic name={icon ?? k.icon} size={15} color={k.color} />
        <span className="section-label" style={{ color: k.color }}>
          {title ?? k.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--color-ink-soft)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Alias — the brand calls this a Note; same component. */
export const Note = Callout;
