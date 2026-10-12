/**
 * Where a page's ink is: the bounding box of the pixels that are not paper.
 * The live preview and the InDesign comparison open on that box instead of the
 * whole page, so a three-line example is read at a size where its text is
 * text, not a grey smudge in the corner of an A4 sheet.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pixel box of everything darker than near-white; null for a blank page. The
 * outermost `edge` pixels are skipped: the renderer draws the sheet's outline
 * there, which is not content.
 */
export function inkBounds(rgba: ArrayLike<number>, width: number, height: number, threshold = 14, edge = 3): Rect | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = edge; y < height - edge; y++) {
    const row = y * width * 4;
    for (let x = edge; x < width - edge; x++) {
      const i = row + x * 4;
      if (rgba[i + 3] < 8) continue; // transparent
      if (255 - rgba[i] > threshold || 255 - rgba[i + 1] > threshold || 255 - rgba[i + 2] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * The box to show, in the page's own units: the ink grown by a margin and
 * clamped to the page. Null when the ink already covers most of the page —
 * then the whole page is the better view.
 */
export function focusRect(ink: Rect | null, pageW: number, pageH: number): Rect | null {
  if (!ink) return null;
  if ((ink.w * ink.h) / (pageW * pageH) > 0.6) return null;
  const pad = Math.max(12, 0.08 * Math.max(ink.w, ink.h));
  const x = Math.max(0, ink.x - pad);
  const y = Math.max(0, ink.y - pad);
  return { x, y, w: Math.min(pageW, ink.x + ink.w + pad) - x, h: Math.min(pageH, ink.y + ink.h + pad) - y };
}

/** A rect measured in one unit (raster px), re-expressed in another (pt). */
export function scaleRect(r: Rect, k: number): Rect {
  return { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };
}

/** Load an image and measure its ink, in image pixels. */
export async function imageInk(src: string): Promise<{ ink: Rect | null; width: number; height: number }> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { ink: null, width: img.naturalWidth, height: img.naturalHeight };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return { ink: inkBounds(data, canvas.width, canvas.height), width: canvas.width, height: canvas.height };
}
