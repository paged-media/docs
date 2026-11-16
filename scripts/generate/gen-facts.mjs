#!/usr/bin/env node
/**
 * gen-facts — evaluates data/facts.json against the pulled sources into
 *
 *   .generated/facts.json   read by <Fact id="…" />, <FactLedger /> and check:facts
 *   public/facts.json       served for paged.media and anyone else
 *
 * A fact is a number or licence the docs state about the platform, defined by
 * the file it comes from, never typed into a page. A fact that cannot be
 * evaluated fails the build: a missing source must not render as a stale or
 * empty number.
 *
 * Every fact also carries its provenance: the authority and revision it was
 * read from, when that authority produced it, a link to check it against, and
 * the date after which it must not be shown as current. The output is a public
 * contract, additive only; its fields and the per-class policy are documented
 * in scripts/generate/facts-schema.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENSUS_FACT_DAYS, DAY_MS, RECORD_FACT_DAYS } from '../../lib/freshness.mjs';

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

function countFiles(dir, ext) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) n += countFiles(p, ext);
    else if (name.endsWith(ext)) n++;
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

// ── provenance ───────────────────────────────────────────────────────────────
// What the build knows about where each source came from: the lock pull-sources
// writes (per source: repo, ref, resolved commit and its date), the engine's
// release tags with their dates, the capability record, the census, and this
// repository's own commit.
const ORG = 'paged-media';
const DOCS_REPO = 'docs';
const DOCS_ORIGIN = 'https://docs.paged.media';
const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};
const lock = readJson(join(ROOT, '.generated', 'sources.lock.json'), { generatedAt: null, sources: {} });
const releases = (readJson(join(SOURCES, 'engine-releases.json'), { releases: [] }).releases ?? []).slice().sort((a, b) =>
  a.date < b.date ? -1 : 1,
);
const record = readJson(join(SOURCES, 'cockpit', 'public.json'), null);
const census = readJson(join(ROOT, 'data', 'idml-census.json'), null);

const iso = (t) => (t && !Number.isNaN(Date.parse(t)) ? new Date(Date.parse(t)).toISOString() : null);
const plusDays = (t, days) => (t ? new Date(Date.parse(t) + days * DAY_MS).toISOString() : null);
const sameCommit = (a, b) => !!a && !!b && (a.startsWith(b) || b.startsWith(a));

/** The commit core.pin names: its first non-comment, non-blank line. */
const corePin =
  readFileSync(join(ROOT, 'core.pin'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#')) ?? null;
const pinnedRelease = releases.find((r) => sameCommit(r.sha, corePin)) ?? null;
const nextRelease = pinnedRelease ? (releases.find((r) => r.date > pinnedRelease.date) ?? null) : null;

/** This repository's commit and its date (null outside a git checkout). */
function docsCommit() {
  try {
    const [sha, date] = execFileSync('git', ['-C', ROOT, 'log', '-1', '--format=%H %cI'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split(' ');
    return { sha, date: iso(date) };
  } catch {
    return { sha: null, date: null };
  }
}
const docs = docsCommit();

const RECORD_SOURCES = new Set(['cockpit', 'capability-matrix']);

/** The freshness class of a definition (facts-schema.md), unless it states one. */
function classOf(d) {
  if (d.class) return d.class;
  if (!d.from) return 'repo';
  if (d.from === 'repo:core.pin') return 'engine';
  if (d.from.startsWith('repo:')) return 'repo';
  const key = d.from.split('/')[0];
  if (RECORD_SOURCES.has(key)) return 'record';
  return sameCommit(lock.sources[key]?.sha, corePin) ? 'engine' : 'source';
}

/** The pulled source behind a `from`: its lock entry and its path in the source repository. */
function pulled(from) {
  const [key, ...rest] = from.split('/');
  const entry = lock.sources[key];
  if (!entry) return null;
  const file = rest.join('/');
  const path = entry.files?.[file] ?? entry.files?.[`${rest[0]}/`] ?? null;
  return { entry, path };
}

/** { class, observed_at, source, evidence_url, stale_after } for one definition. */
function provenanceOf(d) {
  const cls = classOf(d);
  if (cls === 'record') {
    const sha = lock.sources.cockpit?.sha ?? null;
    const observed = iso(record?.generated_at);
    return {
      class: cls,
      observed_at: observed,
      source: { authority: 'capability record', revision: sha ?? observed },
      evidence_url: `${DOCS_ORIGIN}/state/`,
      stale_after: plusDays(observed, RECORD_FACT_DAYS),
    };
  }
  if (cls === 'engine') {
    const p = d.from && !d.from.startsWith('repo:') ? pulled(d.from) : null;
    const ref = pinnedRelease?.tag ?? corePin;
    return {
      class: cls,
      observed_at: pinnedRelease ? iso(pinnedRelease.date) : null,
      source: { authority: 'engine release', revision: ref },
      evidence_url: p?.path
        ? `https://github.com/${ORG}/paged/blob/${p.entry.sha ?? corePin}/${p.path}`
        : ref
          ? `https://github.com/${ORG}/paged/tree/${ref}`
          : null,
      stale_after: nextRelease ? iso(nextRelease.date) : null,
    };
  }
  if (cls === 'source') {
    const p = pulled(d.from);
    const observed = iso(p?.entry.date) ?? iso(lock.generatedAt);
    return {
      class: cls,
      observed_at: observed,
      source: { authority: `${p?.entry.repo ?? 'paged'} ${p?.entry.ref ?? 'main'}`, revision: p?.entry.sha ?? null },
      evidence_url:
        p?.entry.sha && p.path ? `https://github.com/${ORG}/${p.entry.repo}/blob/${p.entry.sha}/${p.path}` : null,
      stale_after: plusDays(observed, RECORD_FACT_DAYS),
    };
  }
  if (cls === 'census') {
    const observed = iso(census?.generatedAt ?? census?.date ?? census?.generated_at);
    const file = d.from?.startsWith('repo:') ? d.from.slice(5) : null;
    return {
      class: cls,
      observed_at: observed,
      source: {
        authority: 'IDML corpus census',
        revision: [census?.schema, observed?.slice(0, 10)].filter(Boolean).join(' of ') || null,
      },
      evidence_url:
        file && !file.startsWith('.generated/') && docs.sha
          ? `https://github.com/${ORG}/${DOCS_REPO}/blob/${docs.sha}/${file}`
          : `https://github.com/${ORG}/${DOCS_REPO}/blob/${docs.sha ?? 'main'}/data/idml-census.json`,
      stale_after: plusDays(observed, CENSUS_FACT_DAYS),
    };
  }
  // repo: this repository's own files (or a value stated in the definition).
  const file = d.from?.startsWith('repo:') ? d.from.slice(5) : null;
  return {
    class: 'repo',
    observed_at: docs.date ?? null,
    source: { authority: `${ORG}/${DOCS_REPO}`, revision: docs.sha },
    evidence_url: file && docs.sha ? `https://github.com/${ORG}/${DOCS_REPO}/tree/${docs.sha}/${file}` : null,
    stale_after: null,
  };
}

// ── evaluate ─────────────────────────────────────────────────────────────────
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
      else if (d.dirs)
        value = readdirSync(p).filter(
          (n) =>
            !(d.dirs.exclude ?? []).includes(n) &&
            statSync(join(p, n)).isDirectory() &&
            (!d.dirs.with || existsSync(join(p, n, d.dirs.with))),
        ).length;
      else if (d.files) value = countFiles(p, d.files.ext);
      else if (d.regexCount) value = (readFileSync(p, 'utf8').match(new RegExp(d.regexCount, 'gm')) ?? []).length;
      else if (d.regex) {
        const m = readFileSync(p, 'utf8').match(new RegExp(d.regex, 'm'));
        if (!m) throw new Error(`regex matched nothing in ${d.from}`);
        value = /^\d+$/.test(m[1]) ? Number(m[1]) : m[1];
      } else {
        const json = JSON.parse(readFileSync(p, 'utf8'));
        if (d.pointer) value = pointer(json, d.pointer);
        else if (d.length) value = pointer(json, d.length)?.length;
        else if (d.keys) value = Object.keys(pointer(json, d.keys) ?? {}).length;
        else if (d.cliLeaves) value = cliLeaves(pointer(json, d.cliLeaves));
        else if (d.dependsOn) value = d.dependsOn.names.filter((n) => n in (pointer(json, d.dependsOn.pointer) ?? {}));
      }
    }
    if (value === undefined || value === null || value === '') throw new Error('evaluated to nothing');
    const display = d.license
      ? human(String(value))
      : Array.isArray(value)
        ? value.join(', ')
        : typeof value === 'number'
          ? value.toLocaleString('en-GB')
          : String(value);
    const prov = provenanceOf(d);
    // A definition may name the page a reader checks the value on (`evidence`).
    if (d.evidence) prov.evidence_url = d.evidence;
    out[id] = { value, display, label: d.label, from: d.from ?? null, ...prov };
  } catch (e) {
    errors.push(`${id}: ${e.message}`);
  }
}

if (errors.length) {
  console.error(`gen-facts: ${errors.length} fact(s) could not be evaluated:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
const doc = {
  schema: 'paged.docs.facts/2',
  generatedAt: new Date().toISOString(),
  count: Object.keys(out).length,
  policy: { record_days: RECORD_FACT_DAYS, census_days: CENSUS_FACT_DAYS, engine: 'next-tag' },
  facts: out,
};
mkdirSync(join(ROOT, '.generated'), { recursive: true });
writeFileSync(join(ROOT, '.generated', 'facts.json'), JSON.stringify(doc, null, 2));
mkdirSync(join(ROOT, 'public'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'facts.json'), JSON.stringify(doc, null, 2) + '\n');
const undated = Object.entries(out)
  .filter(([, f]) => !f.observed_at)
  .map(([id]) => id);
console.log(
  `gen-facts: ${doc.count} facts → .generated/facts.json, public/facts.json` +
    (undated.length ? ` (${undated.length} without an observed date: ${undated.join(', ')})` : ''),
);
