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

export type ToolKey = string;

export interface ScaleStep {
  score: number;
  label: string;
}
export interface Tool {
  key: ToolKey;
  name: string;
  note: string;
}
export interface MatrixRow {
  dimension: string;
  scores: Record<ToolKey, number>;
  pagedPlanned?: boolean;
  note?: string;
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
