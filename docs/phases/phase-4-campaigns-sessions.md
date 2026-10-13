# Phase 4 — Campaigns & Live Sessions

**Goal:** a DM and players share a real-time table: join, chat, roll dice, keep a journal, and resume later.
**Size:** M · **Depends on:** Phase 3 · **Handbook:** Introduction "How to Play" p.6–7, Ch.7 (rolls), Ch.8 (time)

## Features

### F4.1 Campaign creation & settings
- Create campaign (name, description, cover), choose house rules/variants: feats, multiclassing, variant human, encumbrance, flanking, critical-hit style, HP method (average/roll), rest variant, content license mode.
- **Acceptance:** settings stored per campaign and honoured by creator/engine (e.g. multiclassing off hides option).

### F4.2 Membership & invites
- Invite link/code; roles DM/PLAYER; optional co-DM; remove/leave; max players.
- Attach/detach characters; character locks to a campaign while active; DM may require approval and run the audit (F3.12).
- **Acceptance:** non-members cannot access a campaign (authz test); invite revocation works.

### F4.3 Campaign hub
- Dashboard: party roster (public stats: name, HP bar status words, AC if DM allows, conditions), next session, recap, quests, locations, NPCs.
- **Acceptance:** DM and player views differ correctly (see F4.9).

### F4.4 Live session table
- "Session" page: presence list, party panel, shared scene description (DM-written text/image), initiative/encounter area (filled in Phase 5), chat, roll log.
- DM controls session start/end; summary prompt on end.
- **Acceptance:** 5 browser contexts see each other's presence and updates < 500 ms.

### F4.5 Realtime infrastructure
- Event log + SSE + `LISTEN/NOTIFY` as in [01-architecture](../01-architecture.md#realtime); reconnect with replay; idempotent client action ids; optimistic UI with rollback; polling fallback.
- **Acceptance:** killing the network mid-session and restoring shows no missed/duplicate events.

### F4.6 Dice roller & roll log
- Roll any expression; quick buttons from the sheet (skill checks, saves, attacks, damage, initiative) with advantage/disadvantage toggle; reasons shown ("Stealth (Dex +5, proficient)").
- DM secret rolls (visible only to DM); players can enter physical-dice results; roll history per session; critical/fumble highlighting.
- **Acceptance:** roll results identical for all clients; secret rolls never reach player clients.

### F4.7 Chat
- Table chat, whispers (player↔DM, player↔player), in-character vs OOC tags, slash commands (`/roll`, `/w`, `/me`), links to rules entries (`[[Fireball]]` renders a hover card).
- **Acceptance:** whisper privacy tested at network level.

### F4.8 Journal, notes & handouts
- Session summaries, party journal (shared), private notes, DM notes with reveal-to-players toggle, image/text handouts.
- **Acceptance:** visibility levels (`DM_ONLY`, `PLAYER`, `PARTY`) enforced server-side.

### F4.9 Visibility model
- Central `visibility` filter used by every query/stream: DM sees all; players see own character fully, others' public view, revealed NPCs/locations only.
- **Acceptance:** contract tests assert no hidden fields (monster HP, DM notes, unrevealed NPCs) appear in any player payload.

### F4.10 DM screen basics
- Panels: party at a glance (AC, passive Perception/Insight/Investigation, HP, spell save DC), quick roll bar, notes, scene control, "award XP/gold/items".
- **Acceptance:** all party passives and DCs correct against engine values.

### F4.11 Session persistence & resume
- All state (HP, slots, resources, conditions, scene) persisted continuously; "resume session" restores exactly; session end triggers autosave snapshot.
- **Acceptance:** acceptance-script step 8 (refresh & reconnect) passes.

### F4.12 Character updates in play
- Player can adjust own HP/temp HP/slots/resources/inventory from the table; DM can adjust anyone's; all changes are events in the log (undo for DM).
- **Acceptance:** changes appear in log with actor and are reversible by the DM.

## Exit criteria

- A DM and 4 players can hold a theatre-of-the-mind session: chat, roll, update sheets, keep notes; state persists.
- No hidden-information leaks in contract tests.
