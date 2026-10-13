# Phase 2 — Rules Engine

**Goal:** a pure, exhaustively tested TypeScript implementation of core mechanics that every later feature calls. No I/O, no React, no Prisma.
**Size:** L · **Depends on:** Phase 0 (can run parallel to Phase 1) · **Handbook:** Ch.1, 6, 7, 8 (rest/travel math), App.A

## Features

### F2.1 Dice
- Parser for expressions: `2d6+3`, `4d6kh3`, `1d20+5 adv`, `d%`, reroll/exploding not required.
- Roller with injectable RNG; results include every die for display; advantage/disadvantage helpers.
- **Acceptance:** property tests on distribution bounds; seeded determinism; adv+disadv always cancel (Ch.7 p.173).

### F2.2 Ability scores & checks (Ch.7)
- Modifier table, proficiency bonus by level, skill/save bonuses, expertise, half-proficiency (Jack of All Trades), passive scores, group checks, contested checks, Help action, DC guidance.
- **Acceptance:** the Ch.7 skill list (18) maps to correct abilities; all worked examples reproduce.

### F2.3 Ability-score generation (Ch.1)
- Standard array (15,14,13,12,10,8), point buy (27 points, 8–15, costs 0/1/2/3/4/5/7/9), 4d6-drop-lowest with validation.
- **Acceptance:** invalid assignments rejected with reasons.

### F2.4 Effects model & derivation
- `Effect` type and `derive(character, activeEffects) → DerivedStats + Breakdown` covering: level, proficiency bonus, ability totals (racial bonuses, ASI, cap 20), HP max (hit die, Con mod, per-level, Tough/Dwarven Toughness), AC (armor, shield, Unarmored Defense, Dex caps, Str requirement), speed, initiative, senses, skills, saves, attacks (attack bonus & damage per weapon incl. finesse/versatile/two-hand), carrying capacity, languages, resistances/immunities.
- **Acceptance:** snapshot tests for ≥30 reference characters across all races/classes; breakdown strings explain each total.

### F2.5 Progression (Ch.1, Ch.6)
- XP thresholds levels 1–20; level-up transitions (HP by average or roll, new features, ASI/feat at 4/8/12/16/19, class-specific), multiclass prerequisites, proficiencies gained when multiclassing, multiclass spell slot table, Extra Attack non-stacking, caster-level calculation.
- **Acceptance:** progression from 1→20 for each class produces the book's tables (features, slots, resources).

### F2.6 Resources & rests
- `Resource` (max, current, recharge: short/long/dawn/none), hit dice pool, short rest (spend hit dice, Con mod), long rest (HP, half hit dice min 1, slots, resources, −1 exhaustion).
- **Acceptance:** rest edge cases tested (no long rest twice within 24h flag, Warlock short-rest slots).

### F2.7 Conditions & exhaustion (App.A)
- All 15 conditions as effect bundles with consequences: attack roll adv/disadv, auto-fail checks/saves, speed 0, incapacitation implications, auto-crit within 5 ft for Paralyzed/Unconscious, Exhaustion levels 1–6.
- **Acceptance:** each condition has a test table matching the appendix text.

### F2.8 Damage, healing, HP
- Damage application order (temp HP first), resistance/vulnerability/immunity (resistance then vulnerability, once each), healing caps, instant death rule, drop to 0 HP, death-save state machine, stabilisation, knocked-out-by-nonlethal.
- **Acceptance:** Ch.9 p.196–198 examples reproduced.

### F2.9 Environment math (Ch.8)
- Travel pace (slow/normal/fast ft/min, mi/hour, mi/day) and modifiers, jump distances, falling damage (1d6/10 ft, max 20d6, prone), suffocation (1 + Con mod minutes), vision/light state evaluation, food & water, carrying capacity & optional encumbrance.
- **Acceptance:** formulas verified against book tables.

### F2.10 Validation
- `validateCharacter(char)` returns a list of rule violations (illegal race/class combos not applicable; prerequisites unmet; too many proficiencies chosen; spells not on list/level; AC/weapons legality). Powers creator step validation and DM review.
- **Acceptance:** every rule violation from the Ch.1 checklist is detected.

## Deliverables

- `engine/` package with full API docs (TSDoc) and a usage README.
- Test suite referencing handbook pages in test names, ≥95% coverage.
- Benchmarks: `derive()` under 20 ms for a level 20 multiclass caster.

## Exit criteria

- Given content data, the engine derives correct stats for any legal level 1–20 build.
- Combat- and spell-related engine modules exist as typed interfaces with condition/damage logic done; their orchestration comes in Phases 5–6.
