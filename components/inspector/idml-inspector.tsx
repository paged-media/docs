'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { SessionFont } from '@/components/mdx/sdk-loader';
import { base64ToBytes } from '@/components/mdx/viewer-common';
import { PackageError, readIdmlPackage, type IdmlPackage } from '@/lib/inspector/unzip';
import { summarize, type Summary } from '@/lib/inspector/summarize';
import type { ElementRefs } from './annotated-xml';
import { FileDrop } from './file-drop';
import { PackageTree } from './package-tree';
import { PartView } from './part-view';
import { RenderPane } from './render-pane';
import { SummaryPanel } from './summary-panel';
import { btn, label, sheet, strip } from './styles';

/**
 * <IdmlInspector> — open an IDML package in the browser and see inside it: the
 * summary across the top, then one workspace of three panes — the package
 * tree, the selected part (Linked / Raw / Tree) and the live render, side by
 * side on a wide screen (render first, then tree and part, as the screen
 * narrows; global.css `.paged-inspector-workspace`).
 *
 * Everything runs here. The file is read with `File.arrayBuffer()`, unzipped by
 * fflate, summarised from its own XML and rendered by the WebGPU viewer, whose
 * wasm is fetched from this site only once a file is open. Nothing is sent
 * anywhere. Each new file replaces the last; the render pane is keyed by it, so
 * the previous viewer and its GPU device are disposed.
 */
interface Opened {
  id: number;
  pkg: IdmlPackage;
  summary: Summary;
  fonts: SessionFont[];
  unavailable: string[];
}

type Phase = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'error'; name: string; message: string; hint?: string };

// Let React paint the "reading" state before the work starts.
const yieldToPaint = () => new Promise<void>((r) => setTimeout(r, 0));

function embeddedFonts(pkg: IdmlPackage, summary: Summary): SessionFont[] {
  return summary.embeddedFonts.flatMap((f) => {
    const entry = pkg.byPath.get(f.path);
    return entry ? [{ family: f.family, style: f.style, bytes: entry.bytes }] : [];
  });
}

/**
 * Applied families with no face for the renderer: not embedded, and not the
 * Open Sans fallback the session always registers (sdk-loader.ts).
 */
function unavailableFamilies(summary: Summary): string[] {
  const embedded = new Set(summary.embeddedFonts.map((f) => f.family));
  return summary.fonts.filter((f) => f.uses > 0 && f.family !== 'Open Sans' && !embedded.has(f.family)).map((f) => f.family);
}

export function IdmlInspector({
  refs,
  sample,
}: {
  refs: ElementRefs;
  /** A small example package to try without a file of one's own. */
  sample?: { name: string; base64: string };
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [opened, setOpened] = useState<Opened | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const seq = useRef(0);
  const partsRef = useRef<HTMLDivElement>(null);

  const open = useCallback(async (name: string, read: () => Promise<Uint8Array>) => {
    const id = ++seq.current;
    setPhase({ kind: 'reading', name });
    await yieldToPaint();
    try {
      const bytes = await read();
      const pkg = await readIdmlPackage(bytes, name);
      if (id !== seq.current) return;
      await yieldToPaint();
      const summary = summarize(pkg);
      if (id !== seq.current) return;
      setOpened({ id, pkg, summary, fonts: embeddedFonts(pkg, summary), unavailable: unavailableFamilies(summary) });
      setSelected('designmap.xml');
      setPhase({ kind: 'idle' });
    } catch (e: unknown) {
      if (id !== seq.current) return;
      setOpened(null);
      if (e instanceof PackageError) setPhase({ kind: 'error', name, message: e.message, hint: e.hint });
      else setPhase({ kind: 'error', name, message: 'The file could not be read.', hint: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const onFile = useCallback((file: File) => void open(file.name, async () => new Uint8Array(await file.arrayBuffer())), [open]);
  const onSample = useCallback(() => {
    if (sample) void open(`${sample.name}.idml`, async () => base64ToBytes(sample.base64));
  }, [open, sample]);

  const selectPart = useCallback((path: string) => {
    setSelected(path);
    partsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const entry = useMemo(() => (opened && selected ? opened.pkg.byPath.get(selected) ?? null : null), [opened, selected]);
  const busy = phase.kind === 'reading';

  return (
    <div className="not-prose paged-inspector" style={{ margin: 'var(--space-4) 0 var(--space-6)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-4)' }}>
      <FileDrop onFile={onFile} compact={!!opened} busy={busy}>
        {!opened && sample && (
          <button
            type="button"
            style={{ ...btn, marginTop: 'var(--space-2)' }}
            onClick={(e) => {
              e.stopPropagation();
              onSample();
            }}
          >
            No file at hand? Open a sample
          </button>
        )}
      </FileDrop>

      {phase.kind === 'reading' && (
        <p role="status" style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-ink-soft)' }}>
          Reading {phase.name}…
        </p>
      )}
      {phase.kind === 'error' && (
        <div role="alert" style={{ ...sheet, borderLeft: '2px solid var(--color-accent)', padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
          <strong style={{ fontWeight: 640, color: 'var(--color-ink)' }}>{phase.name}: </strong>
          {phase.message}
          {phase.hint && <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-muted)' }}>{phase.hint}</div>}
        </div>
      )}

      {opened && (
        <>
          <SummaryPanel
            summary={opened.summary}
            fileName={opened.pkg.name}
            fileSize={opened.pkg.fileSize}
            entryCount={opened.pkg.entries.length}
            refs={refs}
            onSelect={selectPart}
          />

          <div ref={partsRef} className="paged-inspector-workspace" style={{ scrollMarginTop: 80 }}>
            <section style={sheet} className="paged-inspector-tree" aria-label="Package">
              <div style={strip}>
                <span style={label}>Package · {opened.pkg.entries.length} entries</span>
              </div>
              <div style={{ maxHeight: '74vh', overflow: 'auto' }}>
                <PackageTree entries={opened.pkg.entries} selected={selected} onSelect={setSelected} />
              </div>
            </section>
            <div className="paged-inspector-part">
              {entry ? (
                <PartView key={opened.id} entry={entry} refs={refs} />
              ) : (
                <div style={{ ...sheet, padding: 16, fontFamily: 'var(--font-sans)', fontSize: 14 }}>Choose a part on the left.</div>
              )}
            </div>
            <div className="paged-inspector-render">
              <RenderPane key={opened.id} bytes={opened.pkg.bytes} fonts={opened.fonts} unavailable={opened.unavailable} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
