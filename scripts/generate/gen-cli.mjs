#!/usr/bin/env node
/**
 * gen-cli — projects the `paged` binary's own command tree
 * (core/crates/paged-cli/cli.json, pulled by pull-sources) into
 * `.generated/cli.json` for the <CliReference> component.
 *
 * WHY THIS EXISTS. docs.paged.media documented four programmable surfaces and
 * the command line was not one of them — there was no `paged` page at all,
 * while the CLI grew from 11 to 31 of the engine's 62 message kinds. The
 * obvious fix is to write the page; the reason not to is that a hand-written
 * command reference is a SECOND statement of the tree, and it drifts the first
 * time someone adds a flag. clap already holds the tree, core walks it into a
 * committed artifact, and a test there fails when the artifact stops matching
 * the parser. This stage only reshapes it for the page.
 *
 * Grouping is editorial and lives here, not in the engine: the artifact is a
 * flat list of commands in declaration order, and a reader wants "author",
 * "read", "verify" rather than that order.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '.generated', 'sources', 'cli-surface', 'cli.json');
const GEN = join(ROOT, '.generated');

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const lock = readJSON(join(GEN, 'sources.lock.json')) ?? {};
const surface = readJSON(SRC);
mkdirSync(GEN, { recursive: true });

const EMPTY = {
  generatedAt: new Date().toISOString(),
  sourceCommit: null,
  binary: 'paged',
  about: null,
  protocol: null,
  commandCount: 0,
  groups: [],
};

if (!surface) {
  console.warn('gen-cli: no cli.json pulled — writing empty stub.');
  writeFileSync(join(GEN, 'cli.json'), JSON.stringify(EMPTY, null, 2));
  process.exit(0);
}

/**
 * Editorial grouping. A command missing from every list still appears —
 * under "Other" — because a generated reference that silently drops a
 * command is worse than an ugly one, and this file is exactly where a
 * new command would be forgotten.
 */
const GROUPS = [
  {
    title: 'Author',
    blurb: 'Make a document, or change one.',
    commands: ['new', 'script', 'gen'],
  },
  {
    title: 'Read',
    blurb: 'Ask the engine what a document holds — the same questions the editor’s Inspector asks.',
    commands: ['inspect', 'read', 'parts', 'describe'],
  },
  {
    title: 'Render and export',
    blurb: 'Produce the artefact.',
    commands: ['render', 'export'],
  },
  {
    title: 'Verify',
    blurb: 'Compare a result against a reference, deterministically.',
    commands: ['digest', 'diff'],
  },
  {
    title: 'Protocol',
    blurb: 'Speak the engine’s wire protocol directly.',
    commands: ['session'],
  },
];

const byName = new Map((surface.commands ?? []).map((c) => [c.name, c]));
const placed = new Set();
const groups = [];
for (const g of GROUPS) {
  const commands = g.commands.map((n) => byName.get(n)).filter(Boolean);
  for (const c of commands) placed.add(c.name);
  if (commands.length) groups.push({ title: g.title, blurb: g.blurb, commands });
}
const orphans = (surface.commands ?? []).filter((c) => !placed.has(c.name));
if (orphans.length) {
  console.warn(
    `gen-cli: ${orphans.length} command(s) in no group — add them to GROUPS: ${orphans
      .map((c) => c.name)
      .join(', ')}`,
  );
  groups.push({
    title: 'Other',
    blurb: 'Commands this page has not been taught to group yet.',
    commands: orphans,
  });
}

writeFileSync(
  join(GEN, 'cli.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceCommit: lock?.sources?.['cli-surface']?.sha ?? null,
      binary: surface.binary ?? 'paged',
      about: surface.about ?? null,
      protocol: surface.protocol ?? null,
      commandCount: (surface.commands ?? []).length,
      subcommandCount: (surface.commands ?? []).reduce(
        (n, c) => n + (c.subcommands?.length ?? 0),
        0,
      ),
      groups,
    },
    null,
    2,
  ),
);
console.log(
  `gen-cli: ${(surface.commands ?? []).length} commands in ${groups.length} groups → .generated/cli.json`,
);
