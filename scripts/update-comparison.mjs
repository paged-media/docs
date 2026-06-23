#!/usr/bin/env node
/**
 * update-comparison — refresh data/comparison.json from current research, via
 * Claude Opus 4.8 with the web-search tool.
 *
 * Two phases:
 *   1. RESEARCH — Opus 4.8 + web_search gathers current, dated facts about each
 *      DTP tool (license/cost, format openness, IDML interop, scripting, plugins,
 *      automation, platform, layout, color/print), with sources.
 *   2. SYNTHESIZE — a second call reformats that research into the exact
 *      comparison schema via structured outputs, preserving Paged's honest
 *      emerging/`planned` scores (it does NOT research Paged from the open web —
 *      Paged's own capability state is the source of truth there).
 *
 * The result is written back to data/comparison.json with the snapshot date
 * bumped. Scores remain an editorial 0–3 judgement — REVIEW THE DIFF before
 * committing; this tool proposes, a human ratifies (per the page methodology).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/update-comparison.mjs            # write
 *   ANTHROPIC_API_KEY=... node scripts/update-comparison.mjs --dry-run  # print only
 *
 * Requires @anthropic-ai/sdk (a maintainer tool, not a site dependency):
 *   pnpm add -D @anthropic-ai/sdk
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'comparison.json');
const DRY_RUN = process.argv.includes('--dry-run');
const MODEL = 'claude-opus-4-8';

// ── load the SDK (optional dev dependency) ───────────────────────────────────
let Anthropic;
try {
  ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
} catch {
  console.error('update-comparison: @anthropic-ai/sdk is not installed.\n  Run: pnpm add -D @anthropic-ai/sdk');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error('update-comparison: set ANTHROPIC_API_KEY (or run `ant auth login`).');
  process.exit(1);
}

const current = JSON.parse(readFileSync(DATA, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const client = new Anthropic();

const toolNames = current.tools.map((t) => `${t.name} (${t.key})`).join(', ');
const domainList = current.domains.map((d) => `- ${d.title} [${d.kind}]`).join('\n');

// ── Phase 1: research current facts via web search ───────────────────────────
console.log(`update-comparison: researching current DTP facts (${MODEL} + web_search)…`);
const research = await client.messages
  .stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages: [
      {
        role: 'user',
        content:
          `Today is ${today}. Research the CURRENT state of these desktop-publishing tools: ${toolNames}.\n\n` +
          `For each tool, find dated, verifiable facts across these dimensions:\n${domainList}\n\n` +
          `Pay special attention to facts that move: licensing/ownership changes (e.g. Affinity under Canva, ` +
          `pricing model), file-format openness and IDML import/export support, scripting/API availability, ` +
          `plugin/extension platforms, automation/data-merge capabilities, and any products being retired ` +
          `(e.g. Microsoft Publisher). Cite a source URL and date for each non-obvious claim. ` +
          `Do NOT research "Paged" — its capabilities are tracked internally and will be supplied separately. ` +
          `Output concise, sourced bullet notes per tool per dimension.`,
      },
    ],
  })
  .getFinalMessage();

const researchText = research.content
  .filter((b) => b.type === 'text')
  .map((b) => b.text)
  .join('\n');
console.log(`update-comparison: research complete (${researchText.length} chars).`);

// ── Phase 2: reformat into the comparison schema (structured output) ─────────
const scoreProps = Object.fromEntries(current.tools.map((t) => [t.key, { type: 'integer' }]));
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['snapshot', 'domains', 'verdicts'],
  properties: {
    snapshot: { type: 'string' },
    domains: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'title', 'kind', 'rows'],
        properties: {
          key: { type: 'string' },
          title: { type: 'string' },
          kind: { type: 'string', enum: ['baseline', 'differentiator'] },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['dimension', 'scores', 'note'],
              properties: {
                dimension: { type: 'string' },
                scores: { type: 'object', additionalProperties: false, required: Object.keys(scoreProps), properties: scoreProps },
                pagedPlanned: { type: 'boolean' },
                note: { type: 'string' },
              },
            },
          },
        },
      },
    },
    verdicts: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['key', 'choose'], properties: { key: { type: 'string' }, choose: { type: 'string' } } },
    },
  },
};

console.log('update-comparison: synthesizing the updated matrix (structured output)…');
const synth = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  messages: [
    {
      role: 'user',
      content:
        `Update this DTP comparison matrix using the research below. Return the full updated object.\n\n` +
        `RULES (non-negotiable):\n` +
        `- Scores are ordinal 0–3: 0 none, 1 limited/emerging, 2 solid, 3 comprehensive.\n` +
        `- Keep the same domain keys, titles, and baseline/differentiator tags; you may refine the per-row notes.\n` +
        `- Do NOT change Paged's scores or its pagedPlanned flags — copy them verbatim from CURRENT. Paged is an ` +
        `emerging platform and its honest scores are set internally, not from the open web.\n` +
        `- Update ONLY the competitor scores/notes (indesign, quark, affinity, scribus) where the research warrants.\n` +
        `- Set "snapshot" to ${today}.\n` +
        `- Keep notes factual, dated where a fact moves, and free of marketing language.\n\n` +
        `CURRENT (JSON):\n${JSON.stringify({ snapshot: current.snapshot, domains: current.domains, verdicts: current.verdicts }, null, 2)}\n\n` +
        `RESEARCH NOTES:\n${researchText}`,
    },
  ],
});

const out = synth.content.find((b) => b.type === 'text');
if (!out) {
  console.error('update-comparison: no structured output returned.');
  process.exit(1);
}
let updated;
try {
  updated = JSON.parse(out.text);
} catch (e) {
  console.error('update-comparison: could not parse model output as JSON:', e.message);
  process.exit(1);
}

// ── validate + merge (defensive; structured output should already conform) ───
const toolKeys = current.tools.map((t) => t.key);
for (const d of updated.domains ?? []) {
  for (const r of d.rows ?? []) {
    for (const k of toolKeys) {
      const v = r.scores?.[k];
      if (!Number.isInteger(v) || v < 0 || v > 3) {
        console.error(`update-comparison: bad score ${k}=${v} in "${d.title} / ${r.dimension}".`);
        process.exit(1);
      }
    }
  }
}

const merged = { ...current, snapshot: updated.snapshot || today, domains: updated.domains, verdicts: updated.verdicts };

if (DRY_RUN) {
  console.log('\n=== DRY RUN — proposed data/comparison.json ===\n');
  console.log(JSON.stringify(merged, null, 2));
  console.log('\n(no file written; re-run without --dry-run to write)');
} else {
  writeFileSync(DATA, JSON.stringify(merged, null, 2) + '\n');
  console.log(`update-comparison: wrote ${DATA} (snapshot ${merged.snapshot}).`);
}
console.log('\n⚠ Scores are an editorial proposal — REVIEW THE DIFF and verify moving facts before committing.');
