# 01 — Architecture

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript | Already in repo. Server Components for wiki; client components for live table |
| Styling | Tailwind 3, `clsx` + `tailwind-merge` (`utils/cn.ts`), `motion` | Already in repo |
| DB | PostgreSQL 17 + Prisma 6 | Local via `docker-compose.yml` |
| Auth | Auth.js (NextAuth) — email magic link + OAuth (Google/Discord) | Phase 0 |
| Validation | Zod | Shared between forms, server actions, and engine inputs |
| Realtime | Server-Sent Events for server→client, Server Actions / route handlers for client→server | See [Realtime](#realtime) |
| State (client) | TanStack Query for server data; Zustand for ephemeral table UI state | |
| Tests | Vitest (unit/engine), Playwright (e2e), Testing Library | |
| CI | GitHub Actions: typecheck, lint, test, prisma validate, e2e on PR | |

Hosting is left open (any Node host + managed Postgres). SSE over a long-lived Node process is assumed; if deploying to a serverless-only host, swap the realtime transport (see risks).

## Module layout

```
app/
  (marketing)/                 landing, login
  (wiki)/wiki/...              public rules reference (Phase 1)
  (app)/characters/...         character list, creator, sheet (Phase 3)
  (app)/campaigns/...          campaign hub, DM screen, table (Phase 4+)
  api/                         route handlers (SSE stream, webhooks)
lib/
  prisma.ts                    shared client
  auth.ts                      Auth.js config, session helpers
  realtime/                    publish/subscribe over Postgres LISTEN/NOTIFY
engine/                        PURE TypeScript, no I/O, no React, no Prisma
  dice/                        parser, roller, seeded RNG, advantage/disadvantage
  abilities/                   modifiers, checks, saves, passive scores
  character/                   derive(): level, prof bonus, AC, HP, speed, skills, attacks, slots
  combat/                      initiative, turn state machine, attack/damage resolution, death saves
  spells/                      slots, upcasting, concentration, components, rituals
  conditions/                  15 PHB conditions as effect modifiers
  exploration/                 travel pace, light, rests, hazards (falling, suffocation, etc.)
  progression/                 XP table, level-up, multiclass prerequisites/slot table
content/                       raw source data + loaders (see 04-content-pipeline.md)
prisma/                        schema, migrations, seed
docs/                          this plan
```

`engine/` is the most important boundary: it takes plain data in and returns plain data out. It can be unit-tested without a database, shared by server and client, and run in a worker.

## Rules engine design

- **Effects model.** Anything that changes a number (race trait, class feature, feat, spell, condition, magic item) is an **Effect**: `{ source, target stat, kind: bonus | set | advantage | disadvantage | resistance | grant | ..., value, condition, duration }`. `derive(character)` folds all active effects into final stats and returns a **breakdown** for the "why" tooltip.
- **Features as data where possible.** Simple features (proficiencies, bonuses, resistances, extra slots) are declarative JSON on content rows. Complex features (Rage, Sneak Attack, Wild Shape, Channel Divinity, Metamagic) are small TypeScript handlers registered by feature `index`, with a fallback of "DM-adjudicated" flag + text for anything not automated.
- **Resolvers return events.** Combat/spell resolvers return a list of events (`AttackRolled`, `DamageApplied`, `ConditionAdded`, `SlotSpent`…). The server persists events; clients render them. This gives the combat log, undo, and replay for free.
- **Determinism.** The RNG is injectable (seeded in tests; crypto-random in prod). Rolls are made server-side during live sessions so all clients see the same result; players may also enter physical-dice results.
- **DM override everywhere.** Every automated outcome has an override path (set HP, add/remove condition, adjust result) which is itself logged.

## Realtime

- Source of truth is Postgres. A mutation writes state + an event row in one transaction and issues `NOTIFY campaign:<id>`.
- `GET /api/campaigns/:id/stream` is an SSE endpoint that `LISTEN`s and forwards events; clients reconnect with `Last-Event-ID` to replay missed events.
- Clients send intents (move, attack, cast, roll) through server actions. The server validates permissions (player owns the character / is the DM), runs the engine, persists, and broadcasts.
- Presence (who is online) via heartbeat rows with TTL.
- Fallback: short-interval polling if SSE is blocked.

## Authorisation

| Role | Can |
|---|---|
| Anonymous | Read wiki |
| User | Own characters; join campaigns by invite |
| Player (in campaign) | Control own character(s); see public table state and own private notes |
| DM | All campaign state, hidden monster stats/HP, NPCs, secrets; can override any result |

Hidden information (monster HP, secret rolls, DM notes) is filtered server-side per role; it is never sent to player clients.

## Cross-cutting

- **i18n-ready strings** (English only at launch).
- **Accessibility:** keyboard-operable table, screen-reader labels, colour-independent conditions.
- **Observability:** structured logs, error tracking (Sentry), event log doubles as audit trail.
- **Security:** CSRF-safe server actions, rate limiting on roll/chat endpoints, input validation with Zod, secrets only in env (`.env.example` documents them).

## Migration from the current code

- `utils/getData.ts` (runtime fetch to `NEXT_PUBLIC_API_URL`) is replaced in Phase 1 by Prisma reads of seeded content. Wiki pages become Server Components calling `lib/content/*` query functions. `types/Character/Background.ts` is superseded by Prisma-generated types.
- `data/pageTabData/CharacterTabData.ts` and wiki sidebar are generalised into a content-type registry driving all wiki sections.
