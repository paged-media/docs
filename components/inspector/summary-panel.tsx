'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatBytes } from '@/lib/inspector/unzip';
import type { FontFace, Summary } from '@/lib/inspector/summarize';
import type { ElementRefs } from './annotated-xml';
import { label, mono, muted, sheet, strip } from './styles';

/**
 * The package at a glance: format version, counts, fonts (declared, used,
 * embedded), links to placed files, the largest parts, and anything the reader
 * should know. Clicking a part name selects it in the part view.
 */
const td: CSSProperties = {
  padding: '5px 8px 5px 0',
  borderBottom: '1px solid var(--color-rule)',
  verticalAlign: 'top',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: 'var(--color-ink-soft)',
};
const th: CSSProperties = { ...td, ...label, fontSize: 10.5, borderBottom: '1px solid var(--color-ink)', textAlign: 'left' };

function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--color-rule)' }}>
      <div style={{ ...label, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function PartLink({ path, onSelect }: { path: string; onSelect: (p: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(path)}
      style={{ ...mono, padding: 0, border: 0, background: 'none', color: 'var(--color-accent)', cursor: 'pointer', textAlign: 'left', overflowWrap: 'anywhere' }}
    >
      {path}
    </button>
  );
}

function FaceList({ faces }: { faces: FontFace[] }) {
  return (
    <>
      {faces.map((x, i) => (
        <span key={i} title={[x.postScriptName, x.type, x.status].filter(Boolean).join(' · ')}>
          {i > 0 && ', '}
          {x.style || '—'}
          {x.status && x.status !== 'Installed' && <span style={{ color: 'var(--warn)' }}> ({x.status})</span>}
        </span>
      ))}
    </>
  );
}

/** A family's faces; a long list folds behind a count. */
function Faces({ faces }: { faces: FontFace[] }) {
  if (!faces.length) return <>—</>;
  if (faces.length <= 4) return <FaceList faces={faces} />;
  const off = faces.filter((x) => x.status && x.status !== 'Installed').length;
  return (
    <details>
      <summary style={{ cursor: 'pointer' }}>
        {faces.length} faces{off > 0 && <span style={{ color: 'var(--warn)' }}> · {off} not installed when saved</span>}
      </summary>
      <FaceList faces={faces} />
    </details>
  );
}

function stateColor(state?: string): string {
  if (!state || state === 'Normal') return 'var(--valid)';
  return state === 'LinkMissing' ? 'var(--color-accent)' : 'var(--warn)';
}

export function SummaryPanel({
  summary,
  fileName,
  fileSize,
  entryCount,
  refs,
  onSelect,
}: {
  summary: Summary;
  fileName: string;
  fileSize: number;
  entryCount: number;
  refs: ElementRefs;
  onSelect: (path: string) => void;
}) {
  const s = summary;
  const fontRef = refs['Font'];
  const linkRef = refs['Link'];
  const linkStates = new Map<string, number>();
  for (const l of s.links) linkStates.set(l.state ?? '—', (linkStates.get(l.state ?? '—') ?? 0) + 1);

  return (
    <section style={sheet} aria-label="Package summary">
      <div style={strip}>
        <span style={label}>Summary</span>
        <span style={{ ...mono, fontSize: 11, ...muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {fileName} · {formatBytes(fileSize)}
        </span>
      </div>

      <div style={{ padding: '14px 16px', display: 'grid', gap: 4, fontFamily: 'var(--font-sans)', fontSize: 13.5 }}>
        <div>
          <span style={muted}>DOM version </span>
          <strong style={{ fontWeight: 640 }}>{s.domVersion ?? 'not stated'}</strong>
          {s.product && (
            <>
              <span style={muted}> · written by InDesign </span>
              <span style={mono}>{s.product}</span>
            </>
          )}
        </div>
        <div style={muted}>
          {entryCount} entries · {formatBytes(s.totalBytes)} unpacked
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', borderTop: '1px solid var(--color-rule)' }}>
        {s.counts.map((c) => (
          <div key={c.label} style={{ padding: '10px 16px', borderRight: '1px solid var(--color-rule)', borderBottom: '1px solid var(--color-rule)', marginBottom: -1 }}>
            <div style={{ fontFamily: 'var(--font-display-serif)', fontSize: 24, lineHeight: 1.1, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {c.value.toLocaleString('en')}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-ink-soft)' }}>{c.label}</div>
            {c.note && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, ...muted }}>{c.note}</div>}
          </div>
        ))}
      </div>

      {s.notes.length > 0 && (
        <Block title="Worth knowing">
          <ul style={{ margin: 0, paddingLeft: 18, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-ink-soft)', display: 'grid', gap: 4 }}>
            {s.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Block>
      )}

      <Block
        title={
          <>
            Fonts · {s.fonts.length} famil{s.fonts.length === 1 ? 'y' : 'ies'}
            {fontRef && (
              <a href={fontRef.href} target="_blank" rel="noopener" style={{ marginLeft: 8, color: 'var(--color-accent)', textTransform: 'none', letterSpacing: 0 }}>
                Font reference
              </a>
            )}
          </>
        }
      >
        {s.fonts.length === 0 ? (
          <p style={{ ...td, border: 0, margin: 0 }}>Resources/Fonts.xml declares no fonts, and no part applies one.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Family</th>
                  <th style={th}>Faces</th>
                  <th style={th}>Applied</th>
                  <th style={th}>Embedded</th>
                </tr>
              </thead>
              <tbody>
                {s.fonts.slice(0, 40).map((f) => (
                  <tr key={f.family}>
                    <td style={{ ...td, color: 'var(--color-ink)' }}>
                      {f.family}
                      {!f.declared && <div style={{ fontSize: 11.5, color: 'var(--warn)' }}>applied, not declared in Fonts.xml</div>}
                    </td>
                    <td style={td}>
                      <Faces faces={f.faces} />
                    </td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{f.uses ? `${f.uses.toLocaleString('en')}×` : <span style={muted}>unused</span>}</td>
                    <td style={td}>{f.faces.some((x) => x.embedded) ? `${f.faces.filter((x) => x.embedded).length} of ${f.faces.length}` : <span style={muted}>no</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.fonts.length > 40 && <p style={{ ...td, border: 0, ...muted }}>and {s.fonts.length - 40} more families</p>}
          </div>
        )}
        {s.embeddedFonts.length > 0 && (
          <p style={{ ...td, border: 0, margin: '8px 0 0' }}>
            {s.embeddedFonts.length} face{s.embeddedFonts.length === 1 ? '' : 's'} under <span style={mono}>Document fonts/</span>, registered with the renderer.
          </p>
        )}
      </Block>

      <Block
        title={
          <>
            Links · {s.links.length}
            {linkRef && (
              <a href={linkRef.href} target="_blank" rel="noopener" style={{ marginLeft: 8, color: 'var(--color-accent)', textTransform: 'none', letterSpacing: 0 }}>
                Link reference
              </a>
            )}
          </>
        }
      >
        {s.links.length === 0 ? (
          <p style={{ ...td, border: 0, margin: 0 }}>No placed files: the document links to no images or other files.</p>
        ) : (
          <>
            <p style={{ ...td, border: 0, margin: '0 0 6px' }}>
              {[...linkStates].map(([state, n], i) => (
                <span key={state}>
                  {i > 0 && ' · '}
                  <span style={{ color: stateColor(state) }}>{state}</span> {n}
                </span>
              ))}
              <span style={muted}> — a file that is linked rather than embedded lives outside the package, so it does not render here.</span>
            </p>
            <div style={{ maxHeight: 220, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {s.links.slice(0, 200).map((l, i) => (
                    <tr key={i}>
                      <td style={{ ...td, ...mono, color: 'var(--color-ink)', overflowWrap: 'anywhere' }} title={l.uri}>
                        {l.file || '—'}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: stateColor(l.state) }}>{l.state ?? '—'}</td>
                      <td style={td}>
                        <PartLink path={l.part} onSelect={onSelect} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Block>

      <Block title="Largest parts">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {s.largest.map((p) => (
              <tr key={p.path}>
                <td style={td}>
                  <PartLink path={p.path} onSelect={onSelect} />
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatBytes(p.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
    </section>
  );
}
