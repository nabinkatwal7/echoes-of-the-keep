# Phase 8 — Polish & Launch

**Goal:** harden the product, remove rough edges, and ship.
**Size:** M · **Depends on:** Phase 7 · **Handbook:** whole-book verification
**Milestone:** M5 Release

## Features

### F8.1 Rules verification pass
- Walk the entire [coverage matrix](../03-rules-coverage.md); every row ✅ or ➖ or deferred with written reason.
- Playtest ≥ 5 full sessions with real groups across level bands 1–4, 5–10, 11–16, 17–20; triage issues into rules bugs vs. UX bugs.
- **Acceptance:** zero open P0/P1 rules bugs; known deviations documented in a public "Rules notes" page.

### F8.2 Onboarding & help
- First-run tour for players and DMs; "Learn to play" guide drawn from the Introduction (p.5–7); contextual rule tooltips citing handbook pages (where licence allows); sample pre-built characters and a tutorial one-shot encounter.
- **Acceptance:** new user can create a character and complete a tutorial combat in < 15 minutes.

### F8.3 Mobile & responsive polish
- Verify all play screens at 360 px; PWA install, offline sheet view (read-only, sync on reconnect); large touch targets; landscape layout for DM tablet.

### F8.4 Accessibility
- WCAG 2.2 AA audit; screen-reader pass of sheet, creator, and combat tracker; reduced motion; high-contrast theme; colour-independent indicators; dyslexia-friendly font option.

### F8.5 Performance
- Wiki: ISR/CDN caching; search index tuning; images optimised.
- Table: batched event delivery, virtualised long logs, memoised `derive()`; DB indexes verified with `EXPLAIN` on hot queries; load test 20 concurrent campaigns × 6 users.
- **Acceptance:** NFR targets in [05](../05-testing-and-quality.md#non-functional-targets) met.

### F8.6 Homebrew & custom content
- Create custom races/subraces, backgrounds, feats, spells, items, monsters using the same Zod-validated schemas; scoped to user or campaign; share via import/export JSON.
- **Acceptance:** a homebrew spell and monster can be used in combat like official ones.

### F8.7 Data safety & portability
- Automated Postgres backups and restore drill; soft delete with recovery window; full account data export (characters, campaigns, journal); account deletion; campaign export (JSON + Markdown journal).

### F8.8 Security & privacy review
- Authorisation matrix re-test for every server action and stream; rate limiting; dependency audit; content security policy; uploaded-file validation; privacy policy & terms; cookie consent where required.
- **Acceptance:** external or internal pen-test checklist passed; secrets rotated; no PII in logs.

### F8.9 Observability & operations
- Error tracking, structured logs, uptime checks, metrics (active sessions, event latency, error rates); runbooks for DB failover, realtime outage, content reseed; feature flags.

### F8.10 Licensing & attribution
- Apply the chosen distribution model ([04](../04-content-pipeline.md#licensing-note-read-first)): SRD-only public build with CC-BY attribution page, or private deployment; ensure no non-SRD data in public artefacts and repo history.
- **Acceptance:** `CONTENT_LICENSE_MODE=SRD_ONLY` build verified free of non-SRD content.

### F8.11 Docs & release
- User docs (player guide, DM guide, FAQ), developer docs (setup, architecture, content pipeline, engine API), changelog, versioning; release checklist; announcement site.

### F8.12 Post-launch backlog (not in v1)
- Fog of war & dynamic lighting, voice/video integration, additional rule sources (Xanathar's/Tasha's-style add-ons via homebrew packs), encounter generator by theme, AI-assisted prep tools, native apps, shared content marketplace.

## Exit criteria

- All milestones M1–M5 met; production deployment live with backups and monitoring.
- A new group can sign up, build characters, and play a campaign from level 1 with no assistance.
