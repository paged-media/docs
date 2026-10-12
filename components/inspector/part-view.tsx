'use client';

import { useEffect, useMemo, useState } from 'react';
import { HIGHLIGHT_LIMIT, highlightXml } from '@/lib/shiki-client';
import { entryText, formatBytes, type PackageEntry } from '@/lib/inspector/unzip';
import { AnnotatedXml, type ElementRefs } from './annotated-xml';
import { LazyTree } from './lazy-tree';
import { btn, mono, muted, sheet, strip, tab } from './styles';

/**
 * One package entry, in the Source Code Panel's chrome: a mono path strip, the
 * views on the right, a copy action. XML opens on Linked — the source with
 * every element name linked to its reference page, which is what a reader
 * asking "what is this element?" needs first — and also has Raw
 * (Shiki-highlighted up to `HIGHLIGHT_LIMIT` characters, plain text above it,
 * numbered) and Tree; other text gets Raw; images preview from a local blob
 * URL; anything else shows what it is and how big.
 */
type View = 'linked' | 'raw' | 'tree';
const VIEWS: { id: View; label: string }[] = [
  { id: 'linked', label: 'Linked' },
  { id: 'raw', label: 'Raw' },
  { id: 'tree', label: 'Tree' },
];

/** Plain text past this many characters waits for a click. */
const PLAIN_LIMIT = 1_000_000;

function Raw({ code }: { code: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let live = true;
    setHtml(null);
    if (code.length <= HIGHLIGHT_LIMIT) {
      highlightXml(code)
        .then((h) => live && setHtml(h))
        .catch(() => {
          /* plain text stays */
        });
    }
    return () => {
      live = false;
    };
  }, [code]);

  // `.shiki` brings its own padding (global.css).
  if (html) return <div className="paged-code-numbered" style={{ overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: html }} />;
  const cut = !all && code.length > PLAIN_LIMIT;
  return (
    <div>
      <pre style={{ ...mono, margin: 0, padding: '18px 20px', lineHeight: 1.5, whiteSpace: 'pre', overflowX: 'auto', color: 'var(--code-text)' }}>
        {cut ? code.slice(0, PLAIN_LIMIT) : code}
      </pre>
      {(code.length > HIGHLIGHT_LIMIT || cut) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '0 20px 18px', fontFamily: 'var(--font-sans)', fontSize: 12.5, ...muted }}>
          <span>Shown without highlighting: this part is {formatBytes(code.length)} of text.</span>
          {cut && (
            <button type="button" style={btn} onClick={() => setAll(true)}>
              Show the remaining {formatBytes(code.length - PLAIN_LIMIT)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ImagePreview({ entry }: { entry: PackageEntry }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const type = /\.svg$/i.test(entry.path) ? 'image/svg+xml' : undefined;
    const u = URL.createObjectURL(new Blob([entry.bytes as BlobPart], type ? { type } : undefined));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [entry]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob, not a site asset
    <img src={url} alt={entry.path} style={{ display: 'block', maxWidth: '100%', maxHeight: 480, margin: '18px auto' }} />
  ) : null;
}

export function PartView({ entry, refs }: { entry: PackageEntry; refs: ElementRefs }) {
  const isXml = entry.kind === 'xml';
  const isText = isXml || entry.kind === 'text';
  const [view, setView] = useState<View>(isXml ? 'linked' : 'raw');
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => (isText ? entryText(entry) : ''), [entry, isText]);

  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <section style={sheet} aria-label={`Part ${entry.path}`}>
      <div style={strip}>
        <span style={{ ...mono, fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {entry.path} · {formatBytes(entry.size)}
          {entry.compression === 8 ? ` (${formatBytes(entry.compressedSize)} compressed)` : ' (stored)'}
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {isXml && (
            <div role="tablist" aria-label="Part views" style={{ display: 'inline-flex', gap: 2 }}>
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id} style={tab(view === v.id)} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
          {isText && (
            <button
              type="button"
              onClick={copy}
              style={{ ...btn, border: 0, background: 'transparent', color: 'var(--color-accent)', fontSize: 11, fontWeight: 640, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {isText && (view === 'raw' || !isXml) && <Raw code={code} />}
        {isXml && view === 'tree' && <LazyTree code={code} />}
        {isXml && view === 'linked' && <AnnotatedXml code={code} refs={refs} />}
        {entry.kind === 'image' && <ImagePreview entry={entry} />}
        {(entry.kind === 'font' || entry.kind === 'binary') && (
          <p style={{ margin: 0, padding: '18px 20px', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--color-ink-soft)' }}>
            {entry.kind === 'font'
              ? 'A font face shipped inside the package. The renderer registers it before it draws the document.'
              : 'A binary entry; the inspector shows its size only.'}
          </p>
        )}
      </div>
    </section>
  );
}
