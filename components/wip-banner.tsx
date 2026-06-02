/**
 * Site-wide work-in-progress banner (briefing §8 / §11 Phase 0 soft-launch).
 * Public from day one, honest about it: pages without a difficulty label are
 * unfinished and `noindex`'d. Editorial treatment — a paper-soft strip with a
 * mono oxblood "Learning in public" mark, never an alarm-yellow alert.
 */
export function WipBanner() {
  return (
    <div
      role="status"
      style={{
        width: '100%',
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper-soft)',
        padding: '7px 16px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
        color: 'var(--color-ink-soft)',
      }}
    >
      <span
        style={{
          color: 'var(--color-accent)',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Learning in public
      </span>
      {' — this reference is being written in the open. Unfinished pages are excluded from search engines.'}
    </div>
  );
}
