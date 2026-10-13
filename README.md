# Dungeons & Dragons

A web app for playing D&D 5e end to end: rules wiki, character builder, and live campaigns with a human Dungeon Master.
Plan and status: [docs/README.md](docs/README.md). Work list: [instructions.txt](instructions.txt).

## Setup

Requires Node 22+, pnpm, and Docker (or any Postgres 17).

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET and at least one sign-in provider
pnpm db:up                    # start Postgres
pnpm exec prisma migrate dev  # apply migrations
pnpm db:seed                  # load rules content
pnpm dev                      # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm test` / `test:watch` | Vitest |
| `pnpm typecheck` / `lint` / `format` | Quality checks |
| `pnpm db:up` / `db:migrate` / `db:seed` / `db:studio` | Database |
| `pnpm content:extract` | Re-extract text and data from `DD-Player-Handbook.pdf` (needs Python, `pdftotext`, `pip install wordninja`) |

## Layout

- `app/` Next.js routes (wiki is public; `(app)/` requires sign-in)
- `engine/` pure rules engine (no I/O)
- `content/` extraction scripts, schemas, overrides, importers
- `lib/` server helpers (Prisma, auth, env)
- `prisma/` schema, migrations, seed
- `docs/` product plan, phases, ADRs

## Content licensing

The handbook PDF is copyrighted. Only SRD 5.1 content may be published publicly; see [docs/04-content-pipeline.md](docs/04-content-pipeline.md).
