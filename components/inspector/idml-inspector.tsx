'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionFont } from '@/components/mdx/sdk-loader';
import { base64ToBytes } from '@/components/mdx/viewer-common';
import { entryText, PackageError, readIdmlPackage, type IdmlPackage } from '@/lib/inspector/unzip';
import { summarize, type Summary } from '@/lib/inspector/summarize';
import type { ElementRefs } from './annotated-xml';
import { FileDrop } from './file-drop';
import { PackageTree } from './package-tree';
import { PartView } from './part-view';
import { RenderPane } from './render-pane';
import { SelectionStrip } from './selection-strip';
import { SummaryPanel } from './summary-panel';
import { SyncedTree } from './synced-tree';
import { SyncedXml } from './synced-xml';
import { indexPackageSelves, indexXml } from './xml-index';
import { btn, sheet } from './styles';
import s from './inspector.module.css';

/**
 * <IdmlInspector> — open an IDML package in the browser and see inside it: the
 * summary across the top, then the workspace: the package's files, the page,
 * and the chosen part's element tree beside its XML (ADR 809).
 *
 * The tree and the XML select each other: each part is indexed once (every
 * element with the character range it covers, and its `Self` id), so choosing
 * an element in the tree marks its range in the source, and a click in the
 * source chooses the innermost element there. A `Self` reference in the source
 * (`ParentStory="u1d5"`) leads to the part that defines it, through an index of
 * every `Self` in the package. The page is drawn by the published viewer,
 * which does not yet say which element lies under a point or where an element
 * lies on the page, so page and element are not linked; the page pane says so.
 *
 * Everything runs here. The file is read with `File.arrayBuffer()`, unzipped by
 * fflate, summarised and indexed from its own XML and rendered by the WebGPU
 * viewer, whose wasm is fetched from this site only once a file is open.
 * Nothing is sent anywhere. Each new file replaces the last; the panes are
 * keyed by it, so the previous viewer and its GPU device are disposed.
 */
interface Opened {
  id: number;
  pkg: IdmlPackage;
  summary: Summary;
  fonts: SessionFont[];
  unavailable: string[];
}

type Phase = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'error'; name: string; message: string; hint?: string };

/** The element chosen in a part: by node, or (when following a reference) by `Self`, resolved once the part is indexed. */
type Choice = { part: string; node: number } | { part: string; self: string };

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

/** The part a reader most likely wants first: the first spread, else the design map. */
function firstPart(pkg: IdmlPackage): string {
  return pkg.entries.find((e) => /^Spreads\/.+\.xml$/i.test(e.path))?.path ?? 'designmap.xml';
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
  const [choice, setChoice] = useState<Choice | null>(null);
  const [selves, setSelves] = useState<Map<string, string> | null>(null);
  const seq = useRef(0);
  const workRef = useRef<HTMLDivElement>(null);

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
      setSelves(null);
      setOpened({ id, pkg, summary, fonts: embeddedFonts(pkg, summary), unavailable: unavailableFamilies(summary) });
      setChoice({ part: firstPart(pkg), node: -1 });
      setPhase({ kind: 'idle' });
    } catch (e: unknown) {
      if (id !== seq.current) return;
      setOpened(null);
      if (e instanceof PackageError) setPhase({ kind: 'error', name, message: e.message, hint: e.hint });
      else setPhase({ kind: 'error', name, message: 'The file could not be read.', hint: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Every `Self` in the package, once the first paint is out of the way.
  useEffect(() => {
    if (!opened) return;
    let live = true;
    const t = setTimeout(() => {
      const map = indexPackageSelves(opened.pkg.entries.filter((e) => e.kind === 'xml').map((e) => ({ path: e.path, text: entryText(e) })));
      if (live) setSelves(map);
    }, 30);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [opened]);

  const onFile = useCallback((file: File) => void open(file.name, async () => new Uint8Array(await file.arrayBuffer())), [open]);
  const onSample = useCallback(() => {
    if (sample) void open(`${sample.name}.idml`, async () => base64ToBytes(sample.base64));
  }, [open, sample]);

  const part = choice?.part ?? null;
  const entry = useMemo(() => (opened && part ? (opened.pkg.byPath.get(part) ?? null) : null), [opened, part]);
  const code = useMemo(() => (entry?.kind === 'xml' ? entryText(entry) : null), [entry]);
  const index = useMemo(() => (code !== null ? indexXml(code) : null), [code]);
  const node = !choice || !index ? -1 : 'node' in choice ? choice.node : (index.bySelf.get(choice.self) ?? -1);

  const selectPart = useCallback((path: string) => {
    setChoice({ part: path, node: -1 });
    workRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const selectNode = useCallback((n: number) => setChoice((c) => (c ? { part: c.part, node: n } : c)), []);
  const follow = useCallback(
    (self: string) => {
      const target = selves?.get(self);
      if (target) setChoice({ part: target, self });
    },
    [selves],
  );

  const busy = phase.kind === 'reading';

  return (
    <div className={`not-prose paged-inspector ${s.root}`} style={{ margin: 'var(--space-4) 0 var(--space-6)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-4)' }}>
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

          <div ref={workRef} className={s.workspace} style={{ scrollMarginTop: 80 }}>
            <section className={`${s.pane} ${s.files}`} aria-label="Package">
              <div className={s.head}>
                <span className={s.title}>Package</span>
                <span className={s.sub}>{opened.pkg.entries.length} entries</span>
              </div>
              <div className={s.filesScroll}>
                <PackageTree entries={opened.pkg.entries} selected={part} onSelect={(p) => setChoice({ part: p, node: -1 })} />
              </div>
            </section>

            <div className={s.page}>
              <RenderPane key={opened.id} bytes={opened.pkg.bytes} fonts={opened.fonts} unavailable={opened.unavailable} height={440} />
            </div>

            {entry && index && code !== null ? (
              <>
                <div className={s.card}>
                  <SelectionStrip
                    part={entry.path}
                    code={code}
                    index={index}
                    node={node}
                    refs={refs}
                    selves={selves}
                    onSelect={selectNode}
                    onFollow={follow}
                  />
                </div>
                <section className={`${s.pane} ${s.treePane}`} aria-label="Element tree">
                  <div className={s.head}>
                    <span className={s.title}>Elements</span>
                    <span className={s.sub}>{index.nodes.length.toLocaleString('en')}</span>
                  </div>
                  <div className={s.treeScroll}>
                    <SyncedTree key={`${opened.id}:${entry.path}`} index={index} selected={node} onSelect={selectNode} part={entry.path} />
                  </div>
                </section>
                <section className={`${s.pane} ${s.xmlPane}`} aria-label="XML source">
                  <div className={s.head}>
                    <span className={s.title}>XML</span>
                    <span className={s.sub}>{entry.path}</span>
                  </div>
                  <SyncedXml
                    key={`${opened.id}:${entry.path}`}
                    code={code}
                    index={index}
                    selected={node}
                    onSelect={selectNode}
                    onFollow={follow}
                    refs={refs}
                    selves={selves}
                    part={entry.path}
                  />
                </section>
              </>
            ) : (
              <div className={s.wide}>
                {entry ? <PartView key={`${opened.id}:${entry.path}`} entry={entry} refs={refs} /> : <p className={`${s.pane} ${s.empty}`}>Choose a part on the left.</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
