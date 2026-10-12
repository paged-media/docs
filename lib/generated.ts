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
export type Evidence = 'green' | 'red' | 'flaky' | 'stale' | 'none';
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
  /** Cockpit's health for the feature (state, headline, evidence date, test counts). */
  health?: { state: string; headline: string; evidence_at: string | null; tests: { linked: number; passed: number; failed: number; skipped: number } } | null;
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
  stale?: number;
  experimental?: number;
  planned?: number;
  /** When cockpit exported the capability record this headline is computed from. */
  record_generated_at?: string | null;
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

// ── CLI (the `paged` command tree) ───────────────────────────────────────────
export interface CliArg {
  name: string;
  positional: boolean;
  required: boolean;
  repeatable: boolean;
  long: string | null;
  short: string | null;
  takesValues: boolean;
  valueNames: string[] | null;
  defaults: string[];
  help: string | null;
}
export interface CliCommand {
  name: string;
  about: string | null;
  longAbout: string | null;
  args: CliArg[];
  subcommands: CliCommand[];
}
export interface Cli {
  generatedAt: string;
  sourceCommit: string | null;
  binary: string;
  about: string | null;
  protocol: number | null;
  commandCount: number;
  subcommandCount: number;
  groups: Array<{ title: string; blurb: string; commands: CliCommand[] }>;
}
export function getCli(): Cli {
  return load('cli.json', {
    generatedAt: '',
    sourceCommit: null,
    binary: 'paged',
    about: null,
    protocol: null,
    commandCount: 0,
    subcommandCount: 0,
    groups: [],
  });
}

// ── capability x surface reach ───────────────────────────────────────────────
export interface SurfaceCounts {
  named: number;
  generic: number;
  blocked: number;
  na: number;
}
export interface SurfaceReach {
  key: string;
  title: string;
  href: string | null;
  ops: SurfaceCounts;
  kinds: SurfaceCounts;
  note: string | null;
}
export interface Surfaces {
  generatedAt: string;
  sourceCommit: string | null;
  protocol: number | null;
  opCount: number;
  kindCount: number;
  surfaces: SurfaceReach[];
}
export function getSurfaces(): Surfaces {
  return load('surfaces.json', {
    generatedAt: '',
    sourceCommit: null,
    protocol: null,
    opCount: 0,
    kindCount: 0,
    surfaces: [],
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

// ── SDK catalog (@paged-media/idml-viewer + ViewerSession + Inspector) ───────
export interface SdkMember {
  name: string;
  kind: string; // function | method | property | event | class | type
  signature: string;
  returns: string;
  summary: string;
}
export interface SdkGroup {
  key: string;
  title: string;
  summary: string;
  members: SdkMember[];
}
export interface SdkCatalog {
  generatedAt: string;
  sourceMode: string;
  sourceCommit: string | null;
  package: string;
  memberCount: number;
  groups: SdkGroup[];
}
export function getSdkCatalog(): SdkCatalog {
  return load('sdk-catalog.json', {
    generatedAt: '',
    sourceMode: 'none',
    sourceCommit: null,
    package: '@paged-media/idml-viewer',
    memberCount: 0,
    groups: [],
  });
}

// ── IDML element/attribute schema (from the engine catalog `elements`) ───────
export interface IdmlAttr {
  name: string;
  typeHint: string;
  settablePath: string | null;
  summary: string;
}
export interface IdmlElement {
  name: string;
  chapter: string;
  summary: string;
  attributes: IdmlAttr[];
}
export interface IdmlSchema {
  generatedAt: string;
  sourceCommit: string | null;
  elementCount: number;
  attributeCount: number;
  elements: IdmlElement[];
  byName: Record<string, IdmlElement>;
}
let _idmlSchema: IdmlSchema | undefined;
export function getIdmlSchema(): IdmlSchema {
  return (_idmlSchema ??= load('idml-schema.json', {
    generatedAt: '',
    sourceCommit: null,
    elementCount: 0,
    attributeCount: 0,
    elements: [],
    byName: {},
  }));
}
export function getIdmlElement(name: string): IdmlElement | undefined {
  return getIdmlSchema().byName[name];
}

// ── cross-pillar links (IDML format ⇄ Paged platform) ────────────────────────
export interface PagedSurface {
  key: string;
  label: string;
  url: string;
  note?: string;
}
export interface ChapterCrosslink {
  title: string;
  group: string;
  idmlUrl: string | null;
  featureCount: number;
  shippedPct: number | null;
  shipped: { parser: Impl; renderer: Impl; mutation: Impl; sdk: Impl; script: Impl };
  pagedSurfaces: PagedSurface[];
}
export interface Crosslinks {
  generatedAt: string;
  sourceCommit: string | null;
  chapterCount: number;
  chapters: Record<string, ChapterCrosslink>;
  surfaces: Record<string, { url: string; label: string; chapters: string[] }>;
}
let _crosslinks: Crosslinks | undefined;
export function getCrosslinks(): Crosslinks {
  return (_crosslinks ??= load('crosslinks.json', {
    generatedAt: '',
    sourceCommit: null,
    chapterCount: 0,
    chapters: {},
    surfaces: {},
  }));
}
export function getChapterCrosslink(chapter: string): ChapterCrosslink | undefined {
  return getCrosslinks().chapters[chapter];
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

// ── the IDML element reference (scripts/generate/gen-idml-reference.mjs) ─────
export interface RefCount {
  name: string;
  docCount: number;
  slug: string | null;
}
export interface RefTyped {
  path: string;
  type?: { kind: string; unit?: string; members?: string[]; open?: boolean; to?: string };
  range?: { min?: number; max?: number } | null;
  default?: unknown;
  access?: string | null;
  typeHint?: string;
}
export interface RefAttribute {
  name: string;
  kind: 'attribute' | 'properties-child';
  docCount: number;
  share: number;
  types: string[];
  values: Record<string, number> | null;
  refKinds: string[] | null;
  propertyTypes: string[] | null;
  /** Census /2: the package parts documents keep it in (null from a /1 census). */
  parts?: { part: string; docCount: number }[] | null;
  /** Census /2: documents whose value departs from the corpus's most common one. */
  nonModalDocs?: number | null;
  paged: {
    imported: boolean;
    exported: boolean;
    /** The parts Paged's importer reads it from (null from an older coverage file). */
    readParts?: string[] | null;
    /** Read, but from none of the parts documents keep it in. */
    misplaced?: boolean;
  } | null;
  typed: RefTyped | null;
  note: string | null;
  /** The section of our own prose that discusses the attribute on this element, if any. */
  explained?: RefExplained | null;
}
export interface RefExplained {
  /** Site-neutral href to the page section (`/docs/idml/<page>#<anchor>`). */
  href: string;
  page: string;
  section: string | null;
  /** The sentence that leads with the attribute there, inline `code` kept. */
  description: string | null;
}
export interface RefElement {
  name: string;
  slug: string;
  summary: string | null;
  docCount: number;
  share: number;
  parts: { part: string; docCount: number }[];
  parents: RefCount[];
  children: RefCount[];
  attributes: RefAttribute[];
  paged: { reads: boolean; attributesRead: number; attributesWritten: number; attributesMisplaced?: number } | null;
  examples: { id: string; title: string }[];
  pages: { href: string; title: string }[];
}
export interface IdmlReference {
  documents: number;
  censusSchema?: string;
  censusDate: string;
  coverage: { rows: number } | null;
  typedLinks: number;
  elements: RefElement[];
}
let _idmlReference: IdmlReference | undefined;
export function getIdmlReference(): IdmlReference {
  return (_idmlReference ??= load('idml-reference.json', {
    documents: 0,
    censusDate: '',
    coverage: null,
    typedLinks: 0,
    elements: [],
  }));
}
export function getRefElement(name: string): RefElement | undefined {
  return getIdmlReference().elements.find((e) => e.name === name);
}

// ── facts (gen-facts.mjs) ─────────────────────────────────────────────────────
export interface Fact {
  value: string | number;
  display: string;
  label: string;
  from: string | null;
}
export interface Facts {
  generatedAt: string | null;
  count: number;
  facts: Record<string, Fact>;
}
export function getFacts(): Facts {
  return load<Facts>('facts.json', { generatedAt: null, count: 0, facts: {} });
}
