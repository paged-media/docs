/**
 * <CliReference /> — the `paged` command line, generated from the binary's own
 * parser (`.generated/cli.json`, walked out of clap by core's
 * `emit-cli-surface` example).
 *
 * Nothing here is hand-listed. A command, a flag, a default or a help string
 * added in `crates/paged-cli` appears on the next build, and a page that lags
 * the binary is the failure this replaces: the CLI grew from 11 to 31 of the
 * engine's 62 message kinds while this site documented it not at all.
 *
 *   <CliReference />                the grouped command reference
 *   <CliReference section="summary" />   one line per command, no flags
 */
import { getCli, type CliArg, type CliCommand } from '@/lib/generated';

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 };
const muted: React.CSSProperties = { color: 'var(--color-muted)', fontSize: 12.5 };

/** `-o, --out <FILE>` / `--dpi <N>` / `<doc>` — the shape a reader types.
 *  Both spellings when a flag has both: the short one is what people
 *  actually type and omitting it makes the page less useful than
 *  `--help`. */
function usage(arg: CliArg): string {
  if (arg.positional) return arg.required ? `<${arg.name}>` : `[${arg.name}]`;
  const value = arg.valueNames?.length
    ? arg.valueNames.join('> <')
    : arg.name.toUpperCase().replaceAll('-', '_');
  const spellings = [arg.short ? `-${arg.short}` : null, arg.long ? `--${arg.long}` : null]
    .filter(Boolean)
    .join(', ');
  const flag = spellings || arg.name;
  return arg.takesValues ? `${flag} <${value}>` : flag;
}

function Args({ args, path }: { args: CliArg[]; path: string }) {
  if (!args.length) return null;
  return (
    <ul className="not-prose" style={{ margin: '4px 0 10px', padding: 0, listStyle: 'none' }}>
      {args.map((a) => (
        <li key={`${path}:${a.name}`} style={{ marginBottom: 3, lineHeight: 1.45 }}>
          <code style={{ ...mono, fontWeight: 600 }}>{usage(a)}</code>
          {a.repeatable ? <span style={muted}> (repeatable)</span> : null}
          {a.help ? <span style={muted}> — {a.help}</span> : null}
          {a.defaults.length ? (
            <span style={muted}>
              {a.help ? ' ' : ' — '}Default <code style={mono}>{a.defaults.join(' ')}</code>.
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Cmd({ cmd, prefix }: { cmd: CliCommand; prefix: string }) {
  const path = `${prefix} ${cmd.name}`.trim();
  return (
    <div style={{ margin: '0 0 18px' }}>
      <div style={{ ...mono, fontSize: 14, fontWeight: 640 }}>{path}</div>
      {cmd.about ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, margin: '2px 0 4px', lineHeight: 1.5 }}>
          {cmd.about}
        </p>
      ) : null}
      <Args args={cmd.args} path={path} />
      {cmd.subcommands.length ? (
        <div style={{ borderLeft: '1px solid var(--color-rule)', paddingLeft: 14, marginTop: 6 }}>
          {cmd.subcommands.map((s) => (
            <Cmd key={s.name} cmd={s} prefix={path} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Empty() {
  return (
    <p className="not-prose" style={{ color: 'var(--color-muted)', fontSize: 13 }}>
      No CLI surface data. Run <code>pnpm generate:docs</code>.
    </p>
  );
}

function Summary() {
  const { groups, binary } = getCli();
  if (!groups.length) return <Empty />;
  return (
    <ul className="not-prose" style={{ margin: '1rem 0', padding: 0, listStyle: 'none' }}>
      {groups.flatMap((g) =>
        g.commands.map((c) => (
          <li key={c.name} style={{ marginBottom: 5, lineHeight: 1.45 }}>
            <code style={{ ...mono, fontWeight: 600 }}>
              {binary} {c.name}
            </code>
            {c.about ? <span style={muted}> — {c.about}</span> : null}
          </li>
        )),
      )}
    </ul>
  );
}

export function CliReference({ section }: { section?: 'summary' }) {
  const { groups, binary, commandCount, subcommandCount } = getCli();
  if (section === 'summary') return <Summary />;
  if (!groups.length) return <Empty />;
  return (
    <div className="not-prose" style={{ margin: '1.25rem 0' }}>
      <div style={{ ...mono, color: 'var(--color-accent)', fontSize: 11.5, marginBottom: 14 }}>
        {commandCount} commands · {subcommandCount} subcommands · generated from the parser
      </div>
      {groups.map((g) => (
        <section key={g.title} style={{ marginBottom: 26 }}>
          <h3
            style={{
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 17,
              fontWeight: 640,
              margin: '0 0 2px',
            }}
          >
            {g.title}
          </h3>
          <p style={{ ...muted, fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>{g.blurb}</p>
          {g.commands.map((c) => (
            <Cmd key={c.name} cmd={c} prefix={binary} />
          ))}
        </section>
      ))}
    </div>
  );
}
