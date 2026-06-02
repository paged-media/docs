// The Paged masthead lockup: the `paged.` wordmark (Cormorant Garamond, the
// period is part of the mark) + a mono "IDML Reference" tagline. Sentence/lower
// case per the brand; the period is oxblood as the one accent touch.
export function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-3">
      <span
        className="paged-wordmark"
        style={{ fontSize: 26, lineHeight: 1 }}
      >
        paged<span style={{ color: 'var(--color-accent)' }}>.</span>
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        IDML&nbsp;Reference
      </span>
    </span>
  );
}
