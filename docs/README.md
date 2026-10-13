# Dungeons & Dragons — Product Plan

A web app for playing **D&D 5th Edition** end to end: read the rules, build a character, join a campaign, and play full sessions (exploration, social, combat, spellcasting, levelling to 20) with a human Dungeon Master.

Source of truth for the rules is the *Player's Handbook* (`DD-Player-Handbook.pdf`, 317 pages). Every document below cites handbook chapters/pages so scope can be checked against the book.

## Documents

| Doc | Purpose |
|---|---|
| [00-product-vision.md](00-product-vision.md) | Who it's for, what "completely playable" means, scope, non-goals |
| [01-architecture.md](01-architecture.md) | Tech stack, module layout, rules engine design, realtime, auth |
| [02-data-model.md](02-data-model.md) | Prisma entities: static rules content vs. user/campaign state |
| [03-rules-coverage.md](03-rules-coverage.md) | Chapter-by-chapter checklist mapping the handbook to features and phases |
| [04-content-pipeline.md](04-content-pipeline.md) | How handbook/SRD content becomes database rows; licensing note |
| [05-testing-and-quality.md](05-testing-and-quality.md) | Test strategy, the "playable" acceptance script, a11y/perf targets |
| [06-roadmap-and-risks.md](06-roadmap-and-risks.md) | Phase order, dependencies, sizing, risks, open questions |

## Phases

| # | Phase | Outcome |
|---|---|---|
| 0 | [Foundation](phases/phase-0-foundation.md) | Auth, DB, design system, CI, content pipeline skeleton |
| 1 | [Rules Content & Wiki](phases/phase-1-rules-content-wiki.md) | All handbook content browsable and searchable |
| 2 | [Rules Engine](phases/phase-2-rules-engine.md) | Pure, tested TypeScript implementation of the core mechanics |
| 3 | [Character Creator & Sheet](phases/phase-3-character-creator.md) | Create, level, and manage any PHB character |
| 4 | [Campaigns & Live Sessions](phases/phase-4-campaigns-sessions.md) | DM + players in a shared real-time table |
| 5 | [Combat](phases/phase-5-combat.md) | Full Chapter 9 combat with initiative, actions, conditions |
| 6 | [Spellcasting](phases/phase-6-spellcasting.md) | Slots, concentration, rituals, every PHB spell playable |
| 7 | [Exploration & DM Toolkit](phases/phase-7-exploration-dm-toolkit.md) | Chapter 8, encounters, monsters, treasure, XP, rests |
| 8 | [Polish & Launch](phases/phase-8-polish-launch.md) | Level 1–20 verified, mobile, a11y, export, release |

**Milestone "First Playable"** = end of Phase 5 (a group can run a combat-focused level 1–5 session).
**Milestone "Fully Playable"** = end of Phase 7 (everything in the handbook's rules is playable, 1–20).
Phase 8 hardens it for release.

## Current state (as of this plan)

- Next.js 15 / React 19 / Tailwind app with a wiki shell (`app/(wiki)/wiki/character`: abilities, alignment, background) and a stub `/play` page.
- Wiki content is fetched at runtime from an external API via `utils/getData.ts` (`NEXT_PUBLIC_API_URL`).
- Postgres + Prisma wired up with a placeholder `User` model (`prisma/schema.prisma`).
