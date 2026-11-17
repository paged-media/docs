/**
 * <PluginCapabilities /> — the plugin manifest's capability vocabulary and
 * contribution kinds, generated from the manifest JSON Schema
 * (`.generated/plugin-capabilities.json`, the ADR-019 source of truth).
 *
 *   <PluginCapabilities />                          everything
 *   <PluginCapabilities section="capabilities" | "contributions" | "manifest" />
 */
import { getPluginCapabilities } from '@/lib/generated';
import s from './scripting-catalog.module.css';

/**
 * The three vocabularies as ledgers (scripting-catalog.module.css): fixed
 * columns, so a long name, shape or value wraps in its cell; on a narrow column
 * each entry stacks under the column names.
 */

function Values({ values }: { values: string[] }) {
  if (!values?.length) return <span className={s.empty}>—</span>;
  return (
    <ul className={s.paths}>
      {values.map((v) => (
        <li key={v} className={s.path}>
          {v}
        </li>
      ))}
    </ul>
  );
}

function Capabilities() {
  const { capabilities } = getPluginCapabilities();
  if (!capabilities.length) return <Empty />;
  return (
    <div className={`not-prose ${s.catalog}`}>
      <table className={s.table}>
        <colgroup>
          <col className={s.colName} />
          <col className={s.colShape} />
          <col className={s.colValues} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Capability</th>
            <th scope="col">Shape</th>
            <th scope="col">Values</th>
            <th scope="col">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map((c) => (
            <tr key={c.name}>
              <td className={s.lead} data-label="Capability">
                <code className={s.form}>{c.name}</code>
              </td>
              <td data-label="Shape">
                <code className={s.returns}>{c.shape}</code>
              </td>
              <td data-label="Values">
                <Values values={c.values} />
              </td>
              <td data-label="Purpose" className={s.summary}>
                {c.description ?? ''}
              </td>
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
    <div className={`not-prose ${s.catalog}`}>
      <table className={s.table}>
        <colgroup>
          <col className={s.colName} />
          <col className={s.colShape} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Contributes</th>
            <th scope="col">Shape</th>
            <th scope="col">What it adds</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => (
            <tr key={c.name}>
              <td className={s.lead} data-label="Contributes">
                <code className={s.form}>{c.name}</code>
              </td>
              <td data-label="Shape">
                <code className={s.returns}>{c.shape}</code>
              </td>
              <td data-label="What it adds" className={s.summary}>
                {c.description ?? ''}
              </td>
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
    <div className={`not-prose ${s.catalog}`}>
      <table className={s.table}>
        <colgroup>
          <col className={s.colName} />
          <col className={s.colRequired} />
          <col className={s.colShape} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Required</th>
            <th scope="col">Shape</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {manifestFields.map((f) => (
            <tr key={f.name}>
              <td className={s.lead} data-label="Field">
                <code className={s.form}>{f.name}</code>
              </td>
              <td data-label="Required" className={s.summary}>
                {f.required ? 'required' : 'optional'}
              </td>
              <td data-label="Shape">
                <code className={s.returns}>{f.shape}</code>
              </td>
              <td data-label="Notes" className={s.summary}>
                {f.description ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className={`not-prose ${s.empty}`}>
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
