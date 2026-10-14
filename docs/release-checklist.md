# Release checklist

Use this before pointing a real group at a deployment. Default mode is private (`CONTENT_LICENSE_MODE=FULL`). A public site must use `SRD_ONLY` and still has the gaps in `docs/licensing.md`.

## Before the deploy

- [ ] `pnpm exec tsc --noEmit` passes
- [ ] `pnpm test` passes
- [ ] `pnpm test:db` passes against a throwaway database
- [ ] `pnpm build` succeeds
- [ ] `DATABASE_URL` and `AUTH_SECRET` (16+ characters) are set on the host, not committed
- [ ] Migrations applied with `pnpm exec prisma migrate deploy`, then `pnpm db:seed`
- [ ] `GET /api/health` returns 200
- [ ] A daily `pnpm backup` is scheduled, and one restore into a scratch database has been tried
- [ ] An uptime check hits `/api/health` every minute

## Smoke the table

- [ ] Register two accounts. One creates a campaign, the other joins with the invite code
- [ ] Build a hero, attach it, and open the table. Chat and a roll show up for both
- [ ] Start a fight, take a turn, and refresh mid-combat. The state is the same
- [ ] A player cannot see monster hit points or a DM-only note
- [ ] Download account data, then (on a throwaway account) delete it

## After it is live

- [ ] Watch logs for `"level":"error"`
- [ ] Note the version in the commit you deployed
