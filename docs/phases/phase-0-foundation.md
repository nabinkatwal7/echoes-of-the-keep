# Phase 0 — Foundation

**Goal:** a solid base so every later phase is just features: auth, database, design system, tooling, CI, and the skeleton of the content pipeline.
**Size:** S · **Depends on:** nothing · **Handbook:** n/a

## Already done

- Next.js 15 / Tailwind app with wiki layout and sidebar.
- Postgres + Prisma wired up (`docker-compose.yml`, `prisma/`, `lib/prisma.ts`, `.env.example`, `db:*` scripts).

## Features

### F0.1 Authentication
- Auth.js with email magic link + Google/Discord OAuth; Prisma adapter (`Account`, `Session`, `User`, `VerificationToken`).
- `getSession()` / `requireUser()` helpers; middleware protecting `(app)/` routes; wiki stays public.
- **Acceptance:** sign up, sign in/out, session persists; unauthenticated users redirected from `/characters` and `/campaigns`; wiki accessible anonymously.

### F0.2 Schema baseline & migrations
- Replace placeholder `User` model with the account model; add first migration; seed script structure.
- **Acceptance:** `npm run db:up && npx prisma migrate dev && npm run db:seed` works from a clean clone.

### F0.3 Design system
- Tokens (colours, typography — a parchment/dark fantasy theme with light/dark modes), spacing, focus rings.
- Components: Button, Input, Select, Dialog, Tabs, Tooltip, Toast, Card, Badge, Table, Stat block, Dice-result chip. Built on existing `cn()` util and `motion`.
- Layout shells: marketing, wiki (existing), app (top nav + campaign switcher), mobile bottom nav.
- **Acceptance:** Storybook (or `/dev/ui` page) shows every component in light/dark; keyboard and screen-reader checked.

### F0.4 Tooling & CI
- Vitest, Testing Library, Playwright configured; `engine/` and `content/` directories created with first smoke tests.
- ESLint + Prettier + `tsc --noEmit`; Husky/lint-staged (optional).
- GitHub Actions: install → typecheck → lint → unit tests → `prisma validate` → build; Postgres service container for integration tests.
- **Acceptance:** green pipeline on a PR; failing test blocks merge.

### F0.5 Config & secrets
- `.env.example` documents `DATABASE_URL`, `AUTH_SECRET`, OAuth keys, `CONTENT_LICENSE_MODE`.
- Zod-validated env loader (`lib/env.ts`) that fails fast.
- **Acceptance:** app refuses to boot with missing required env and says which.

### F0.6 Content pipeline skeleton
- Create `content/{raw,extracted,overrides,schemas,build}`; a CLI `npm run content:build` that runs a no-op over one entity (Alignment) end to end: snapshot → validate → seed. See [04](../04-content-pipeline.md).
- `source`/`page` columns convention applied.
- **Acceptance:** Alignments seeded from the pipeline and rendered on the existing wiki page from the DB rather than `getData`.

### F0.7 Documentation & contribution
- Replace boilerplate `README.md` with setup, scripts, architecture links to `docs/`.
- ADRs for key decisions (realtime transport, license mode, effects model).

## Exit criteria

- Clean-clone setup works from README in < 10 minutes.
- Auth + DB + CI + design system in place; one wiki page already reads from the DB.
