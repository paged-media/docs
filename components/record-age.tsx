'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * The record strip's age check, repeated against the reader's clock: the
 * export is static, so a page built while the record was current can be read
 * long after. Renders the build's verdict first (the server HTML), then adds
 * ", not current" once the record passes `maxDays` in this browser.
 */
export function RecordAge({
  at,
  maxDays,
  staleAtBuild,
  children,
}: {
  at: string;
  maxDays: number;
  staleAtBuild: boolean;
  children: ReactNode;
}) {
  const [stale, setStale] = useState(staleAtBuild);
  useEffect(() => {
    if (!staleAtBuild && !(Date.now() - Date.parse(at) <= maxDays * 86_400_000)) setStale(true);
  }, [at, maxDays, staleAtBuild]);
  return (
    <span className="paged-strip-record" data-stale={stale ? '' : undefined}>
      {children}
      {stale ? <span className="paged-strip-stale">, not current</span> : null}
    </span>
  );
}
