# 05 — Testing & Quality

## Test pyramid

| Level | Tool | Scope |
|---|---|---|
| Engine unit tests | Vitest | Every rule in `engine/`. Table-driven from handbook examples. Target ≥95% line coverage on `engine/` |
| Content tests | Vitest | Zod validation, referential integrity, count regression ([04](04-content-pipeline.md)) |
| Integration | Vitest + Prisma against a throwaway Postgres | Server actions, permissions, event log, SSE replay |
| Component | Testing Library | Creator steps, sheet, initiative tracker, spell picker |
| End-to-end | Playwright (2+ browser contexts for multiplayer) | Acceptance script below |
| Property tests | fast-check | Dice parser, modifier/derivation invariants, slot tables |

## Rules-correctness tests (examples that must exist)

- Ability modifier: 1→−5, 10–11→0, 20→+5, 30→+10.
- Proficiency bonus by level: 1–4 +2 … 17–20 +6.
- Advantage + disadvantage (any count) = normal roll.
- Fighter 5 / Wizard 3 multiclass: correct combined spell slots, Extra Attack, proficiencies gained.
- AC: Chain mail (16, Str 13, stealth disadv.), Studded leather + Dex 16 = 15, Barbarian Unarmored Defense = 10 + Dex + Con, Monk = 10 + Dex + Wis.
- Crit: dice doubled once, modifiers not; Sneak Attack included.
- Concentration check DC = max(10, floor(damage/2)).
- Death saves: nat 20 revives with 1 HP; nat 1 = 2 failures; damage at 0 HP; massive damage instant death.
- Resting: long rest restores HP, half hit dice (min 1), slots, long-rest resources; short rest spends hit dice, Warlock slots return.
- Spell upcasting damage (Fireball slot 4 = 9d6), Magic Missile darts, Cure Wounds scaling.
- Travel pace distance per minute/hour/day; falling 1d6 per 10 ft, max 20d6.
- Exhaustion levels 1–6 effects.

## "Fully playable" acceptance script (Playwright, multi-user)

Automated, runs in CI nightly; also the manual playtest checklist.

1. **Create**: User A (DM) and Users B–D each create an account. B builds a Human Fighter, C an Elf Wizard, D a Halfling Rogue, using all three ability methods across them.
2. **Campaign**: A creates a campaign; B–D join by invite code and attach characters.
3. **Session**: A starts session 1; all see presence. Chat and dice (`/roll 2d6+3`, secret roll by DM) sync.
4. **Exploration**: A calls a Perception check; players roll; A reveals a hidden door. Party travels at normal pace; torch/light and a Dex save vs. trap resolve.
5. **Combat**: A builds an encounter (goblins, a wolf) from the monster list; initiative rolled; turns advance; B attacks with a longsword (advantage from Help), C casts *Magic Missile* and *Sleep*, D Sneak Attacks and uses Cunning Action; goblins hit; a character drops to 0 HP, makes death saves, is stabilised/healed; conditions (prone, grappled) apply their effects; concentration spell broken by damage.
6. **Aftermath**: XP awarded; loot distributed; short rest (hit dice) then long rest (slots/resources restored).
7. **Level up**: B → level 2 (Action Surge), C → level 3 (school chosen, 2nd-level slots), D → level 4 (ASI vs. feat). Characters correct vs. handbook tables.
8. **Persistence**: refresh and reconnect mid-combat — state identical; event log replays.
9. **High level smoke**: engine-generated level 20 character of each class passes sheet validation; a level 20 casting a 9th-level spell works.
10. **Permissions**: player cannot see monster HP or DM notes (network-level check, not just UI).

## Non-functional targets

| Area | Target |
|---|---|
| Performance | Wiki page TTFB < 300 ms (cached); table action → all clients updated < 500 ms; sheet derive() < 20 ms |
| Reliability | Reconnect with replay; actions idempotent (client-generated action ids) |
| Accessibility | WCAG 2.2 AA: keyboard play of the table, ARIA live region for the combat log, colour-independent condition icons, reduced-motion respected |
| Responsive | Fully usable at 360 px width (players), DM screen optimised for ≥ 1024 px |
| Security | Authz tests for every server action (role matrix); rate limits; no hidden data leakage; dependency audit in CI |
| Browser support | Latest 2 versions of Chrome, Firefox, Safari, Edge |

## Definition of done (per feature)

- Rule behaviour has engine tests referencing the handbook page.
- Server action has permission + validation tests.
- UI has keyboard and mobile pass.
- Row in [03-rules-coverage.md](03-rules-coverage.md) updated.
- Feature doc in its phase file has all acceptance criteria checked.
