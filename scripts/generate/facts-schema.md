# `facts.json` — the public contract

`gen-facts.mjs` evaluates the definitions in `data/facts.json` against the pulled sources and
writes the result twice: `.generated/facts.json` for `<Fact id="…" />` and the ledger on the
status page, and `public/facts.json`, served at `/facts.json` on both sites. paged.media
builds its figures from the served copy, and anyone else may read it.

The contract is **additive only**. A field, once published, keeps its name, its type and its
meaning. New fields may appear; a consumer ignores fields it does not know.

## The document

| Field | Type | Since | Meaning |
|---|---|---|---|
| `schema` | string | 2 | `paged.docs.facts/2`. Absent in the first version. |
| `generatedAt` | ISO timestamp | 1 | When this build evaluated the facts. |
| `count` | number | 1 | The number of entries in `facts`. |
| `policy` | object | 2 | The stale-after policy the `stale_after` dates follow: `record_days`, `census_days`, `engine` (`"next-tag"`). |
| `facts` | object | 1 | One entry per fact id (`engine.version`, `sheet.functions`, …). |

## A fact

| Field | Type | Since | Meaning |
|---|---|---|---|
| `value` | number, string or string[] | 1 | The value as evaluated. |
| `display` | string | 1 | The value written for people (`1,204`, `AGPL-3.0 or PMEL`). |
| `label` | string | 1 | What the value counts or names. |
| `from` | string or null | 1 | The definition's source: a file under the pulled sources, `repo:<path>` in this repository, or null for a value stated in the definition. |
| `class` | string | 2 | The fact's freshness class, below. |
| `observed_at` | ISO timestamp or null | 2 | When the authority produced the value: the record's export time, the release tag's date, the source commit's date, the census date. Null when that date could not be read (the facts still evaluate). |
| `source` | object | 2 | `{ authority, revision }`: who stated the value and at which revision. `authority` is a short phrase; `revision` is a commit SHA, a release tag or a dated schema id. |
| `evidence_url` | string or null | 2 | A public page or file a reader can check the value against, when one exists. |
| `stale_after` | ISO timestamp or null | 2 | After this moment the value should not be presented as current. Null means the class has no date yet (see `engine`) or the value describes the build that ships it. |

## Classes and their policy

The policies are constants in `lib/freshness.mjs`, shared with the build gates and the pages.

| `class` | Authority | `observed_at` | `revision` | `stale_after` |
|---|---|---|---|---|
| `record` | The capability record (cockpit's export, `cockpit/public.json`) | The record's `generated_at` | The export commit (or `generated_at` when the commit is unknown) | `observed_at` + 14 days |
| `engine` | The engine release `core.pin` names: `repo:core.pin` and the sources read at that commit | The release tag's date | The tag (`v0.77.0`), or the pinned commit when no tag matches | The date of the next release tag; null while none exists |
| `source` | paged-media/paged at the branch head the build pulled | The commit's date | The commit SHA | `observed_at` + 14 days |
| `census` | The IDML corpus census (`data/idml-census.json`) and what is derived from it | The census date | The census schema and date | `observed_at` + 120 days |
| `repo` | This repository's own files and stated values | The commit date of the build (or the build time) | The commit SHA, when known | null |

A definition in `data/facts.json` may set `class` itself; otherwise `gen-facts` derives it from
`from`.

## Example

```json
"engine.version": {
  "value": "v0.77.0",
  "display": "v0.77.0",
  "label": "engine release",
  "from": "repo:core.pin",
  "class": "engine",
  "observed_at": "2026-10-28T17:28:03.000Z",
  "source": { "authority": "engine release", "revision": "v0.77.0" },
  "evidence_url": "https://github.com/paged-media/paged/tree/v0.77.0",
  "stale_after": null
}
```
