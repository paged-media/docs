'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { FitSwitch, LivePreview, MAX_CONTENT_ZOOM, MIN_H, type Fit } from './live-preview';
import { focusRect, imageInk, scaleRect, type Rect } from './content-bounds';
import type { PreviewStatus } from './viewer-common';

/**
 * InDesign's page images beside Paged's live render, framed alike. Each
 * InDesign page is measured for ink in the browser; "Fit content" crops it to
 * that box (with a margin), and hands page 1's box — in points — to the live
 * preview, so both sides show the same region at the same aspect. "Whole page"
 * shows both sheets entire.
 *
 * Ink is measured on the 96 dpi record (1 px = 0.75 pt); what is drawn is the
 * 288 dpi copy, so a crop stays sharp when enlarged. A crop is drawn at most
 * MAX_CONTENT_ZOOM CSS px per point, the live side's own limit, so a small
 * object appears at the same size on both sides.
 */
const PT_PER_PX = 72 / 96;
const MAX_HEIGHT = 456;

export interface InDesignPage {
  /** The 96 dpi record. */
  src: string;
  /** The same page at 288 dpi. */
  sharp: string;
}

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
  pages: InDesignPage[];
  part: string;
  idmlBase64?: string;
  version?: string;
}) {
  const [fit, setFit] = useState<Fit>('content');
  const [measured, setMeasured] = useState<(Measured | null)[]>(() => pages.map(() => null));
  const [done, setDone] = useState(false);
  // The caption only promises a live render while there is, or is about to be, one.
  const [liveStatus, setLiveStatus] = useState<PreviewStatus>('loading');
  const live = liveStatus === 'loading' || liveStatus === 'ready';

  useEffect(() => {
    let live = true;
    void Promise.all(
      pages.map(({ src }) =>
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
    <div className="paged-indesign-compare">
      {canCrop ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
          <FitSwitch fit={fit} onChange={setFit} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="m-0">
          {/* At least as tall as the live canvas, the crop centred in it, so the two sheets line up. */}
          <div
            className="paged-indesign-sheet flex flex-col justify-center gap-3 rounded-[2px] border border-fd-border p-3"
            style={{ minHeight: MIN_H }}
          >
            {pages.map((page, i) => (
              <PageImage key={page.src} page={page} alt={`InDesign's rendering of ${example}, page ${i + 1}`} m={measured[i]} crop={fit === 'content'} />
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
            <LivePreview
              example={example}
              part={part}
              idmlBase64={idmlBase64}
              fit={fit}
              onFitChange={setFit}
              focus={focus ?? null}
              toggle={false}
              onStatusChange={setLiveStatus}
            />
          )}
          <figcaption className="mt-2 text-xs text-fd-muted-foreground">{live ? 'Paged, live in this browser' : 'Paged'}</figcaption>
        </figure>
      </div>
    </div>
  );
}

/**
 * One InDesign page: whole, or cropped to its ink by positioning the image in
 * a clipping box. The box is laid out in the record's pixels and percentages,
 * so either raster fills it.
 */
function PageImage({ page, alt, m, crop }: { page: InDesignPage; alt: string; m: Measured | null; crop: boolean }) {
  if (!crop || !m?.crop) {
    // The whole sheet at the record's size; a high-density screen takes the sharp copy.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={page.src}
        srcSet={`${page.src} 1x, ${page.sharp} 3x`}
        alt={alt}
        loading="lazy"
        className="mx-auto block h-auto max-h-[456px] w-auto max-w-full"
      />
    );
  }
  const c = m.crop;
  const box: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    margin: '0 auto',
    aspectRatio: `${c.w} / ${c.h}`,
    width: `min(100%, ${Math.round(c.w * PT_PER_PX * MAX_CONTENT_ZOOM)}px, ${Math.round((MAX_HEIGHT * c.w) / c.h)}px)`,
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
      <img src={page.sharp} alt={alt} style={img} />
    </div>
  );
}
