'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { btn } from './styles';

/**
 * The drop target: a dashed sheet that takes a dragged file or opens the file
 * picker on click or Enter. `compact` shrinks it to one line once a file is
 * open. The file is handed to `onFile` as a `File`; reading it is the caller's
 * business, and nothing here touches the network.
 */
export function FileDrop({
  onFile,
  compact,
  busy,
  children,
}: {
  onFile: (file: File) => void;
  compact?: boolean;
  busy?: boolean;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer?.files);
  };
  const onDragOver = (e: DragEvent) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setOver(true);
  };
  const pick = () => input.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open an IDML file"
      aria-busy={busy}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 'var(--space-3)' : 'var(--space-2)',
        padding: compact ? '10px var(--space-4)' : 'var(--space-6) var(--space-4)',
        border: `1px dashed ${over ? 'var(--color-accent)' : 'var(--color-rule-strong)'}`,
        borderRadius: 2,
        background: over ? 'var(--color-accent-soft)' : 'var(--color-paper-soft)',
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-ink-soft)',
        transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".idml,application/vnd.adobe.indesign-idml-package"
        // Visually hidden but present, so the picker and automation can both reach it.
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          take(e.currentTarget.files);
          e.currentTarget.value = ''; // the same file again still fires change
        }}
      />
      {compact ? (
        <>
          <span style={{ fontSize: 13.5 }}>Drop another .idml here, or</span>
          <span style={btn}>Choose a file…</span>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'var(--font-display-serif)', fontSize: 24, color: 'var(--color-ink)' }}>
            Drop an .idml file here
          </span>
          <span style={{ fontSize: 14 }}>or click to choose one</span>
          <span style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 'var(--space-2)' }}>
            Your file never leaves your browser.
          </span>
        </>
      )}
      {children}
    </div>
  );
}
