# 01 - Architecture

How the app is built today. (The original plan, written before the build, is in [06-roadmap-and-risks.md](06-roadmap-and-risks.md) and the phase documents; where this page and the plan disagree, this page is right.)

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript, server actions |
| Styling | Tailwind with a custom "candlelit tome" theme (CSS variables in `app/globals.css`), Cinzel and EB Garamond via `next/font`, `react-icons` |
| Database | PostgreSQL with Prisma 6. Local Postgres or Docker (`docker-compose.yml`) |
| Authentication | Auth.js v5, **username and password only** (no third-party sign-in), JWT sessions, scrypt password hashing, database-backed login throttle, one-time recovery codes |
| Validation | Zod for content import and character import; explicit checks in every server action |
| Realtime | Server-Sent Events with Postgres `LISTEN/NOTIFY` wake-ups and a one-second poll as a safety net ([ADR 0001](adr/0001-realtime-transport.md)) |
| Tests | Vitest (unit and database integration), Playwright with axe-core (browser and accessibility) |
| CI | GitHub Actions: Prisma validate, typecheck, lint, unit tests, migrate, seed, database tests, build, Playwright |

## Layers

```
engine/     pure rules, no I/O, no React, no Prisma           (tested without a database)
lib/        server code: actions, queries, planners, helpers   (talks to Prisma)
app/        routes, pages, client components                   (calls lib/)
content/    extraction scripts, schemas, importers, seeds      (builds the rules tables)
prisma/     schema and migrations
scripts/    operations: backup, purge, load test, audits, demo data
e2e/        Playwright tests
tests/      database integration tests (RUN_DB_TESTS=1)
```

The rule that keeps this manageable: **`engine/` never imports from `lib/` or `app/`.** It takes plain data and returns plain data, so every rule can be tested with a table of inputs and shared by server and client.

### `engine/` (pure rules)

| Module | Holds |
| --- | --- |
| `dice` | Dice parser, roller, injectable RNG, advantage and disadvantage |
| `abilities` | Modifiers, proficiency, skills, saves, passive scores, group and contested checks |
| `character` | `deriveCharacter()`: level, proficiency, hit points, armor class, speed, skills, saves, attacks, with a breakdown of where each number comes from |
| `classes` | Class rules, equipment kits, resources (rage, ki, channel divinity), subclasses, spellcasting tables, spell selection checks |
| `progression` | Experience table, level-up hit points, multiclass prerequisites and spell slots, hit dice, Extra Attack |
| `effects`, `feats` | Racial and feat effects folded into derived numbers; feat prerequisites ([ADR 0003](adr/0003-effects-model.md)) |
| `combat` | Initiative, turn economy, attack resolution, grapple and shove, grid, area templates, line of sight and fog, pathing, monster stat-block parsing |
| `damage`, `conditions` | Resistances, death saves, damage application; the conditions and their timers |
| `spells` | Slots, concentration, upcasting, casting checks, the text parser that turns a spell into mechanics, summon rules |
| `rest`, `exploration`, `economy`, `xp`, `companions` | Rests and resources, travel and light, money, experience, wild shape and familiars |
| `world` | The clock, light burning down, travel time, encounter difficulty, social checks, downtime, resurrection, random tables |
| `bots`, `solo` | Ready-made computer heroes, the encounter builder and narration for [solo play](solo-play.md) |

### `lib/` (server)

| Area | Holds |
| --- | --- |
| `characters` | Creation, level-up, sheet actions, inventory, rests, spells, companions, import and export, rules audit |
| `campaigns` | Campaigns, members, chat commands, visibility filtering, house rules, call links, the event queries |
| `combat` | Encounters and combatants, the undoable `commit()`, per-viewer views, monster and hero planners, concentration, in-combat spells, auto-play |
| `journal`, `world` | Journal and handouts, sessions, the clock, travel, rests, checks, rewards, NPCs, places, quests, stash, tables, homebrew |
| `solo` | The solo-play director, bot accounts and cleanup |
| `account` | Password change, recovery codes, data export, soft delete and purge |
| `auth.ts`, `actAs.ts`, `password.ts`, `log.ts`, `srd.ts` | Session helpers, acting as a computer player, hashing, structured logging, SRD-only mode |

## Data flow

1. A page (server component) reads through a `lib/` query and passes plain props to a client component.
2. The client component calls a **server action** (a function in a `"use server"` file). Every action starts with `requireUser()` and then checks the person's role for the thing they touch.
3. The action runs the engine, writes to Postgres (usually in one transaction) and, for anything the table should see, appends a `CampaignEvent`.
4. Open pages learn about it through the event stream and refresh.

### Server actions and permissions

| Who | May |
| --- | --- |
| Anyone | Read the wiki and the learn, legal and rules-notes pages |
| A signed-in person | Own and edit their characters, keep homebrew entries, create and join campaigns, play solo |
| A campaign member | Read the table, chat, roll, see what is shared with them |
| The DM | Everything in their campaign: encounters, the clock, rewards, NPCs, quests, scenes, tables, the stash, resurrection, other players' sheets |
| A player | Act for their own hero, on their own turn (reactions any time) |

A "use server" file may export **only async functions**. Constants and helpers live in sibling files (`games.ts`, `call.ts`, and so on). The compiler does not catch this until `next build`, so build before shipping.

### Combat state and undo

Every combat change goes through `lib/combat/commit.ts`: it writes the changed combatants, mirrors hit points and conditions onto the character sheets, and appends a `combat` event carrying an **undo snapshot** (the rows before the change). The DM's *Undo last* restores it. Undo snapshots contain monster hit points and armor class, so `lib/campaigns/queries.ts` strips them from every event before it leaves the server.

### Who sees what

Filtering is done on the server before anything is sent:

- `lib/campaigns/visibility.ts` decides who sees an event (public, DM-only, a whisper to one person).
- `lib/combat/view.ts` builds each viewer's encounter view: players get health words for monsters, never exact hit points or armor class, never hidden creatures, and with fog of war only the foes their side can see.
- Unrevealed NPCs, places and quests are not loaded for players.

### Realtime

`GET /api/campaigns/:id/stream` is an SSE endpoint. It filters events per viewer, resumes from `Last-Event-ID`, wakes on a Postgres `NOTIFY` and also polls once a second. The table and combat pages listen to it and refresh when a relevant event arrives; combat also polls every 15 seconds in case the stream drops. `/api/campaigns/:id/presence` records and reports who has the table open.

### Acting as a computer player

Solo play lets bots act through the normal actions: `runAs(bot, fn)` (in `lib/actAs.ts`) makes `requireUser()` return the bot for one call chain, using `AsyncLocalStorage`. See [ADR 0004](adr/0004-bots-act-as-users.md) and [solo-play.md](solo-play.md).

## Content pipeline

`pnpm content:extract` reads the handbook PDF into `content/extracted/`; Zod-validated importers in `content/build/importers.ts` seed the database with `pnpm db:seed`. `pnpm db:seed:srd` seeds only SRD rows and removes the rest ([licensing.md](licensing.md)). Details: [04-content-pipeline.md](04-content-pipeline.md).

## Cross-cutting

| Concern | How |
| --- | --- |
| Security headers | Content-Security-Policy, frame, referrer and permissions policies in `next.config.ts` ([security-review.md](security-review.md)) |
| Logging | One JSON object per line (`lib/log.ts`); `LOG_LEVEL` controls verbosity |
| Health | `GET /api/health` (database check), `GET /api/metrics` (counts only) |
| Accessibility | Skip link, labelled controls, text equivalents for the maps, high-contrast and plain-type options, axe scans in CI ([accessibility.md](accessibility.md)) |
| Installability | Web manifest and service worker; the offline page lists sheets saved in the browser |
| Operations | [runbook.md](runbook.md) and [release-checklist.md](release-checklist.md) |

## Decisions

| ADR | Decision |
| --- | --- |
| [0001](adr/0001-realtime-transport.md) | Server-Sent Events over WebSockets |
| [0002](adr/0002-content-license-mode.md) | `FULL` and `SRD_ONLY` content modes |
| [0003](adr/0003-effects-model.md) | Effects folded by a pure `derive()` |
| [0004](adr/0004-bots-act-as-users.md) | Computer players act through the normal actions as their own users |
