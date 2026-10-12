#!/usr/bin/env node
/**
 * gen-facts — evaluates data/facts.json against the pulled sources into
 *
 *   .generated/facts.json   read by <Fact id="…" /> and check:facts
 *   public/facts.json       served for paged.media and anyone else
 *
 * A fact is a number or licence the docs state about the platform, defined by
 * the file it comes from, never typed into a page. A fact that cannot be
 * evaluated fails the build: a missing source must not render as a stale or
 * empty number.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCES = join(ROOT, '.generated', 'sources');
const defs = JSON.parse(readFileSync(join(ROOT, 'data', 'facts.json'), 'utf8')).facts;

const pathOf = (from) => (from.startsWith('repo:') ? join(ROOT, from.slice(5)) : join(SOURCES, from));

function pointer(obj, ptr) {
  let v = obj;
  for (const k of ptr.split('/').slice(1)) {
    if (v == null) return undefined;
    v = v[k.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return v;
}

/** YAML registry rows (`- id: …`), optionally only those with a given status. */
function countRows(path, { status }) {
  const files = statSync(path).isDirectory()
    ? readdirSync(path).filter((n) => /\.ya?ml$/.test(n)).map((n) => join(path, n))
    : [path];
  let n = 0;
  for (const f of files) {
    const rows = readFileSync(f, 'utf8').split(/^- id:/m).slice(1);
    n += status ? rows.filter((r) => new RegExp(`^\\s+status:\\s*${status}\\s*$`, 'm').test(r)).length : rows.length;
  }
  return n;
}

function cliLeaves(cmds) {
  let n = 0;
  for (const c of cmds ?? []) n += c.subcommands?.length ? cliLeaves(c.subcommands) : 1;
  return n;
}

/** SPDX for people: `AGPL-3.0-only OR LicenseRef-PMEL` → `AGPL-3.0 or PMEL`. */
const human = (spdx) => spdx.replace(/LicenseRef-/g, '').replace(/-only\b/g, '').replace(/ OR /g, ' or ');

const out = {};
const errors = [];
for (const [id, d] of Object.entries(defs)) {
  try {
    let value;
    if ('value' in d) value = d.value;
    else {
      const p = pathOf(d.from);
      if (!existsSync(p)) throw new Error(`source ${d.from} not pulled`);
      if (d.rows) value = countRows(p, d.rows);
      else if (d.dirs) value = readdirSync(p).filter((n) => !(d.dirs.exclude ?? []).includes(n) && statSync(join(p, n)).isDirectory()).length;
      else if (d.regex) {
        const m = readFileSync(p, 'utf8').match(new RegExp(d.regex, 'm'));
        if (!m) throw new Error(`regex matched nothing in ${d.from}`);
        value = /^\d+$/.test(m[1]) ? Number(m[1]) : m[1];
      } else {
        const json = JSON.parse(readFileSync(p, 'utf8'));
        if (d.pointer) value = pointer(json, d.pointer);
        else if (d.length) value = pointer(json, d.length)?.length;
        else if (d.cliLeaves) value = cliLeaves(pointer(json, d.cliLeaves));
      }
    }
    if (value === undefined || value === null || value === '') throw new Error('evaluated to nothing');
    const display = d.license ? human(String(value)) : typeof value === 'number' ? value.toLocaleString('en-GB') : String(value);
    out[id] = { value, display, label: d.label, from: d.from ?? null };
  } catch (e) {
    errors.push(`${id}: ${e.message}`);
  }
}

if (errors.length) {
  console.error(`gen-facts: ${errors.length} fact(s) could not be evaluated:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
const doc = { generatedAt: new Date().toISOString(), count: Object.keys(out).length, facts: out };
mkdirSync(join(ROOT, '.generated'), { recursive: true });
writeFileSync(join(ROOT, '.generated', 'facts.json'), JSON.stringify(doc, null, 2));
mkdirSync(join(ROOT, 'public'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'facts.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(`gen-facts: ${doc.count} facts → .generated/facts.json, public/facts.json`);
