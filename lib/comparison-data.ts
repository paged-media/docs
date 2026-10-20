/**
 * Typed accessor over the editorial DTP comparison matrix. The DATA lives in
 * `data/comparison.json` so it can be refreshed by a script (`pnpm
 * update:comparison`, which researches current facts via Claude Opus) or by hand
 * without touching code. This module only adds types + the JSON shape the
 * comparison components consume.
 *
 * Scores are an ORDINAL 0–3 editorial judgement on a dated snapshot, not vendor
 * benchmarks. Roadmap-not-shipped Paged capabilities use `pagedPlanned` and are
 * scored honestly, never as present.
 */
import raw from '@/data/comparison.json';
import { getFacts, getSupportMap } from '@/lib/generated';

export type ToolKey = string;

export interface ScaleStep {
  score: number;
  label: string;
}
export interface Tool {
  key: ToolKey;
  name: string;
  note: string;
  /** When this competitor's scores were last researched (Paged has none: its evidence is live). */
  researched?: string;
  /** Where that research came from (official pages first). */
  sources?: string[];
}
/** What a Paged score rests on: registry chapters or features, and facts. */
export interface PagedBacking {
  chapters?: string[];
  features?: string[];
  facts?: string[];
}
export interface MatrixRow {
  dimension: string;
  scores: Record<ToolKey, number>;
  pagedPlanned?: boolean;
  note?: string;
  paged?: PagedBacking;
}
export interface MatrixDomain {
  key: string;
  title: string;
  kind: 'baseline' | 'differentiator';
  rows: MatrixRow[];
}
export interface Verdict {
  key: ToolKey;
  choose: string;
}

export const SNAPSHOT: string = raw.snapshot;
export const SCALE: ScaleStep[] = raw.scale;
export const TOOLS: Tool[] = raw.tools;
export const DOMAINS: MatrixDomain[] = raw.domains as MatrixDomain[];
export const VERDICTS: Verdict[] = raw.verdicts;

/** `{fact:license.engine}` in a note → the fact's current display value. */
export function resolveNote(note: string | undefined): string {
  if (!note) return '';
  const facts = getFacts().facts;
  return note.replace(/\{fact:([a-zA-Z0-9.]+)\}/g, (_, id: string) => facts[id]?.display ?? `[${id}]`);
}

export interface PagedEvidence {
  features: number;
  verified: number;
  planned: number;
  failing: number;
  facts: string[];
}

/** The registry features behind a Paged score, and how many of them tests verify today. */
export function pagedEvidence(row: MatrixRow): PagedEvidence {
  const b = row.paged ?? {};
  const all = Object.values(getSupportMap().features);
  const picked = all.filter((f) => (b.chapters ?? []).includes(f.chapter) || (b.features ?? []).includes(f.id));
  const shipped = picked.filter((f) => f.status !== 'planned');
  return {
    features: shipped.length,
    verified: shipped.filter((f) => f.health?.state === 'healthy').length,
    planned: picked.length - shipped.length,
    failing: picked.filter((f) => (f.health?.tests?.failed ?? 0) > 0 || f.health?.state === 'broken').length,
    facts: b.facts ?? [],
  };
}
