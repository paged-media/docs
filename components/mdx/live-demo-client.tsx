'use client';
/**
 * <LiveDemo>'s client island (the server wrapper is live-demo.tsx): the REAL
 * editor running a demo script inline, via the playground (play.paged.media),
 * driven by its own scripting layer, scrubbable and interactive.
 *
 *   play.paged.media/?script=<id>&autoplay
 *
 * The live path needs this docs page cross-origin-isolated (COOP/COEP via
 * _headers, so the iframe inherits SharedArrayBuffer) and WebGPU. Click to
 * load: an embedded editor is heavy, so the iframe mounts on Run, and several
 * demos can sit on one page without booting N editors. Until then, and in a
 * browser without WebGPU, the stage shows the demo's recorded poster
 * (public/demos/<id>.webp), or, until one is recorded, says what Run does.
 * The origin is NEXT_PUBLIC_PLAYGROUND_URL (inlined at build), else production.
 *
 * With `sampleKind`, Run first reads the sample catalog on the module host and
 * picks the smallest sample of that kind; the playground opens it
 * (`?sample=<id>`) and the script, if any, tours it once it is open. Nothing
 * is asked of either host before Run.
 */
import { useEffect, useState } from 'react';

const PLAYGROUND_ORIGIN = process.env.NEXT_PUBLIC_PLAYGROUND_URL || 'https://play.paged.media';
const SAMPLES_CATALOG = process.env.NEXT_PUBLIC_SAMPLES_CATALOG || 'https://modules.paged.media/samples/catalog.json';

/** The smallest sample of `kind` in the catalog, or null. */
async function sampleOfKind(kind: string): Promise<{ id: string; title: string } | null> {
  const r = await fetch(SAMPLES_CATALOG);
  if (!r.ok) return null;
  const c = (await r.json()) as { samples?: Array<{ id: string; title: string; kind?: string; bytes?: number }> };
  const of = (c.samples ?? []).filter((s) => s.kind === kind).sort((a, b) => (a.bytes ?? 0) - (b.bytes ?? 0));
  return of[0] ?? null;
}

const playUrl = (script: string | undefined, sample: string | undefined) => {
  const q = [sample ? `sample=${encodeURIComponent(sample)}` : null, script ? `script=${encodeURIComponent(script)}` : null].filter(Boolean);
  return `${PLAYGROUND_ORIGIN}/${q.length ? `?${q.join('&')}` : ''}`;
};

export function LiveDemoClient({
  script,
  sampleKind,
  title,
  caption,
  height = 600,
  autoplay = true,
  poster,
}: {
  script?: string;
  sampleKind?: string;
  title?: string;
  caption?: string;
  height?: number;
  autoplay?: boolean;
  poster: string | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [sample, setSample] = useState<{ id: string; title: string } | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setGpu(!!(navigator as Navigator & { gpu?: unknown }).gpu);
  }, []);
  const label = title ?? script ?? `a real ${sampleKind}`;
  const open = playUrl(script, sample?.id);
  const src = `${open}${script && autoplay ? '&autoplay' : ''}`;
  const run = async () => {
    if (!sampleKind) return setLoaded(true);
    const found = await sampleOfKind(sampleKind).catch(() => null);
    if (!found) return setMissing(true);
    setSample(found);
    setLoaded(true);
  };

  return (
    <figure className="not-prose paged-lab paged-demo">
      <div className="paged-lab-panel paged-demo-panel">
        <div className="paged-lab-sheet paged-demo-sheet">
          <div className="paged-lab-heading">
            <span>
              Live demo <span className="paged-lab-path">/ {label}</span>
            </span>
            <a className="paged-lab-copy" href={open} target="_blank" rel="noreferrer">
              Open in the playground <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="paged-demo-stage" data-live={loaded ? '' : undefined} style={loaded ? { height } : undefined}>
            {loaded ? (
              <iframe
                title={`Live demo: ${label}`}
                src={src}
                // allow="cross-origin-isolated" lets the cross-origin iframe inherit
                // SAB from this (already isolated) page; fullscreen for the expand control.
                allow="cross-origin-isolated; fullscreen; clipboard-write"
              />
            ) : poster ? (
              <div className="paged-script-poster">
                <img src={poster} alt={`${label}: a frame of the demo, recorded in the Paged editor`} decoding="async" loading="lazy" />
              </div>
            ) : (
              <div className="paged-script-empty">
                <p className="paged-script-empty-kicker">{gpu === false ? 'No live stage here' : 'What Run does'}</p>
                <p className="paged-script-empty-text">
                  {gpu === false
                    ? 'The live demo needs WebGPU. There is no recorded frame of it yet.'
                    : missing
                      ? `The sample catalog offers no ${sampleKind} just now; the playground lists every sample on its empty canvas.`
                      : sampleKind
                        ? `Run loads the Paged editor here and opens a real ${sampleKind}, rebuilt from its publisher’s PDF${script ? `, then plays the “${script}” script on it` : ''}.`
                        : `Run loads the Paged editor here and plays the “${label}” script in it.`}
                </p>
              </div>
            )}
          </div>
          {loaded ? null : (
            <div className="paged-script-controls">
              {gpu === false ? (
                <p className="paged-script-gpu" role="note">
                  The live demo needs WebGPU, which this browser does not offer.
                  {poster ? ' The stage shows a recorded frame of it.' : ''}
                </p>
              ) : (
                <button type="button" className="paged-script-run" onClick={() => void run()} aria-label={`Run live demo: ${label}`}>
                  Run live demo
                </button>
              )}
              <span className="paged-demo-note">
                {sampleKind
                  ? 'The real editor, with a sample publication, shown for illustration'
                  : 'The real editor, driven by a script'}
                {poster ? '; the still above is a recorded frame' : ''}.
              </span>
            </div>
          )}
        </div>
      </div>
      {caption ? <figcaption className="paged-lab-caption paged-demo-caption">{caption}</figcaption> : null}
    </figure>
  );
}
