/**
 * What a page can say about the evidence it was built from: the engine release
 * the docs pin, the capability record's date and age, and which engine release
 * was current on a given day. Server components only (they read `.generated/`).
 *
 * The policies live in lib/freshness.mjs, shared with the build gates.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getFacts } from '@/lib/generated';
import { DAY_MS, RECORD_MAX_DAYS } from '@/lib/freshness.mjs';

export interface EngineRelease {
  tag: string;
  sha: string;
  /** When the tag was made (the tagger's date, or the commit's for a lightweight tag). */
  date: string;
}

let _releases: EngineRelease[] | undefined;
/** Engine release tags with their dates, oldest first (pull-sources; empty when GitHub was unreachable). */
export function getEngineReleases(): EngineRelease[] {
  if (_releases) return _releases;
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), '.generated', 'sources', 'engine-releases.json'), 'utf8'));
    _releases = (raw.releases ?? []) as EngineRelease[];
  } catch {
    _releases = [];
  }
  return _releases;
}

/** The newest engine release tagged on or before `day` (`YYYY-MM-DD`). */
export function releaseOn(day: string): EngineRelease | null {
  let found: EngineRelease | null = null;
  for (const r of getEngineReleases()) if (r.date.slice(0, 10) <= day) found = r;
  return found;
}

/** A tag's tree on GitHub: the release channel is tags and npm, not GitHub Releases. */
export function releaseUrl(tag: string): string {
  return `https://github.com/paged-media/paged/tree/${tag}`;
}

export interface RecordState {
  /** The engine release `core.pin` names, `v0.77.0`. */
  engine: string | null;
  /** When cockpit exported the capability record (ISO timestamp). */
  recordAt: string | null;
  /** Older than RECORD_MAX_DAYS when this page was built. */
  stale: boolean;
}

/** The engine release and capability record this build used, and whether the record was current. */
export function recordState(now: number = Date.now()): RecordState {
  const { facts } = getFacts();
  const engine = facts['engine.version']?.display ?? null;
  const recordAt = (facts['record.generatedAt']?.value as string | undefined) ?? null;
  const stale = recordAt ? !(now - Date.parse(recordAt) <= RECORD_MAX_DAYS * DAY_MS) : true;
  return { engine, recordAt, stale };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** `2026-10-11` or an ISO timestamp → `11 Oct 2026` (the UTC day; no locale, so build and reader agree). */
export function formatDay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
