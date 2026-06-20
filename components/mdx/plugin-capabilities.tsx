/**
 * <PluginCapabilities /> — the plugin manifest's capability vocabulary and
 * contribution kinds, generated from the manifest JSON Schema
 * (`.generated/plugin-capabilities.json`, the ADR-019 source of truth).
 *
 *   <PluginCapabilities />                          everything
 *   <PluginCapabilities section="capabilities" | "contributions" | "manifest" />
 */
import { getPluginCapabilities } from '@/lib/generated';

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 640,
  letterSpacing: '0.04em',
  color: 'var(--color-muted)',
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-rule)',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid color-mix(in srgb, var(--color-rule) 55%, transparent)', verticalAlign: 'top' };
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12 };

function Values({ values }: { values: string[] }) {
  if (!values?.length) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {values.map((v) => (
        <code key={v} style={{ ...mono, fontSize: 11, background: 'color-mix(in srgb, var(--color-rule) 14%, transparent)', borderRadius: 3, padding: '0 5px' }}>
          {v}
        </code>
      ))}
    </span>
  );
}

function Capabilities() {
  const { capabilities } = getPluginCapabilities();
  if (!capabilities.length) return <Empty />;
  return (
    <div className="not-prose" style={{ overflowX: 'auto', margin: '1rem 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={TH}>Capability</th>
            <th style={TH}>Shape</th>
            <th style={TH}>Values</th>
            <th style={TH}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map((c) => (
            <tr key={c.name}>
              <td style={{ ...TD, ...mono, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}</td>
              <td style={{ ...TD, ...mono, color: 'var(--color-muted)' }}>{c.shape}</td>
              <td style={TD}>
                <Values values={c.values} />
              </td>
              <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>{c.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Contributions() {
  const { contributions } = getPluginCapabilities();
  if (!contributions.length) return <Empty />;
  return (
    <div className="not-prose" style={{ overflowX: 'auto', margin: '1rem 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={TH}>Contributes</th>
            <th style={TH}>Shape</th>
            <th style={TH}>What it adds</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => (
            <tr key={c.name}>
              <td style={{ ...TD, ...mono, fontWeight: 600 }}>{c.name}</td>
              <td style={{ ...TD, ...mono, color: 'var(--color-muted)' }}>{c.shape}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>{c.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManifestFields() {
  const { manifestFields } = getPluginCapabilities();
  if (!manifestFields.length) return <Empty />;
  return (
    <div className="not-prose" style={{ overflowX: 'auto', margin: '1rem 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={TH}>Field</th>
            <th style={TH}>Required</th>
            <th style={TH}>Shape</th>
            <th style={TH}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {manifestFields.map((f) => (
            <tr key={f.name}>
              <td style={{ ...TD, ...mono, fontWeight: 600 }}>{f.name}</td>
              <td style={{ ...TD, color: f.required ? 'var(--warn)' : 'var(--color-muted)' }}>{f.required ? 'required' : 'optional'}</td>
              <td style={{ ...TD, ...mono, color: 'var(--color-muted)' }}>{f.shape}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-sans)' }}>{f.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
      No plugin manifest data. Run <code>pnpm generate:docs</code>.
    </p>
  );
}

export function PluginCapabilities({ section }: { section?: 'capabilities' | 'contributions' | 'manifest' }) {
  if (section === 'capabilities') return <Capabilities />;
  if (section === 'contributions') return <Contributions />;
  if (section === 'manifest') return <ManifestFields />;
  return (
    <>
      <ManifestFields />
      <Capabilities />
      <Contributions />
    </>
  );
}
