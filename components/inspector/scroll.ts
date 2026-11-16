/**
 * Scroll `el` into view inside its scrolling `pane` only. `scrollIntoView`
 * would also scroll the page, and the panes of the Inspector sit side by side:
 * selecting in one must not move the reader's place in the document.
 */
export function scrollWithin(pane: HTMLElement, el: HTMLElement, mode: 'nearest' | 'start') {
  const p = pane.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const margin = 12;
  if (mode === 'start') {
    pane.scrollTop += r.top - p.top - Math.min(48, p.height / 4);
    return;
  }
  if (r.top < p.top + margin) pane.scrollTop += r.top - p.top - margin;
  else if (r.bottom > p.bottom - margin) pane.scrollTop += Math.min(r.bottom - p.bottom + margin, r.top - p.top - margin);
}
