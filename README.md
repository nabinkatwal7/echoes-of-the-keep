# Echoes of the Keep

A web app for playing D&D 5th Edition end to end: a rules wiki, a hero builder, live campaigns with a human Dungeon Master, a combat tracker with spells, a Dungeon Master toolkit, and **solo play** with a computer Dungeon Master and companions.

> An unofficial fan project, not affiliated with or endorsed by Wizards of the Coast. The *Player's Handbook* is copyrighted: keep the extracted text private, or run in SRD-only mode. Read [docs/licensing.md](docs/licensing.md) before putting this on the internet.

## What it does

| Area | Highlights |
| --- | --- |
| **Rules wiki** | Chapters, classes, races, backgrounds, feats, equipment, spells and 330+ creatures, searchable |
| **Heroes** | Guided creator (three ability methods, variant human, multiclassing), a sheet that explains every number, level-up, spells, rests, companions, inventory and money, import and export, print |
| **Campaigns** | Invites, a shared table with chat, secret rolls and whispers, a live event stream, presence, journal and handouts, sessions with recaps, a call link |
| **Combat** | Initiative, the full action economy, attacks, grapple and shove, conditions with timers, death saves, a grid with walls, fog of war and line of sight, opportunity attacks, mounted and underwater rules, undo |
| **Spells in play** | Attacks, saves, damage and healing with scaling, areas, concentration, buffs and debuffs, summons, Counterspell, Divine Smite, Sneak Attack, metamagic. About 38 percent of spells resolve automatically |
| **DM toolkit** | A DM screen, the clock and light, travel, party rests, checks, rewards, hazards, resurrection, NPCs with attitudes, places and scenes, quests, stash, random tables, homebrew monsters and spells, an encounter builder |
| **Solo play** | Play a hero with a computer DM and companions, or run the game with computer heroes ([guide](docs/solo-play.md)) |
| **Accounts** | Username and password, recovery codes, data export, 14-day account deletion |
| **Quality** | Strict TypeScript, about 590 unit and 85 database tests, accessibility scans in CI |

## Quick start

Requires Node 22 or later, pnpm, and PostgreSQL 17 or later (Docker works).

```bash
pnpm install
cp .env.example .env            # set AUTH_SECRET (16+ characters); DATABASE_URL points at your Postgres
pnpm db:up                      # optional: Postgres in Docker
pnpm exec prisma migrate deploy # create the tables
pnpm db:seed                    # load the rules content (see Content below)
pnpm dev                        # http://localhost:3000
```

Try it quickly with demo accounts (a DM and a player, with a campaign and a hero):

```bash
pnpm exec tsx scripts/demo-seed.ts   # sign in as demo_dm or demo_player, password demo-password-1 (local development only)
```

For a production build set `AUTH_TRUST_HOST=true` (or `AUTH_URL`), then `pnpm build` and `pnpm start`.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Signs sessions, at least 16 characters. Changing it signs everyone out |
| `AUTH_TRUST_HOST` / `AUTH_URL` | Needed when serving from a real host |
| `CONTENT_LICENSE_MODE` | `FULL` (default, private use) or `SRD_ONLY` (public-safe subset) |
| `LOG_LEVEL` | `debug`, `info` (default), `warn`, `error` |

## Content

The rules content comes from a copy of the *Player's Handbook* you supply as `DD-Player-Handbook.pdf` (`pnpm content:extract` reads it; this needs Python, `pdftotext` and `pip install wordninja`). `pnpm db:seed` loads it. `pnpm db:seed:srd` loads only the parts that appear in the free SRD 5.1 and removes the rest.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev`, `build`, `start` | Run the app |
| `pnpm typecheck`, `lint`, `format` | Quality checks |
| `pnpm test` | Unit tests |
| `pnpm test:db` | Database integration tests (needs a migrated, seeded database) |
| `pnpm e2e` | Browser tests with accessibility scans (needs a build and the demo data) |
| `pnpm db:migrate`, `db:seed`, `db:seed:srd`, `db:studio`, `db:up` | Database |
| `pnpm content:extract` | Re-extract content from the PDF |
| `pnpm spells:coverage` | Report which spells are automated |
| `pnpm monsters:audit` | Run every stat block through the combat code |
| `pnpm backup` | Dump the database (keeps the newest 14) |
| `pnpm purge:accounts` | Remove accounts deleted more than 14 days ago |
| `pnpm load-test` | Latency under concurrency |

## Layout

```
app/        routes and pages (wiki is public; (app)/ needs sign-in)
engine/     pure rules engine: no I/O, no React, no database
lib/        server code: actions, queries, planners
content/    extraction scripts, schemas, importers
prisma/     schema and migrations
scripts/    operations and audits
tests/      database integration tests
e2e/        Playwright tests
docs/       documentation (start at docs/README.md)
```

## Documentation

Start with [docs/README.md](docs/README.md). The most useful pages:

- [User guide](docs/user-guide.md): playing and running games
- [Solo play](docs/solo-play.md): the computer Dungeon Master and companions
- [Architecture](docs/01-architecture.md) and [data model](docs/02-data-model.md)
- [Testing](docs/05-testing-and-quality.md)
- [Runbook](docs/runbook.md) and [release checklist](docs/release-checklist.md)
- [Security review](docs/security-review.md), [accessibility](docs/accessibility.md), [licensing](docs/licensing.md)
- [Changelog](docs/CHANGELOG.md)

## Contributing

1. Make the change with a test (engine tests for rules, database tests for actions).
2. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`.
3. If you add a page, add it to the axe scan in `e2e/a11y.spec.ts`.
4. Update the user guide and any architecture or data-model page the change affects.

Two things that trip people up: files with `"use server"` may export only async functions (the type checker will not tell you; `pnpm build` will), and database tests must import `./db` before anything that imports `@/lib/auth`.
