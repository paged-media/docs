#!/usr/bin/env node
/**
 * pull-sources — the FIRST stage of the docs generation pipeline.
 *
 * Reads `sources.pin` and fetches every machine-readable source the docs are
 * generated from (the state registry, the engine capability catalog, the plugin
 * manifest schema, the server OpenAPI spec, and the cross-repo commit feed) into
 * `.generated/sources/`. The downstream `gen-*` stages read ONLY from there, so
 * the rest of the pipeline is offline + deterministic.
 *
 * Two modes, chosen per-source:
 *   - LOCAL (default when the sibling working copy exists under ~/paged/<repo>):
 *     copy the file straight from disk. Ideal for local iteration against the
 *     live workspace — what you see is what's on your machine right now.
 *     Exception: a source whose `ref` is "core.pin", or a commit sha, is read
 *     at that commit (`git show <sha>:<path>`), never from the working tree, so
 *     a stale or dirty local core cannot leak into the build (the catalog read a
 *     clone 7 protocols behind once, 2026-10-11).
 *   - REMOTE (forced with --remote, or used when no sibling exists): pull from
 *     GitHub at the pinned ref via `gh api` (token-authenticated, so private
 *     repos work). The resolved commit SHA is recorded for provenance.
 *
 * A single source failing (e.g. an unreachable private repo in a thin CI) is a
 * WARNING, not a hard stop — we write what we can and record the gap in
 * `.generated/sources.lock.json`. The gen-* stages degrade gracefully when a
 * source is absent. Pass --strict to turn any failure into exit 1 (CI gate).
 *
 * Usage: node scripts/generate/pull-sources.mjs [--remote] [--strict]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIBLINGS = resolve(ROOT, '..'); // ~/paged
const OUT = join(ROOT, '.generated', 'sources');
const PIN = JSON.parse(readFileSync(join(ROOT, 'sources.pin'), 'utf8'));

const REMOTE = process.argv.includes('--remote');
// --strict (or DOCS_SOURCES_STRICT=true, set by CI when the source token is
// present) fails the build when a data source cannot be pulled. The activity
// feed is decoration and never fails it.
const STRICT = process.argv.includes('--strict') || process.env.DOCS_SOURCES_STRICT === 'true';
const ORG = PIN.org;

const warnings = [];
function warn(msg) {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
}

// state.json is multi-MB; the default 1 MB stdout buffer overflows (ENOBUFS).
const MAX_BUFFER = 256 * 1024 * 1024;

/** Run a command, returning stdout (trimmed) or throwing. */
function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: MAX_BUFFER }).trim();
}

/** Resolve a git ref to a commit SHA on GitHub (or null if unreachable). */
function resolveSha(repo, ref) {
  try {
    return sh('gh', ['api', `repos/${ORG}/${repo}/commits/${ref}`, '--jq', '.sha']);
  } catch {
    return null;
  }
}

/** Fetch one file's raw bytes from GitHub at ref. */
function fetchRemote(repo, path, ref) {
  return execFileSync(
    'gh',
    ['api', `repos/${ORG}/${repo}/contents/${path}?ref=${ref}`, '-H', 'Accept: application/vnd.github.raw'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: MAX_BUFFER },
  );
}

/** The commit core.pin names: its first non-comment, non-blank line. */
function corePinSha() {
  const line = readFileSync(join(ROOT, 'core.pin'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!line || !/^[0-9a-f]{7,40}$/.test(line)) throw new Error('core.pin: no commit sha found');
  return line;
}

/** A file at a commit in a local clone, fetching once if the commit is absent. */
function showLocal(repoDir, sha, path) {
  try {
    sh('git', ['-C', repoDir, 'cat-file', '-e', `${sha}^{commit}`]);
  } catch {
    sh('git', ['-C', repoDir, 'fetch', '--quiet', 'origin']);
  }
  return execFileSync('git', ['-C', repoDir, 'show', `${sha}:${path}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: MAX_BUFFER,
  });
}

/** Local sibling commit SHA for provenance (best-effort). */
function localSha(repoDir) {
  try {
    return sh('git', ['-C', repoDir, 'rev-parse', 'HEAD']);
  } catch {
    return null;
  }
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

// Fresh start so a deleted source doesn't linger.
rmSync(join(ROOT, '.generated', 'sources'), { recursive: true, force: true });
ensureDir(OUT);

const lock = {
  generatedAt: new Date().toISOString(),
  mode: REMOTE ? 'remote' : 'local-preferred',
  org: ORG,
  sources: {},
  activity: {},
  warnings,
};

console.log(`pull-sources → ${OUT}  (${lock.mode})`);

// ── data sources ──────────────────────────────────────────────────────────
for (const [key, src] of Object.entries(PIN.sources)) {
  // Plugin repos live one level down (~/paged/plugins/<repo>).
  const repoDir = [join(SIBLINGS, src.repo), join(SIBLINGS, 'plugins', src.repo)].find((d) => existsSync(d)) ?? join(SIBLINGS, src.repo);
  // `remote: true` marks a file CI produces (cockpit's export): the sibling
  // working copy may be on any branch and need not have it, so always fetch.
  const useLocal = !REMOTE && !src.remote && existsSync(repoDir);
  // A source pinned to a commit (core.pin, or a sha in `ref`) is read at that
  // commit, never from the working tree.
  const pinned = src.ref === 'core.pin' ? corePinSha() : /^[0-9a-f]{7,40}$/.test(src.ref) ? src.ref : null;
  const ref = pinned ?? src.ref;
  const keyDir = join(OUT, key);
  ensureDir(keyDir);
  const entry = { repo: src.repo, ref, mode: useLocal ? 'local' : 'remote', sha: null, files: {} };

  for (const [outName, relPath] of Object.entries(src.files)) {
    const dest = join(keyDir, outName);
    try {
      if (useLocal && pinned) {
        writeFileSync(dest, showLocal(repoDir, pinned, relPath));
      } else if (useLocal) {
        const from = join(repoDir, relPath);
        if (!existsSync(from)) throw new Error(`missing local file ${from}`);
        copyFileSync(from, dest);
      } else {
        writeFileSync(dest, fetchRemote(src.repo, relPath, ref));
      }
      entry.files[outName] = relPath;
      console.log(`  ✓ ${key}/${outName}  ← ${src.repo}/${relPath} (${entry.mode})`);
    } catch (e) {
      warn(`${key}/${outName}: ${e.message.split('\n')[0]}`);
    }
  }
  // `dirs` copies every file of a folder (a plugin's registry/functions/*.yaml),
  // so a generator can count rows spread across files.
  for (const [outName, relDir] of Object.entries(src.dirs ?? {})) {
    const destDir = join(keyDir, outName);
    ensureDir(destDir);
    try {
      let names;
      if (useLocal && !pinned) {
        const from = join(repoDir, relDir);
        if (!existsSync(from)) throw new Error(`missing local folder ${from}`);
        names = readdirSync(from).filter((n) => !n.startsWith('.'));
        for (const n of names) copyFileSync(join(from, n), join(destDir, n));
      } else {
        const listing = JSON.parse(sh('gh', ['api', `repos/${ORG}/${src.repo}/contents/${relDir}?ref=${ref}`]));
        names = listing.filter((x) => x.type === 'file').map((x) => x.name);
        for (const n of names) writeFileSync(join(destDir, n), fetchRemote(src.repo, `${relDir}/${n}`, ref));
      }
      if (names.length === 0) throw new Error(`empty folder ${relDir}`);
      entry.files[`${outName}/`] = relDir;
      console.log(`  ✓ ${key}/${outName}/ (${names.length} files)  ← ${src.repo}/${relDir} (${entry.mode})`);
    } catch (e) {
      warn(`${key}/${outName}/: ${e.message.split('\n')[0]}`);
    }
  }
  entry.sha = pinned ?? (useLocal ? localSha(repoDir) : resolveSha(src.repo, ref));
  lock.sources[key] = entry;
}

// ── cross-repo activity feed ────────────────────────────────────────────────
const act = PIN.activity || { repos: [], perRepo: 10 };
const activity = {};
for (const repo of act.repos) {
  try {
    const json = sh('gh', [
      'api',
      `repos/${ORG}/${repo}/commits?per_page=${act.perRepo}`,
      '--jq',
      '[.[] | {sha: .sha, date: .commit.author.date, author: (.author.login // .commit.author.name), message: (.commit.message | split("\\n")[0]), url: .html_url}]',
    ]);
    activity[repo] = JSON.parse(json);
    console.log(`  ✓ activity/${repo} (${activity[repo].length} commits)`);
    lock.activity[repo] = activity[repo].length;
  } catch (e) {
    console.warn(`  ! activity/${repo}: ${e.message.split('\n')[0]}`);
    activity[repo] = [];
    lock.activity[repo] = 0;
  }
}
writeFileSync(join(OUT, 'activity.json'), JSON.stringify(activity, null, 2));

writeFileSync(join(ROOT, '.generated', 'sources.lock.json'), JSON.stringify(lock, null, 2));

if (warnings.length) {
  console.warn(`pull-sources: ${warnings.length} warning(s).`);
  if (STRICT) {
    console.error('pull-sources --strict: failing on warnings.');
    process.exit(1);
  }
} else {
  console.log('pull-sources: all sources pulled cleanly.');
}
