'use client';

import { useState, type ReactNode } from 'react';
import type { ExampleTab } from '@/lib/examples';
import { Pic } from '@/components/icons';

const LABELS: Record<ExampleTab, string> = {
  raw: 'Raw',
  annotated: 'Annotated',
  tree: 'Tree',
  live: 'Live',
  indesign: 'InDesign',
};

/**
 * What each view is, for the panel's mono heading: read the source, run it, or
 * inspect it. Live is the Paged engine's own render of the example's package
 * (the published viewer, components/mdx/live-preview.tsx), and InDesign is
 * InDesign's export beside it; both headings say so.
 */
const HEADINGS: Record<ExampleTab, string> = {
  raw: 'Read / the source',
  annotated: 'Read / the source, annotated',
  tree: 'Inspect / the element tree',
  live: 'Run / the Paged engine, live in this browser',
  indesign: 'Inspect / InDesign beside Paged',
};

/**
 * The example lab — the docs' signature component in the V5 Read / Run /
 * Inspect form (docs/adr/810-next-edition-chrome.md): a slate panel, square
 * tab buttons, a mono caps heading naming the part and the view, the code on
 * night, and the live render on a paper sheet. The Shiki-highlighted panels
 * are rendered on the server and passed in as `panels`; this client shell owns
 * the tabs and the copy action. Styles: app/edition.css (`.paged-lab`).
 *
 * The tab buttons' names are the view names alone ("Annotated"); the numeral
 * in front is decoration, hidden from assistive technology.
 */
export function ExampleTabs({
  caption,
  path,
  code,
  tabs,
  panels,
  feature,
}: {
  caption?: ReactNode;
  path?: string;
  code: string;
  tabs: ExampleTab[];
  panels: Partial<Record<ExampleTab, ReactNode>>;
  feature?: boolean;
}) {
  const [active, setActive] = useState<ExampleTab>(tabs[0]);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <figure className={feature ? 'not-prose paged-lab is-feature' : 'not-prose paged-lab'}>
      {caption && <figcaption className="paged-lab-caption">{caption}</figcaption>}
      <div className="paged-lab-panel" data-view={active}>
        <div className="paged-lab-bar">
          <div role="tablist" aria-label="Source views" className="paged-lab-tabs">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active === tab}
                className="paged-lab-tab"
                onClick={() => setActive(tab)}
              >
                <span aria-hidden="true" className="paged-lab-tab-num">
                  {String(i + 1).padStart(2, '0')} /
                </span>{' '}
                {LABELS[tab]}
              </button>
            ))}
          </div>
          <button type="button" onClick={copy} aria-label="Copy source" className="paged-lab-copy" data-copied={copied ? '' : undefined}>
            <Pic name={copied ? 'check' : 'page'} size={13} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="paged-lab-sheet">
          <div className="paged-lab-heading">
            <span className="paged-lab-path">{path}</span>
            <span>{HEADINGS[active]}</span>
          </div>
          {/* body — the active server-rendered panel */}
          <div className="paged-lab-body">{panels[active]}</div>
        </div>
      </div>
    </figure>
  );
}
