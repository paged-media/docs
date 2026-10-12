'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { FitSwitch, LivePreview, type Fit } from './live-preview';
import { focusRect, imageInk, scaleRect, type Rect } from './content-bounds';

/**
 * InDesign's page images beside Paged's live render, framed alike. Each
 * InDesign page is measured for ink in the browser; "Fit content" crops it to
 * that box (with a margin), and hands page 1's box — in points — to the live
 * preview, so both sides show the same region at the same aspect. "Whole page"
 * shows both sheets entire.
 *
 * The images are InDesign's PDF rasterised at 96 dpi (1 px = 0.75 pt), so a
 * crop is enlarged at most MAX_UPSCALE times: beyond that the raster blurs.
 */
const PT_PER_PX = 72 / 96;
const MAX_UPSCALE = 2.5;
const MAX_HEIGHT = 456;

interface Measured {
  width: number;
  height: number;
  /** Crop box in image px, or null to show the whole page. */
  crop: Rect | null;
}

export function InDesignCompare({
  example,
  pages,
  part,
  idmlBase64,
  version,
}: {
  example: string;
  pages: string[];
  part: string;
  idmlBase64?: string;
  version?: string;
}) {
  const [fit, setFit] = useState<Fit>('content');
  const [measured, setMeasured] = useState<(Measured | null)[]>(() => pages.map(() => null));
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all(
      pages.map((src) =>
        imageInk(src)
          .then(({ ink, width, height }) => ({ width, height, crop: focusRect(ink, width, height) }))
          .catch(() => null),
      ),
    ).then((m) => {
      if (!live) return;
      setMeasured(m);
      setDone(true);
    });
    return () => {
      live = false;
    };
  }, [pages]);

  const first = measured[0];
  // Page 1's box in points, for the live side; null = whole page; undefined = still measuring.
  const focus = !done ? undefined : first?.crop ? scaleRect(first.crop, PT_PER_PX) : null;
  const canCrop = measured.some((m) => m?.crop);

  return (
    <div>
      {canCrop ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
          <FitSwitch fit={fit} onChange={setFit} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="m-0">
          <div className="paged-indesign-sheet flex flex-col gap-3 rounded-[2px] border border-fd-border p-3">
            {pages.map((src, i) => (
              <PageImage key={src} src={src} alt={`InDesign's rendering of ${example}, page ${i + 1}`} m={measured[i]} crop={fit === 'content'} />
            ))}
          </div>
          <figcaption className="mt-2 text-xs text-fd-muted-foreground">InDesign {version}</figcaption>
        </figure>
        <figure className="m-0">
          {focus === undefined && fit === 'content' ? (
            <div className="flex h-[480px] items-center justify-center rounded-[2px] border border-dashed border-fd-border text-sm text-fd-muted-foreground">
              Measuring the page…
            </div>
          ) : (
            <LivePreview example={example} part={part} idmlBase64={idmlBase64} fit={fit} onFitChange={setFit} focus={focus ?? null} toggle={false} />
          )}
          <figcaption className="mt-2 text-xs text-fd-muted-foreground">Paged, live in this browser</figcaption>
        </figure>
      </div>
    </div>
  );
}

/** One InDesign page: whole, or cropped to its ink by positioning the image in a clipping box. */
function PageImage({ src, alt, m, crop }: { src: string; alt: string; m: Measured | null; crop: boolean }) {
  if (!crop || !m?.crop) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className="mx-auto block h-auto max-h-[456px] w-auto max-w-full" />;
  }
  const c = m.crop;
  const box: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    margin: '0 auto',
    aspectRatio: `${c.w} / ${c.h}`,
    width: `min(100%, ${Math.round(c.w * MAX_UPSCALE)}px, ${Math.round((MAX_HEIGHT * c.w) / c.h)}px)`,
  };
  const img: CSSProperties = {
    position: 'absolute',
    maxWidth: 'none',
    width: `${(m.width / c.w) * 100}%`,
    left: `${(-c.x / c.w) * 100}%`,
    top: `${(-c.y / c.h) * 100}%`,
  };
  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={img} />
    </div>
  );
}
