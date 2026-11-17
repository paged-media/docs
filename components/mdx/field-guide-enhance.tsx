'use client';

import { useEffect, useRef } from 'react';

/**
 * The field guide's one piece of JavaScript (components/mdx/field-guide.tsx):
 * it marks the guide as enhanced, so only the chosen stop's card shows, and
 * makes a hotspot or a stop choose its card in place — the highlight moves,
 * the address keeps the card's anchor, the page does not jump. Without it the
 * hotspots and stops are plain links to the cards, which are all in the HTML.
 */
export function FieldGuideEnhance({ initial }: { initial: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>('[data-guide]');
    if (!root) return;
    const keys = [...root.querySelectorAll<HTMLElement>('[data-guide-card]')].map((el) => el.dataset.guideCard!);
    const choose = (key: string) => {
      if (!keys.includes(key)) return;
      root.dataset.active = key;
      for (const el of root.querySelectorAll<HTMLElement>('[data-guide-card]')) el.toggleAttribute('data-active', el.dataset.guideCard === key);
      for (const el of root.querySelectorAll<HTMLElement>('[data-guide-key]')) {
        if (el.dataset.guideKey === key) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
      }
    };
    const fromHash = () => (location.hash.startsWith('#guide-') ? location.hash.slice('#guide-'.length) : null);
    choose(fromHash() ?? initial);
    root.dataset.js = '';
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-guide-key]');
      if (!link || !root.contains(link) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      choose(link.dataset.guideKey!);
      history.replaceState(null, '', `#guide-${link.dataset.guideKey}`);
    };
    const onHash = () => {
      const key = fromHash();
      if (key) choose(key);
    };
    root.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHash);
    return () => {
      root.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHash);
      delete root.dataset.js;
    };
  }, [initial]);
  return <span ref={ref} hidden />;
}
