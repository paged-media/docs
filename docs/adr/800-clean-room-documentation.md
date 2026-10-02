# ADR 800 — Format documentation is written clean-room

- **Status:** Accepted. Recorded retroactively on 2026-10-02 from the code at `2094ba4`.
- **Scope:** every page under `content/`, every example under `examples/`, `cleanroom/`,
  `.github/workflows/cleanroom.yml`, `.github/PULL_REQUEST_TEMPLATE/content_change.md`

## Context

The site documents IDML, a file format whose authoritative specification belongs to its
vendor. The README calls the site an "independent description by the Paged project"
(`README.md:12`), and the published protocol page calls the specification "copyrighted
vendor material" (`content/docs/idml/meta/clean-room-protocol.mdx:18`).

The protocol page gives the reason the rule covers more than sentences: "Copyright protects
selection and arrangement" (`content/docs/idml/meta/clean-room-protocol.mdx:39`). A page of
original prose can still be derivative if its outline follows the specification's table of
contents section by section (`:40-41`). The rule is kept by the people who write and
review; the repository adds a mechanical check and describes it as "A backstop for human
discipline" (`cleanroom/check.ts:8`).

## Decision

The reference was written from the project's own constructed files and from what its own
renderer does with them. Neither the wording nor the arrangement of the vendor
specification may be reproduced, and the specification never enters the repository.

- **Two layers.** Wording: no verbatim text and no close paraphrase. Arrangement: no
  structural mirroring; pages and the site outline are ordered by reader progression and
  task. Element and attribute names are facts and are used freely.
- **Sources, in order of preference.** Small packages the project builds itself; the
  observed behaviour of its renderer; the specification "for orientation only", to learn
  which topics exist and what the element names are.
- **Per change.** The content pull-request template carries two confirmations by the author
  and one by a reviewer before merge.
- **In CI.** `cleanroom.yml` runs on pull requests that touch `content/**` or any `.mdx`
  file. It downloads `fingerprint.json` from a release of a separate repository with the
  secret `CLEANROOM_BASELINE_TOKEN`, then runs `cleanroom/check.ts` against it.
- **The check.** `normalize` drops front matter, fenced and inline code, tags, link targets,
  punctuation and every word listed in `cleanroom/vocabulary.txt` (63 IDML terms).
  `fingerprint` hashes each run of five remaining words (SHA-1, first 16 hex digits). For
  every `.md` and `.mdx` file under `content`, the share of its hashes that also occur in
  the baseline is computed: 0.2 or more fails the job, 0.1 or more prints a warning.
- **The baseline** holds hashes and the normalizer version that produced them, not text.
  `check.ts` exits with an error when that version differs from `NORMALIZER_VERSION` (1).
- **Guards.** `.gitignore` excludes `*.pdf`, `idml-specification*` and `cleanroom/.baseline/`.

## Evidence

- `content/docs/idml/meta/clean-room-protocol.mdx:25-68` — the two layers, the sourcing
  order, and enforcement by confirmation plus a CI check
- `.github/PULL_REQUEST_TEMPLATE/content_change.md:14-22` — the author's confirmations and
  the reviewer's tick
- `cleanroom/normalize.ts:11-12`, `:30-43`, `:47-55` — `NORMALIZER_VERSION`, `SHINGLE_N`,
  what is masked, and the truncated SHA-1 per five-word run
- `cleanroom/check.ts:13-14`, `:42-48`, `:52-64` — the two thresholds, the version check,
  the walk over `content` and the containment ratio
- `.github/workflows/cleanroom.yml:3-7`, `:19-32`, `:41-47` — the trigger, the baseline
  download, and the two steps that depend on whether the file arrived
- `.gitignore:27-33` — the specification and the baseline are kept out of the tree
- `CLAUDE.md:18-24` — the rule as the first of the repository's three hard rules

## Alternatives considered

None recorded in the repository.

## Consequences

Every page and every example is bound by the rule; examples are "Authored, never copied"
(`examples/README.md:19`, [ADR 801](801-validated-examples.md)).

The check is limited by its own description: it "does NOT prove originality, and it cannot
catch structural mirroring" (`cleanroom/check.ts:9`). The arrangement layer rests on
review alone. `OWNERSHIP.md:8-9` names one bootstrap owner for every section; the reviewer
rotation the protocol page mentions is not defined in the repository. The baseline, and
whatever produces it, are outside this repository; `normalize.ts` must run unchanged on
both sides (`cleanroom/normalize.ts:6-9`).

The similarity step is not a hard gate. When the secret is absent, as on a pull request
from a fork, or the download fails, the step is skipped, a notice is printed and the job
passes (`.github/workflows/cleanroom.yml:11-12`, `:32`, `:45-47`). The workflow runs on
pull requests only. Its comment records that an earlier form of the file could not be
parsed, "so it never ran" (`:16-18`); commit `0617e7e` (2026-10-01) repaired it.

Two pointers are stale: `CLAUDE.md:24` and `README.md:46` name the protocol page at
`content/docs/meta/clean-room-protocol.mdx`; the file is under `content/docs/idml/meta/`.

## Related

- [ADR 801](801-validated-examples.md) — examples are authored under this rule and are the
  first source the protocol names
