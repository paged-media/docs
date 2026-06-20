/**
 * Server-side loader for the generated cross-repo data (`.generated/`, produced
 * by `pnpm generate:docs` before every build). Read via `fs` rather than a
 * static `import` so a fresh checkout that hasn't run the generator yet still
 * builds — pages degrade to an empty/"not generated" state instead of breaking.
 *
 * These getters are for SERVER components only (they touch the filesystem).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GEN = join(process.cwd(), '.generated');

function load<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(GEN, name), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

// ── shapes (mirror scripts/generate/gen-matrix.mjs output) ───────────────────
export type Impl = 'shipped' | 'partial' | 'planned' | 'deferred' | 'na';
export type Evidence = 'green' | 'red' | 'flaky' | 'none';
export type BadgeTone = 'valid' | 'valid-muted' | 'warn' | 'muted';

export interface BadgeInfo {
  key: string;
  label: string;
  tone: BadgeTone;
}
export interface StageCell {
  impl: Impl;
  evidence: Evidence;
  present?: boolean;
  note?: string | null;
}
export interface SupportFeature {
  id: string;
  title: string;
  chapter: string;
  status: string | null;
  achievedLevel: string | null;
  updatedAt: string | null;
  badge: BadgeInfo;
  parser: StageCell;
  renderer: StageCell;
  mutation: StageCell;
}
export interface SupportMap {
  generatedAt: string;
  sourceCommit: string | null;
  count: number;
  features: Record<string, SupportFeature>;
}

export interface MatrixFeature {
  id: string;
  title: string;
  status: string | null;
  achievedLevel: string | null;
  isRed: boolean;
  isShippedUntested: boolean;
  cells: Record<string, { impl: Impl; evidence: Evidence }>;
}
export interface MatrixChapter {
  chapter: string;
  title: string;
  group: string;
  total: number;
  shippedPct: number | null;
  greenPct: number | null;
  trend: string | null;
  features: MatrixFeature[];
}
export interface Headline {
  total?: number;
  shipped?: number;
  shipped_pct?: number;
  green_of_shipped?: number;
  green_pct?: number;
  failing?: number;
  shipped_untested?: number;
  coverage_gaps?: number;
  drift?: number;
  open_bugs?: number;
}
export interface Matrix {
  generatedAt: string;
  sourceCommit: string | null;
  generatedFromRegistryCount: number;
  headline: Headline;
  stages: Array<{ id: string; title: string; group: string }>;
  chapters: MatrixChapter[];
}

// ── getters ──────────────────────────────────────────────────────────────────
const EMPTY_SUPPORT: SupportMap = { generatedAt: '', sourceCommit: null, count: 0, features: {} };
const EMPTY_MATRIX: Matrix = {
  generatedAt: '',
  sourceCommit: null,
  generatedFromRegistryCount: 0,
  headline: {},
  stages: [],
  chapters: [],
};

let _support: SupportMap | undefined;
export function getSupportMap(): SupportMap {
  return (_support ??= load('support-map.json', EMPTY_SUPPORT));
}
export function getSupportFeature(id: string): SupportFeature | undefined {
  return getSupportMap().features[id];
}

let _matrix: Matrix | undefined;
export function getMatrix(): Matrix {
  return (_matrix ??= load('matrix.json', EMPTY_MATRIX));
}

export interface ConformanceLevel {
  level: string;
  claimed: boolean;
  verified: boolean;
}
export interface ConformanceFeature {
  id: string;
  title: string;
  chapter: string;
  status: string | null;
  achievedLevel: string | null;
  levels: ConformanceLevel[];
  corpusDocs: number;
}
export interface Conformance {
  generatedAt: string;
  sourceCommit: string | null;
  features: ConformanceFeature[];
}
export function getConformance(): Conformance {
  const raw = load<{ generatedAt: string; sourceCommit: string | null; data: unknown }>('conformance.json', {
    generatedAt: '',
    sourceCommit: null,
    data: null,
  });
  const data = (raw.data ?? {}) as { features?: Array<Record<string, unknown>> };
  const features: ConformanceFeature[] = (data.features ?? []).map((f) => ({
    id: String(f.id),
    title: String(f.title ?? f.id),
    chapter: String(f.chapter ?? ''),
    status: (f.status as string) ?? null,
    achievedLevel: (f.achieved_level as string) ?? null,
    levels: ((f.levels as ConformanceLevel[]) ?? []),
    corpusDocs: Number(f.corpus_docs ?? 0),
  }));
  return { generatedAt: raw.generatedAt, sourceCommit: raw.sourceCommit, features };
}

// ── scripting (Boa paged.* catalog) ──────────────────────────────────────────
export interface HostFn {
  name: string;
  params: string;
  returns: string;
  kind: string;
  summary: string;
}
export interface Scripting {
  generatedAt: string;
  sourceCommit: string | null;
  hostFunctionCount: number;
  settablePathCount: number;
  hostFunctionGroups: Array<{ kind: string; functions: HostFn[] }>;
  idGrammar: Array<{ form: string; example: string; note: string }>;
  settablePaths: string[];
  constraints: string[];
}
export function getScripting(): Scripting {
  return load('scripting.json', {
    generatedAt: '',
    sourceCommit: null,
    hostFunctionCount: 0,
    settablePathCount: 0,
    hostFunctionGroups: [],
    idGrammar: [],
    settablePaths: [],
    constraints: [],
  });
}

// ── plugin SDK (manifest capability vocabulary) ──────────────────────────────
export interface CapabilityDef {
  name: string;
  description: string | null;
  shape: string;
  values: string[];
}
export interface PluginCapabilities {
  generatedAt: string;
  sourceCommit: string | null;
  title: string;
  manifestFields: Array<{ name: string; required: boolean; description: string | null; shape: string; values: string[] }>;
  capabilities: CapabilityDef[];
  contributions: Array<{ name: string; description: string | null; shape: string }>;
}
export function getPluginCapabilities(): PluginCapabilities {
  return load('plugin-capabilities.json', {
    generatedAt: '',
    sourceCommit: null,
    title: '',
    manifestFields: [],
    capabilities: [],
    contributions: [],
  });
}

// ── REST API (editor-server OpenAPI) ─────────────────────────────────────────
export interface Endpoint {
  method: string;
  path: string;
  operationId: string | null;
  summary: string | null;
  description: string | null;
  deprecated: boolean;
}
export interface RestApi {
  generatedAt: string;
  sourceCommit: string | null;
  info: { title: string | null; version: string | null; openapi: string | null };
  endpointCount: number;
  groups: Array<{ tag: string; description: string | null; endpoints: Endpoint[] }>;
}
export function getRestApi(): RestApi {
  return load('rest-api.json', { generatedAt: '', sourceCommit: null, info: { title: null, version: null, openapi: null }, endpointCount: 0, groups: [] });
}

// ── activity (cross-repo commit feed) ────────────────────────────────────────
export interface Commit {
  repo?: string;
  sha: string;
  date: string;
  author: string;
  message: string;
  url: string;
}
export interface Activity {
  generatedAt: string;
  repoCount: number;
  timeline: Commit[];
  perRepo: Record<string, Commit[]>;
  summary: Array<{ repo: string; count: number; latest: string | null; latestMessage: string | null }>;
}
export function getActivity(): Activity {
  return load('activity.json', { generatedAt: '', repoCount: 0, timeline: [], perRepo: {}, summary: [] });
}
