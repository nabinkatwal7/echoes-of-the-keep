# 04 — Content Pipeline

How the handbook's rules content gets into the database as validated, structured data.

## Licensing note (read first)

`DD-Player-Handbook.pdf` is copyrighted material. Only the **SRD 5.1** (released by Wizards of the Coast under CC-BY-4.0) may be redistributed in a public product. The full PHB includes non-SRD content (e.g. most subclasses, several backgrounds, many spells, most feats, some races' subraces).

Decision required before any public launch (see [open questions](06-roadmap-and-risks.md#open-questions)):

- **Private / friends-only use:** seed the full PHB content from the user's own copy. Keep seeded non-SRD data out of public git history and public deployments.
- **Public release:** ship SRD content only, with CC-BY attribution, and let users supply additional content via homebrew/import or by owning the book.

The pipeline therefore tags every row with `source` (`SRD` | `PHB` | `HOMEBREW`) and the app supports a **content license mode** (`SRD_ONLY` | `FULL`) that filters non-SRD rows from public views.

## Sources and what each is used for

| Source | Use | Reliability |
|---|---|---|
| SRD 5.1 JSON (the `5e-bits` D&D 5e API data, already used by the wiki via `NEXT_PUBLIC_API_URL`) | Structured baseline: races, classes, levels, spells, equipment, monsters, conditions, features | High; structured |
| `DD-Player-Handbook.pdf` | Authoritative text and page refs; fills the non-SRD gaps; cross-check of tables | Text extractable (`pdftotext` yields ~19k lines) but two-column layout + letter-spaced headings need cleanup; tables unreliable |
| Hand-authored `content/overrides/*.json` | Encoded mechanics (effects, handler keys) and corrections | Reviewed by humans, version-controlled |

## Pipeline stages

```
content/
  raw/            downloaded SRD JSON snapshot (committed, pinned version)
  extracted/      per-chapter text extracted from the PDF (git-ignored if non-SRD)
  overrides/      hand-written JSON: effects, handler keys, fixes, PHB-only entries
  schemas/        Zod schemas per entity
  build/          scripts: import → normalise → merge → validate → seed
```

1. **Snapshot** — vendor the SRD JSON into `content/raw/` (pinned commit) so builds don't depend on a live API. *This removes the runtime `getData` dependency.*
2. **Extract** — `pdftotext -layout` per chapter page range (ranges in `03-rules-coverage.md`) into `content/extracted/`. A cleaning script fixes letter-spaced headings, ligatures, hyphenation, and column order.
3. **Normalise** — map each source into the entity shapes of [02-data-model.md](02-data-model.md).
4. **Merge** — layer: SRD base → PHB-only additions → `overrides/` (overrides win). Conflicts logged.
5. **Validate** — Zod parse of every entity; referential checks (every `Feature` referenced by a `ClassLevel` exists; every spell's class list resolves; every equipment pack item resolves).
6. **Seed** — `prisma db seed` upserts by `index`. Idempotent; safe to rerun.
7. **Report** — a coverage report compares counts to the handbook (e.g. 12 classes, ≈40 subclasses, 13 backgrounds, 42 feats, ≈360 spells, 15 conditions) and fails CI if a count regresses.

## Encoding mechanics ("effects")

Prose descriptions alone aren't enough to automate rules. For each feature/trait/feat/spell/condition we add machine-readable data in `overrides/`:

- **Declarative effects** for the common 80%: `{ "stat": "ac", "kind": "bonus", "value": 1, "when": "wearing-armor" }`, proficiency grants, resistances, speed changes, extra slots, advantage/disadvantage triggers.
- **Handler key** for the complex 20%: `"handler": "sneak-attack"` pointing at a registered function in `engine/`.
- **`automation` flag**: `full` | `assisted` (engine computes, DM confirms) | `manual` (text only). The UI shows what is automated so the DM is never surprised.

Target automation by phase end: every class feature through level 20 is at least `assisted`; all combat-relevant spells are `full` or `assisted`.

## Quality gates

- Snapshot tests of selected entities (e.g. Fighter level 5, Fireball, Plate armor, Goblin) against known-good values from the book.
- Table totals sanity-checked: class level tables have 20 rows, slot tables sum correctly, XP thresholds match p.15.
- Manual spot-check checklist per chapter (10 random entities per content type compared to the PDF page).
- Content has a `version`; schema migrations bump it; characters reference content by `index` so rules errata don't break saved characters.

## Wiki content maintenance

After Phase 1 the wiki reads from the DB. Fixing a typo = edit the override/extracted file → rebuild → reseed. No code changes.

## Implemented extraction tooling (current state)

Run `npm run content:extract` (needs Python 3, `pdftotext` from poppler/xpdf on PATH, and `pip install wordninja`).

| Script | Output (`content/extracted/`) |
|---|---|
| `content/build/extract_phb.py` (+ `columns.py`) | `pages.json` (reading order), `pages_raw.json` (content-stream order), `pages_cols.json` (column-aware), `chapters/*.md` (17 files) |
| `content/build/parse_spells.py` | `structured/spells.json`, `spell-lists.json`, `spell-gaps.json` |
| `content/build/parse_content.py` | `structured/{conditions,feats,backgrounds,races,classes,equipment,creatures,gods}.json` |
| `content/build/report.py` | `REPORT.md` (counts and known gaps) |

The PDF's text layer has letter-spaced words, so `extract_phb.py` rebuilds words with a dictionary-based joiner (wordninja costs plus words seen in the book). Results and gaps are listed in [07-website-content.md](07-website-content.md#12-known-gaps-must-be-filled-by-hand-or-from-the-srd-before-launch).
