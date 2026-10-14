# Operations runbook

## Run it

| Task | Command |
| --- | --- |
| Start Postgres locally (Docker) | `pnpm db:up` |
| Apply migrations | `pnpm exec prisma migrate deploy` |
| Load the rules content | `pnpm db:seed` |
| Development server | `pnpm dev` |
| Production build and start | `pnpm build` then `pnpm start` |
| Demo data (DM, player, campaign) | `pnpm exec tsx scripts/demo-seed.ts` |

Required environment: `DATABASE_URL`, `AUTH_SECRET` (16+ characters), optional `CONTENT_LICENSE_MODE` (`FULL` or `SRD_ONLY`), optional `LOG_LEVEL` (`debug`, `info`, `warn`, `error`).

## Health and monitoring

- `GET /api/health` returns `{"status":"ok","database":"up"}` with HTTP 200, or 503 when the database cannot be reached. Point an uptime monitor at it (every 1 minute, alert after 2 failures).
- The app writes one JSON object per line to standard output (`lib/log.ts`). Collect it with your platform's log shipping and alert on `"level":"error"`. Failed and throttled sign-ins are logged as `login failed` and `login throttled`; a burst of either for one username is a guessing attempt.
- The live table uses Server-Sent Events that poll the database once a second per open table. Watch database connection count if many tables are open at once.

## Backups

```bash
# create a compressed dump (needs pg_dump on the PATH)
pnpm backup

# restore into an empty database
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/dnd-YYYYMMDD-HHMMSS.dump
```

`scripts/backup.mjs` writes to `backups/` (ignored by git) and keeps the newest 14 dumps. Run it from a daily scheduled task. **Test a restore into a scratch database at least once**, and encrypt dumps that leave the machine.

## Common problems

| Symptom | Likely cause and fix |
| --- | --- |
| `EPERM` on `prisma generate` (Windows) | A running Node process holds the query engine. Stop the dev server, then generate |
| Pages return 500 after changing the schema | The generated client is stale. Stop the server, run `pnpm exec prisma generate`, restart |
| "migration was modified after it was applied" | Line endings changed in an applied migration. Do not reset the database. Create new migrations with `prisma migrate diff`, apply them, then `prisma migrate resolve --applied <name>` |
| Players cannot see new events | The stream route polls every second; check `/api/health`, then the browser's network tab for `/stream` |
| Everyone signed out | `AUTH_SECRET` changed |
| Login always fails for one person | They hit the throttle (5 failures in 10 minutes). It clears itself, or restart the process |

## Releasing

Follow `docs/release-checklist.md`.
