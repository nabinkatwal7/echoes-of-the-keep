# Contributing

Thanks for helping. This is a small project; keep changes focused and tested.

## Set up

```bash
pnpm install
cp .env.example .env        # then set AUTH_SECRET (npx auth secret)
pnpm db:up                  # PostgreSQL in Docker
pnpm db:migrate
```

The app needs rules data to be useful. The repository does not ship the *Player's Handbook* or text extracted from it, so you have two options:

- Supply your own legitimate copy as `DD-Player-Handbook.pdf` and run `pnpm content:extract` then `pnpm db:seed` (private use only), or
- Seed the free-rules subset with `pnpm db:seed:srd` once you have extracted data, and import SRD monsters with `node scripts/import-srd-monsters.mjs`.

See [docs/04-content-pipeline.md](docs/04-content-pipeline.md) and [docs/licensing.md](docs/licensing.md).

## Before you open a pull request

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Tests that need the handbook extract skip themselves when it is missing. Database tests run with `pnpm test:db` against a seeded database; browser and accessibility checks run with `pnpm e2e`.

## Ground rules

- **Never commit** the handbook PDF, anything under `content/extracted/`, or text copied from the *Player's Handbook* or other copyrighted books. Pull requests that add them will be closed.
- Rules logic belongs in `engine/` (pure, no database) with a unit test.
- Keep the app usable without a mouse and without motion: new animations must stop for `prefers-reduced-motion`, and the accessibility checks in `e2e/a11y.spec.ts` should keep passing in both themes.
- Sign-in stays username and password; no third-party sign-in.
