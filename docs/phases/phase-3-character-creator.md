# Phase 3 — Character Creator & Sheet

**Goal:** any user can create, level up, store and print any PHB character, with every choice legal and every number correct.
**Size:** L · **Depends on:** Phases 1, 2 · **Handbook:** Ch.1–6, Character Sheet p.317
**Milestone:** M2 Character Builder

## Features

### F3.1 Character list & management
- `/characters`: cards with portrait, name, race/class/level; create, duplicate, archive, delete; import/export JSON.
- **Acceptance:** CRUD works; ownership enforced.

### F3.2 Creation wizard (Ch.1 "Step-by-Step Characters")
Steps with back/next, autosave drafts, live preview of derived sheet, per-step validation (engine `validateCharacter`):
1. **Concept** — name, optional "quick build" suggestions per class (the book's *Quick Build* sidebars).
2. **Race & subrace** — traits, ASI, languages; Human variant (feat + skill), Dragonborn ancestry, Half-Elf bonus picks, Tiefling, etc.
3. **Class** — hit die, proficiency picks (skills choose N), starting equipment *or* starting gold, fighting style, expertise, domain/subclass at level 1 (Cleric, Sorcerer, Warlock), spells/cantrips.
4. **Ability scores** — standard array / point buy / roll (server-validated rolls), assign, racial adjustments shown.
5. **Background & personality** — background, alignment, traits/ideals/bonds/flaws (pick or roll), appearance, backstory, deity.
6. **Equipment** — resolve choices, packs, shops with gold, weight tracking.
7. **Review** — complete sheet, validation summary, create.
- **Acceptance:** all 9 races × 12 classes × 13 backgrounds combinations create without errors (generated test); cannot finish with open required choices.

### F3.3 Character sheet
- Faithful digital version of the official sheet (p.317): abilities, saves, skills (proficiency/expertise markers), AC, initiative, speed, HP/temp HP/hit dice, death saves, attacks & spellcasting, features & traits, proficiencies & languages, equipment & currency, personality, spells page.
- "Why?" tooltips from the engine breakdown on every number.
- Mobile layout with tabs (Stats / Actions / Spells / Inventory / Bio).
- **Acceptance:** printed sheet values equal engine output; Tab-key operable; 360 px layout usable.

### F3.4 Inventory & equipment
- Add/remove items, quantity, equip/unequip (armor, shield, weapons in hands), attunement placeholder, weight/encumbrance (optional), currency with auto-conversion, packs expand into contents.
- AC/attacks update live when equipping.
- **Acceptance:** donning heavy armor below Str requirement shows speed penalty; two-weapon/versatile options offered correctly.

### F3.5 Level-up flow (Ch.1 p.15, Ch.3)
- Triggered by XP or DM grant. Steps: choose class (multiclass allowed if prerequisites met), HP (roll/average), new features, subclass at the right level, ASI **or** feat at 4/8/12/16/19 (Fighter 6/14, Rogue 10), new spells/cantrips, replace a spell (known casters), expertise, fighting style, Pact Boon/Invocations, Metamagic, etc.
- **Acceptance:** level 1→20 for every class produces tables identical to the handbook; undo last level-up.

### F3.6 Multiclassing (Ch.6 p.163)
- Prerequisite check (13 in key ability), proficiencies gained, combined caster level & slots, Pact Magic separate, feature stacking rules.
- **Acceptance:** Fighter 5/Wizard 3 & Cleric 3/Paladin 2 examples match the book's table.

### F3.7 Feats (Ch.6 p.165)
- Selectable at ASI levels (and Human variant at 1), prerequisites enforced, choices inside feats (e.g. Resilient ability, Skilled proficiencies, Magic Initiate class/spells), effects applied by engine.
- **Acceptance:** all 42 feats selectable; prerequisites block illegal picks; effects visible in derived stats where automatable.

### F3.8 Spell management (preparation side of Ch.10)
- Spells known (Bard, Sorcerer, Ranger, Warlock), prepared (Cleric, Druid, Paladin, Wizard — level + ability mod), wizard spellbook (copying, 2 free spells per level), domain/oath always-prepared spells, ritual casting from book.
- Spell slot tracker (per level, expend/recover), Warlock Pact slots, Sorcery Points ↔ slots conversion UI, cantrip scaling by level.
- **Acceptance:** limits enforced; slot totals match the table for every caster; preparation changeable on long rest only (DM-lockable).

### F3.9 Class resource trackers
- Auto-generated trackers for limited-use features: Rage, Bardic Inspiration, Channel Divinity, Wild Shape, Second Wind, Action Surge, Ki, Lay on Hands pool, Sorcery Points, Arcane Recovery, Superiority Dice, Indomitable, Favoured Foe etc. with correct recharge type.
- **Acceptance:** counts/dice scale with level; short/long rest buttons reset the right ones.

### F3.10 Companions & forms
- Pets/familiars/beast companions/Wild Shape forms as linked creature sheets using Appendix D statistics (data from Phase 1).
- **Acceptance:** Find Familiar, Beast Master companion, and Wild Shape (CR limit by level) are creatable and use the stat blocks.

### F3.11 Printing & export
- Print-ready CSS and PDF export of the official-style sheet and spell cards; JSON export/import.
- **Acceptance:** two-page PDF opens correctly; re-import yields identical character.

### F3.12 Character rules audit
- "Validate" button lists every rule issue with the page reference; auto-fix suggestions where safe. DM can run it from the campaign view.

## Exit criteria

- Any PHB-legal character L1–20 can be built, levelled, stored, printed.
- Generated-combination tests and class-progression tests green.
- Characters reference content by `index`; saved characters survive content re-seeds.
