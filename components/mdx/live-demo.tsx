/**
 * <LiveDemo script="draw-fill" /> — the real editor running one of the
 * playground's demo scripts, on a click (the client island is
 * live-demo-client.tsx). The stage shows `public/demos/<script>.webp`, a
 * recorded frame of the demo, until Run, and instead of it where the browser
 * has no WebGPU; without that still it says what Run does.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LiveDemoClient } from './live-demo-client';

export function demoPoster(id: string): string | null {
  return existsSync(join(process.cwd(), 'public', 'demos', `${id}.webp`)) ? `/demos/${id}.webp` : null;
}

export function LiveDemo(props: { script: string; title?: string; caption?: string; height?: number; autoplay?: boolean }) {
  return <LiveDemoClient {...props} poster={demoPoster(props.script)} />;
}
