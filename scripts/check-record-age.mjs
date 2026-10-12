#!/usr/bin/env node
/**
 * check:record-age — the capability record the docs are built from must be
 * recent. Cockpit's export workflow refreshes it nightly; a record older than
 * MAX_DAYS means that pipeline stopped, and the pages would show quietly old
 * health. Fails the build instead.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_DAYS = 7;
let record;
try {
  record = JSON.parse(readFileSync(join(ROOT, '.generated', 'sources', 'cockpit', 'public.json'), 'utf8'));
} catch {
  console.error('check:record-age: no capability record pulled (.generated/sources/cockpit/public.json) — run pnpm generate:docs');
  process.exit(1);
}
const days = (Date.now() - Date.parse(record.generated_at)) / 86_400_000;
if (!(days <= MAX_DAYS)) {
  console.error(
    `check:record-age: the capability record is from ${record.generated_at} (${days.toFixed(1)} days old, limit ${MAX_DAYS}). ` +
      'Check the export workflow in paged-media/cockpit.',
  );
  process.exit(1);
}
console.log(`check:record-age: OK — record from ${record.generated_at} (${days.toFixed(1)} days old, ${record.totals?.features} features)`);
