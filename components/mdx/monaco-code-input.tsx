'use client';
/**
 * MonacoCodeInput — the playground's code editor, on monaco-editor@0.55.1 via
 * @monaco-editor/react. Monaco is SELF-HOSTED (bundled, configured through
 * loader.config({ monaco })) rather than CDN-loaded, so its web workers are
 * same-origin and load cleanly inside the cross-origin-isolated (COEP) docs page.
 *
 * Loaded client-only (next/dynamic ssr:false from <ScriptingPlayground>), so this
 * module — which imports monaco and touches `self` — never runs during the static
 * export's server render.
 */
import * as monaco from 'monaco-editor';
import { Editor, loader } from '@monaco-editor/react';

// Use the bundled monaco instance (no CDN). Runs at import time, client-only.
loader.config({ monaco });

// Same-origin worker. Syntax highlighting (Monarch) runs on the main thread, so
// even if the language worker is unavailable the editor still highlights + edits.
if (typeof window !== 'undefined') {
  (self as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
    getWorker() {
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' });
    },
  };
}

export function MonacoCodeInput({ value, onChange, height }: { value: string; onChange: (v: string) => void; height: number }) {
  return (
    <Editor
      height={height}
      defaultLanguage="javascript"
      theme="vs"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      loading={<div style={{ padding: 12, fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, color: 'var(--color-muted)' }}>Loading editor…</div>}
      options={{
        minimap: { enabled: false },
        fontSize: 12.5,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 2,
        padding: { top: 10, bottom: 10 },
        renderLineHighlight: 'line',
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        overviewRulerLanes: 0,
      }}
    />
  );
}
