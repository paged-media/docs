'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { IdmlInspector as Inspector } from './idml-inspector';

/**
 * The inspector is browser-only (File, DOMParser, WebGPU) and carries fflate and
 * client Shiki, so its chunk loads on the client, never during the static
 * export. The placeholder keeps the drop target's footprint while it arrives.
 */
const IdmlInspector = dynamic(() => import('./idml-inspector').then((m) => m.IdmlInspector), {
  ssr: false,
  loading: () => (
    <div
      className="not-prose"
      style={{
        margin: 'var(--space-4) 0 var(--space-6)',
        padding: 'var(--space-6) var(--space-4)',
        border: '1px dashed var(--color-rule-strong)',
        borderRadius: 2,
        background: 'var(--color-paper-soft)',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--color-muted)',
      }}
    >
      Loading the inspector…
    </div>
  ),
});

export function IdmlInspectorLoader(props: ComponentProps<typeof Inspector>) {
  return <IdmlInspector {...props} />;
}
