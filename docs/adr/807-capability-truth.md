# ADR 807 — Capability statements come from the capability record

- **Status:** Accepted, 2026-10-12.
- **Scope:** `sources.pin` (`cockpit`, `capability-matrix`, the plugin and core-meta
  sources), `scripts/generate/gen-matrix.mjs`, `scripts/generate/gen-facts.mjs`,
  `data/facts.json`, `components/mdx/fact.tsx`, `scripts/check-facts.mjs`,
  `scripts/check-comparison.mjs`, `scripts/check-record-age.mjs`,
  `scripts/check-freshness.mjs`, `data/comparison.json`, the `core-pin` and
  `update-comparison` workflows. Supersedes the `state` sources of ADR 802.

## Context

On 2026-10-12 the capability pages still read `paged-media/state`, retired on 2026-09-11 for
cockpit; every status and count on them had stopped on 2026-09-10 (579 features, protocol 63).
Prose carried numbers typed by hand that had drifted (175 settable paths where the catalog
had 221). The comparison stated Paged's licence as the engine's alone, and its Paged column
was a snapshot from June. Nothing failed: a failed pull only warned, the freshness check saw
only pages that declared `describes:`, and its evidence came from the frozen source.

## Decision

1. **One record.** cockpit's export workflow (nightly, and when a repository's main test run
   finishes) pulls every repository's CI test results, joins them to the feature registry and
   commits `exports/public.json` (`cockpit.export.v1`) and `exports/capability-matrix.json`.
   The docs pull both; `gen-matrix` maps a feature's claims to cells and its health to their
   evidence (verified, re-test pending, failing, untested). The record is republished as
   `/capabilities.json`.
2. **Facts, not numbers.** Every count or licence the docs state about the platform is defined
   in `data/facts.json` by its source and extractor and rendered with `<Fact id="…" />`.
   `check:facts` fails a page that types one by hand. They are republished as `/facts.json`.
3. **The comparison rests on evidence.** Paged's scores stay an editorial judgement (the
   registry measures Paged's own work, not how it compares with the field), but each row
   names the chapters, features or facts behind the score; `check:comparison` fails a score of
   2 or more whose capabilities are failing or mostly unverified. Competitors carry a
   `researched` date, refreshed by a monthly research PR, and fail the build after 120 days.
4. **Fail, don't fade.** With the source token, a source that cannot be pulled fails the build
   and the deploy; a record more than seven days old fails `check:record-age`. Plugin and
   comparison pages must declare `describes:`; a page goes stale when a described feature's
   code changes after its `reviewed:` date. A nightly workflow proposes `core.pin` bumps.
5. **The conformance ladder retires.** It existed only in `state`; `/state/conformance/` 301s
   to the matrix.

## Consequences

- A capability page is wrong only if the registry or the tests are, and both are visible:
  the registry's validation is part of the export run.
- Writing `263 functions` is a build failure; writing `<Fact id="sheet.functions" />` is the
  only way to state it.
- The freshness signal is only as good as the registry's links from features to code: on
  2026-10-12, 133 of 695 features carry a change date. Rows without `paths:` cannot go stale.
- paged.media can build from the same two files.
