'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the page is in the night-paper theme: the theme switch puts a
 * `dark` class on <html>. For widgets that paint their own colours (Monaco)
 * and must follow the switch while open.
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setDark(html.classList.contains('dark'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}
