/**
 * validate:scripting — EXECUTE every seed + example against the real engine.
 *
 * Spawns `paged-run` (the native NDJSON engine session) and, per example, runs:
 *   new-blank → run-script <seed prelude> → run-script <example script>
 * asserting the run reports no error (and the seed itself ran clean). This is the
 * strong gate: it catches a script that references a renamed fn, passes a bad
 * value, or hits a failed precondition — the moment the engine changes.
 *
 * paged-run is found via $PAGED_RUN, else the sibling core debug/release build.
 * Build it with:  cargo build -p paged-run   (in ~/paged/core)
 *
 *   pnpm tsx scripts/scripting/validate.ts
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { SCRIPTING_EXAMPLES } from '../../data/scripting/examples';
import { SEED_PRELUDES } from '../../data/scripting/seeds';

const ROOT = process.cwd();

function findPagedRun(): string | null {
  if (process.env.PAGED_RUN && existsSync(process.env.PAGED_RUN)) return process.env.PAGED_RUN;
  for (const profile of ['release', 'debug']) {
    const p = join(ROOT, '..', 'core', 'target', profile, 'paged-run');
    if (existsSync(p)) return p;
  }
  return null;
}

/** One persistent paged-run process driven over NDJSON. */
class Session {
  private proc;
  private rl;
  private queue: Array<(v: any) => void> = [];

  constructor(bin: string) {
    this.proc = spawn(bin, [], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.rl = createInterface({ input: this.proc.stdout });
    this.rl.on('line', (line) => {
      const resolve = this.queue.shift();
      if (resolve) resolve(JSON.parse(line));
    });
  }
  private send(obj: unknown): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.proc.stdin.write(JSON.stringify(obj) + '\n');
    });
  }
  // The first line is the ready greeting.
  ready() {
    return new Promise<any>((resolve) => this.queue.push(resolve));
  }
  newBlank() {
    return this.send({ cmd: 'new-blank', width: 612, height: 792 });
  }
  runScript(source: string) {
    return this.send({ cmd: 'run-script', source });
  }
  quit() {
    this.proc.stdin.write(JSON.stringify({ cmd: 'quit' }) + '\n');
    this.proc.stdin.end();
  }
}

async function main() {
  const bin = findPagedRun();
  if (!bin) {
    console.error('validate:scripting: paged-run not found. Build it: (cd ../core && cargo build -p paged-run), or set $PAGED_RUN.');
    process.exit(2);
  }

  const session = new Session(bin);
  const greeting = await session.ready();
  console.log(`validate:scripting: paged-run protocol ${greeting.protocol}; ${SCRIPTING_EXAMPLES.length} examples to run.`);

  const failures: string[] = [];
  for (const ex of SCRIPTING_EXAMPLES) {
    await session.newBlank();
    const prelude = SEED_PRELUDES[ex.seed] ?? '';
    if (prelude) {
      const seedRes = await session.runScript(prelude);
      if (!seedRes.ok || seedRes.result?.error) {
        failures.push(`seed "${ex.seed}" (for ${ex.id}): ${seedRes.result?.error ?? 'failed'}`);
        continue;
      }
    }
    const res = await session.runScript(ex.script);
    const err = res.ok ? res.result?.error : res.error;
    const wantOk = ex.expectOk !== false;
    if (wantOk && err) failures.push(`example "${ex.id}" (${ex.fn}): ${err}`);
    if (ex.expectOutput) {
      const out: string[] = res.result?.output ?? [];
      for (const want of ex.expectOutput) {
        if (!out.some((l) => l.includes(want))) failures.push(`example "${ex.id}": expected output containing "${want}"; got ${JSON.stringify(out)}`);
      }
    }
  }
  session.quit();

  if (failures.length) {
    console.error(`validate:scripting: ${failures.length} failure(s):`);
    for (const f of failures) console.error('  ✗ ' + f);
    process.exit(1);
  }
  console.log(`validate:scripting: all ${SCRIPTING_EXAMPLES.length} examples executed clean against the engine.`);
}

main();
