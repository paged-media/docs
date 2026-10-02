# Architecture decision records

An ADR records one load-bearing decision that has already been made: what was decided, what
in the code shows it, and what it obliges other code to do. It is a record, not a proposal.
When the code stops matching a record, the body is left as it is and a dated amendment is
added at the end.

ADR numbers are unique across the paged-media repositories, so a number names the same
record wherever it is cited. New records in this repository use 800–849. Lower numbers
predate that scheme; this repository holds none of them. Records 800–804 were written on
2026-10-02 from the code as it stood, for decisions made earlier; their status says so.

| ADR | Title | Status |
|---|---|---|
| [800](800-clean-room-documentation.md) | Format documentation is written clean-room | Accepted, recorded retroactively 2026-10-02 |
| [801](801-validated-examples.md) | Examples are real packages, validated against the released engine | Accepted, recorded retroactively 2026-10-02 |
| [802](802-generated-platform-pages.md) | Platform pages are generated from pinned sources in other repos | Accepted, recorded retroactively 2026-10-02 |
| [803](803-live-preview-uses-viewer-package.md) | The live preview uses the published viewer package | Accepted, recorded retroactively 2026-10-02 |
| [804](804-static-export-hosting.md) | A static export on a cross-origin-isolated host | Accepted, recorded retroactively 2026-10-02 |

These records are about how the documentation site is built. They are not pages of the
site. Decisions made in other repositories that this repository's code rests on are listed
in [`../README.md`](../README.md).
