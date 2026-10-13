# Phase 1 — Rules Content & Wiki

**Goal:** every rules entity in the handbook exists as validated structured data and is browsable and searchable in a public wiki.
**Size:** L · **Depends on:** Phase 0 · **Handbook:** all chapters (content), Appendices A–E
**Milestone:** M1 Reference

## Features

### F1.1 Content import for reference entities
Ability scores, skills, proficiencies, languages, alignments, damage types, magic schools, weapon properties, conditions (App.A).
- **Acceptance:** counts match the book (6 abilities, 18 skills, 9 alignments, 15 conditions …); each has page citation.

### F1.2 Races & subraces (Ch.2, p.17–43)
- 9 races with subraces, ability bonuses, size/speed, languages, traits, Dragonborn ancestry table, Human variant rule.
- **Acceptance:** each race page shows traits exactly as in the book; machine-readable bonuses/proficiencies/resistances validated.

### F1.3 Classes, levels & subclasses (Ch.3, p.45–120)
- 12 classes: hit die, saves, proficiencies, equipment options, full level 1–20 tables (proficiency bonus, features, class-specific columns, spell slots/known), all PHB subclasses and their features.
- **Acceptance:** level tables are 20 rows each and match the printed tables; every subclass feature has a level and description.

### F1.4 Backgrounds & personality (Ch.4, p.121–141)
- 13 backgrounds with proficiencies, languages, equipment, feature, and the d6/d8 tables of traits/ideals/bonds/flaws; inspiration rules text.
- **Acceptance:** tables preserve dice sizes and entry order; suggested characteristics rollable.

### F1.5 Equipment (Ch.5, p.143–159)
- Armor, shields, weapons (with properties & damage), adventuring gear, packs, tools, mounts/vehicles, trade goods, services/lifestyle expenses, trinkets table.
- **Acceptance:** cost, weight, AC/damage and properties correct for a 20-item spot check; currency conversion table available.

### F1.6 Feats (Ch.6, p.165–170)
- 42 feats with prerequisites (parsed into machine-checkable form) and benefits.
- **Acceptance:** prerequisites expressible and testable (e.g. "Str 13+", "proficiency with heavy armor", "ability to cast a spell").

### F1.7 Spells (Ch.10–11, p.201–289)
- ≈360 spells: level, school, casting time, range, components & material text/cost, duration, concentration, ritual, class lists, description, "At Higher Levels".
- Class spell lists (p.207–211).
- **Acceptance:** every spell on every class list resolves; filters work (level, class, school, ritual, concentration).

### F1.8 Monsters & creatures (App.D + SRD)
- Appendix D stat blocks plus SRD monster library for DMs. Render in the classic stat-block layout; filter by CR, type, size, environment.
- **Acceptance:** stat-block rendering of 5 sample monsters visually matches book layout; CR→XP table correct.

### F1.9 Rules text (Ch.7–10, App.B, C, E)
- Rules chapters split into linkable sections (e.g. "Advantage and Disadvantage", "Cover", "Concentration"), gods of the multiverse, planes, further reading.
- **Acceptance:** each section has an anchor and page citation; cross-links between rules text and entities (spell mentions link to spell pages).

### F1.10 Wiki UI
- Replace hard-coded tabs (`data/pageTabData/CharacterTabData.ts`) with a content-type registry; sidebar generated from it.
- List pages with filters/sort; detail pages with related entities; breadcrumbs; print stylesheet.
- Global search (Postgres FTS, `⌘K` palette) across all entity types with type-ahead.
- Server Components reading Prisma via `lib/content/*`; static generation/ISR for speed. Remove `utils/getData.ts` and `NEXT_PUBLIC_API_URL`.
- **Acceptance:** zero runtime calls to an external API; search "fire" returns Fireball, Fire Bolt, fire resistance, etc. ranked sensibly.

### F1.11 Mechanics encoding v1
- Add `effects`/`handler`/`automation` data ([04](../04-content-pipeline.md#encoding-mechanics-effects)) for: ability bonuses, proficiencies, speeds, senses, resistances, AC formulas, spell slot tables. Complex features recorded as `manual` for now.
- **Acceptance:** the engine (Phase 2) can derive a level 1 character for every race/class combination from data alone.

### F1.12 Content quality gates
- Count-regression report, schema validation, referential integrity in CI; spot-check checklist per chapter.
- **Acceptance:** CI fails when content is invalid or counts drop.

## Exit criteria

- All Part 1 and Part 3 content, Appendices A–D present and browsable.
- Search works; wiki has no external runtime dependencies.
- Coverage matrix rows for "content" columns ✅.
