/**
 * check-corpus — pin the docs scripting example corpus to the engine catalog.
 *
 * Asserts that every host function and settable path referenced by
 * `data/scripting/examples.ts` actually exists in the generated catalog
 * (`.generated/scripting.json`, projected from core's paged-introspect catalog).
 * A renamed or removed fn/path breaks the build loudly here, so the examples can
 * never silently drift from the engine.
 *
 * This is the cheap, always-on guard. The heavier gate — actually EXECUTING each
 * example + seed against the real engine via `paged-run` built from core.pin —
 * lives in `scripts/scripting/validate.ts` (run in CI).
 *
 *   pnpm tsx scripts/scripting/check-corpus.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPTING_EXAMPLES } from '../../data/scripting/examples';
import { PATH_THEMES } from '../../data/scripting/themes';

const ROOT = process.cwd();

/**
 * Registry rows from the sibling state repo, if present. Examples carry a
 * `feature` linking to a `scripting.*` capability row; we assert it resolves so
 * the docs and the capability registry stay in lockstep. Skipped silently when
 * the state checkout is absent (e.g. docs CI without a sibling state repo).
 */
function registryFeatureIds(): Set<string> | null {
  const p = join(ROOT, '..', 'state', 'registry', 'features', 'scripting.yaml');
  if (!existsSync(p)) return null;
  const ids = new Set<string>();
  for (const m of readFileSync(p, 'utf8').matchAll(/^-\s*id:\s*([\w.-]+)/gm)) ids.add(m[1]);
  return ids;
}

interface Catalog {
  hostFunctionGroups?: Array<{ kind: string; functions: Array<{ name: string }> }>;
  settablePaths?: string[];
}

function loadCatalog(): Catalog {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.generated', 'scripting.json'), 'utf8')) as Catalog;
  } catch {
    console.error('check-corpus: .generated/scripting.json not found — run `pnpm generate:docs` first.');
    process.exit(2);
  }
}

const cat = loadCatalog();
const fns = new Set<string>();
for (const g of cat.hostFunctionGroups ?? []) for (const f of g.functions) fns.add(f.name);
const paths = new Set<string>(cat.settablePaths ?? []);

const errors: string[] = [];
for (const ex of SCRIPTING_EXAMPLES) {
  const referencedFns = [ex.fn, ...(ex.alsoFns ?? [])];
  for (const fn of referencedFns) {
    if (!fns.has(fn)) errors.push(`example "${ex.id}": host fn ${fn} is not in the catalog`);
  }
  for (const p of ex.paths ?? []) {
    if (!paths.has(p)) errors.push(`example "${ex.id}": settable path ${p} is not in the catalog`);
  }
}

for (const theme of PATH_THEMES) {
  for (const p of theme.demoPaths) {
    if (!paths.has(p)) errors.push(`theme "${theme.id}": demo path ${p} is not in the catalog`);
  }
}

const features = registryFeatureIds();
let featureChecked = 0;
if (features) {
  for (const ex of SCRIPTING_EXAMPLES) {
    const f = (ex as { feature?: string }).feature;
    if (!f) continue;
    featureChecked++;
    if (!features.has(f)) errors.push(`example "${ex.id}": feature ${f} is not a row in state registry scripting.yaml`);
  }
}

/**
 * Engine back-tests from the sibling core repo, if present: every example must
 * be backed by a real paged-script test (its `test` fn must exist, and its id
 * must be referenced in a test file). Skipped silently when core is absent.
 */
function coreTestText(): string | null {
  const dir = join(ROOT, '..', 'core', 'crates', 'paged-script', 'tests');
  if (!existsSync(dir)) return null;
  let text = '';
  for (const f of ['dtp_examples.rs', 'scripting_feature_evidence.rs', 'script_basics.rs']) {
    const p = join(dir, f);
    if (existsSync(p)) text += readFileSync(p, 'utf8') + '\n';
  }
  return text || null;
}

const coreTests = coreTestText();
let testChecked = 0;
if (coreTests) {
  const fnNames = new Set<string>();
  for (const m of coreTests.matchAll(/\bfn\s+([a-zA-Z0-9_]+)\s*\(/g)) fnNames.add(m[1]);
  for (const ex of SCRIPTING_EXAMPLES) {
    const t = (ex as { test?: string }).test;
    if (!t) {
      errors.push(`example "${ex.id}": no backing test (test field unset)`);
      continue;
    }
    testChecked++;
    if (!fnNames.has(t)) errors.push(`example "${ex.id}": backing test fn ${t} not found in paged-script tests`);
    if (!coreTests.includes(ex.id)) errors.push(`example "${ex.id}": id is not referenced in any paged-script test`);
  }
}

if (errors.length) {
  console.error(`check-corpus: ${errors.length} example(s) reference engine symbols that no longer exist:`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

console.log(
  `check-corpus: ${SCRIPTING_EXAMPLES.length} examples + ${PATH_THEMES.length} path themes OK — all fns/paths present in the catalog (${fns.size} fns, ${paths.size} paths)` +
    (features ? `; ${featureChecked} feature links resolve in the registry` : '') +
    (coreTests ? `; ${testChecked} examples backed by a paged-script test` : '') +
    '.',
);
