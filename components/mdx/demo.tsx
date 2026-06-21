'use client';
/**
 * <Demo> — embeds a live, scrubbable rrweb replay of the real editor doing a real
 * workflow, captured from the journey tests in CI (no hand-recorded screencasts).
 *
 *   <Demo demo="gradient" />   loads /demos/gradient.json (pulled from editor release assets)
 *   <Demo />                   the bundled synthetic sample (works before any capture exists)
 *
 * Client-only: DemoPlayer dynamically imports rrweb's core Replayer; this wrapper
 * owns the 'use client' boundary and the replay CSS.
 */
import 'rrweb/dist/style.css';
import { DemoPlayer } from '@paged-media/demo-replay/player';
import sample from './sample.demo.json';

export function Demo({
  demo,
  src,
  caption,
  width,
  autoPlay = false,
}: {
  demo?: string;
  src?: string;
  caption?: string;
  width?: number;
  autoPlay?: boolean;
}) {
  const resolvedSrc = src ?? (demo ? `/demos/${demo}.rrweb.json` : undefined);
  // No src and no demo id → play the bundled synthetic sample so the component is
  // demonstrable before the CI capture pipeline produces real sessions.
  const events = resolvedSrc ? undefined : ((sample as { events: unknown[] }).events as unknown[]);

  return (
    <figure className="not-prose paged-demo-figure" style={{ margin: '1.25rem 0' }}>
      <div
        style={{
          border: '1px solid var(--color-rule, #ddd)',
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--color-bg, #fff)',
        }}
      >
        <DemoPlayer
          src={resolvedSrc}
          events={events}
          autoPlay={autoPlay}
          width={width}
          showCaptions
        />
      </div>
      {caption ? (
        <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--color-muted)', marginTop: 6 }}>
          {caption}
        </figcaption>
      ) : null}
      <style>{`.paged-demo-caption{font-family:var(--font-sans);font-size:12px;color:var(--color-muted);padding:6px 2px 0;min-height:1.2em}`}</style>
    </figure>
  );
}
