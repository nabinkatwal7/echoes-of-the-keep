# 05 - Testing and quality

What is tested, how to run it, and how to add to it.

## At a glance

| Layer | Command | What it covers | Needs |
| --- | --- | --- | --- |
| Types | `pnpm typecheck` | The whole project under strict TypeScript | nothing |
| Lint | `pnpm lint` | ESLint with the Next.js rules (this also catches hooks misuse) | nothing |
| Unit | `pnpm test` | About 590 tests: every engine module, planners, parsers, content importers, small helpers | nothing |
| Database | `pnpm test:db` | About 85 tests that run real server actions against a real Postgres | a migrated, seeded database |
| Browser | `pnpm e2e` | Playwright with axe-core: accessibility, reflow, forced colors, keyboard, and the whole solo-play flow | a production build and the demo data |
| Build | `pnpm build` | Compiles everything; **catches mistakes the type checker cannot** (such as exporting a non-async function from a `"use server"` file) | nothing |

Always run `pnpm build` before shipping. CI runs all of the above in this order: Prisma validate, typecheck, lint, unit tests, migrate, seed, database tests, build, Playwright.

## Unit tests (`*.test.ts` next to the code)

The rules engine is pure, so most rules are table-driven tests of plain functions. Examples of what is pinned down:

- Ability modifiers, proficiency by level, passive scores, group and contested checks.
- Hit points per level, armor class for every armor type, Unarmored Defense, ability scores capped at 20.
- Spell slots: full casters, half and third casters (single-class rounds up, multiclass rounds down), warlock pact slots, multiclass tables.
- Attack resolution: advantage and disadvantage cancelling, critical hits doubling dice only, cover, ranged penalties, resistances, off-hand rules.
- Death saves, massive damage, healing from 0, concentration DC, temporary hit points not stacking.
- The text parser that turns a spell description into mechanics, area templates (sphere, cube, cone, line), line of sight and fog, pathing around walls.
- The monster and hero planners ([solo-play.md](solo-play.md#how-the-computer-decides)).
- The clock, light burning down, travel time, encounter difficulty, resurrection rules, downtime.
- Content importers (every record validates) and a count regression so a bad extraction is noticed.

Level 5, 10, 15 and 20 characters across several classes are checked in `engine/character/highlevel.test.ts`.

## Database tests (`tests/*.db.test.ts`)

These call the real server actions, signed in as test users, against the local database. They are skipped unless `RUN_DB_TESTS=1` (set by `pnpm test:db`).

Conventions:

- `tests/db.ts` mocks `@/lib/auth` so a test chooses who is signed in with `signInAs(user)`; it honours `runAs()` so computer players work. **Import `./db` before any module that imports `@/lib/auth`.**
- `makeUser(label)` creates a throw-away user and `cleanup()` (in `afterAll`) removes everything they made.
- Test the negative cases: a stranger, a player using a DM action, bad input.

| File | Proves |
| --- | --- |
| `characters` | Creation, equipment, level-up with a subclass, owner-only edits, DM edits logged to the table, portraits |
| `campaigns` | Invites, joining, chat and secret rolls, who can see which event, whispers between players, call link |
| `combat` | Encounter setup, initiative, only the controlling player acts and only on their turn, hidden monster numbers, attack then undo, XP at the end, no undo snapshot leaks |
| `combatSpells` | Cantrips, area spells, Shield, concentration, summons within their limits, walls blocking spells, fog hiding foes |
| `monsterAi` | Running a monster's turn: walk up, attack, end the turn |
| `play`, `companions`, `sorcery`, `portable`, `account` | Spells and rests, wild shape and familiars, Flexible Casting, character import and export, account export, password change and deletion |
| `journal`, `world` | Private notes versus shared handouts, sessions, the clock, travel, rests, checks, NPC attitudes, scenes, quests, stash, tables, homebrew monsters, resurrection |
| `playtest` | A scripted evening from the first roll to the saved recap |
| `botParty`, `solo` | Computer heroes under the real rules; a whole solo chapter; DM mode; cleanup |

## Browser tests (`e2e/`)

`e2e/a11y.spec.ts` runs axe-core against WCAG 2.0, 2.1 and 2.2 A/AA rules on:

- the public pages, and every signed-in page (heroes, account, campaign, table, combat, DM screen, world, journal);
- a character sheet on a desktop and on a 375 px phone;
- reflow at 320 and 640 px (no sideways scrolling), text-spacing overrides, forced-colors mode, and the skip link;
- the **solo-play flow through the real screens**: create a game, read the narration, enter a fight, and watch the computer take turns.

`e2e/learn.spec.ts` is a smoke test of the learn page.

Setup: sign-in tests use the demo accounts, created by `pnpm exec tsx scripts/demo-seed.ts` (a DM, a player with a hero, a campaign with an encounter). Run against a production build: `pnpm build`, then `AUTH_TRUST_HOST=true pnpm e2e`. Set `PORT` to use another port and `CHROMIUM_PATH` to reuse an installed Chromium instead of downloading the one Playwright expects.

## Audits and reports (not pass or fail)

| Command | Output |
| --- | --- |
| `pnpm spells:coverage` | [spell-automation.md](spell-automation.md): which spells resolve automatically |
| `pnpm monsters:audit` | [monster-audit.md](monster-audit.md): every stat block parsed, planned and attacked once |
| `pnpm load-test` | Latency percentiles for the main pages under concurrency (needs a running server and the demo data) |

## Playtesting

`tests/playtest.db.test.ts` is a scripted session: two players and a DM, a fight with real dice, spells, a long rest, a level-up, a saved recap. The dice are real, so it checks invariants that must hold on any roll rather than exact numbers. `tests/solo.db.test.ts` does the same for a whole solo chapter; set `DEBUG_SOLO=<file>` to write the full event log of the run to a file and read it like a transcript.

## Non-functional targets and where they stand

| Area | Target | Status |
| --- | --- | --- |
| Performance | Pages under about 1 second at 10 concurrent users | Met on the main pages; the full spell list is the slowest at roughly 600 ms |
| Accessibility | WCAG 2.2 AA | Automated checks pass; a screen reader pass by a person is still a release step ([accessibility.md](accessibility.md)) |
| Responsive | Usable at 360 px | Reflow checks at 320 and 640 px pass; the sheet has a pinned hit point bar on phones |
| Security | Permission checks on every action, no hidden data in what is sent | Reviewed in [security-review.md](security-review.md); tested in the database tests |
| Reliability | Reconnect with replay | Event stream resumes from `Last-Event-ID` |

## Definition of done for a feature

- The rule has an engine test that states the rule it implements.
- The server action has tests for who may and may not use it, and for bad input.
- The page passes the axe scan (add it to `e2e/a11y.spec.ts` if it is new).
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db` and `pnpm build` pass.
- The user guide and, where relevant, the architecture or data-model page are updated.
