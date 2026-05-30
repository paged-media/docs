'use client';

import { useState, type ReactNode } from 'react';
import type { ExampleView } from '@/lib/examples';

const LABELS: Record<ExampleView, string> = {
  raw: 'Raw',
  annotated: 'Annotated',
  tree: 'Tree',
  live: 'Live',
};

/**
 * Tab switcher for an example's views. The set of tabs is data-driven by the
 * manifest's `views`, so adding the WebGPU `live` view later is a manifest edit
 * + one more panel — no change here.
 */
export function ExampleTabs({
  tabs,
  panels,
}: {
  tabs: ExampleView[];
  panels: Partial<Record<ExampleView, ReactNode>>;
}) {
  const [active, setActive] = useState<ExampleView>(tabs[0]);
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-fd-border px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active === tab
                ? 'border-fd-primary font-medium text-fd-foreground'
                : 'border-transparent text-fd-muted-foreground'
            }`}
          >
            {LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="p-3">{panels[active]}</div>
    </div>
  );
}
