# 06 — Roadmap, Dependencies, Risks

## Phase dependency graph

```
0 Foundation
 ├─► 1 Rules Content & Wiki ──┐
 └─► 2 Rules Engine ──────────┤
                              ▼
                     3 Character Creator & Sheet
                              ▼
                     4 Campaigns & Live Sessions
                              ▼
                        5 Combat ──► 6 Spellcasting
                              └──────────┬─┘
                                         ▼
                        7 Exploration & DM Toolkit
                                         ▼
                              8 Polish & Launch
```

Phases 1 and 2 can run in parallel (content vs. engine). Phase 6 can start once Phase 5's combat state machine exists (spells reuse targeting, saves, damage, conditions); out-of-combat spells (*Cure Wounds*, *Detect Magic*) can ship earlier with Phase 3 slot tracking.

## Sizing (relative; one full-time engineer ≈ 1 unit/week as a rough guide)

| Phase | Size | Notes |
|---|---|---|
| 0 Foundation | S (1–2 wks) | |
| 1 Content & Wiki | L (4–6 wks) | Dominated by data cleanup and mechanics encoding |
| 2 Rules Engine | L (4–5 wks) | Parallel with 1 |
| 3 Creator & Sheet | L (5–6 wks) | Class/subclass/spell choice UI is the bulk |
| 4 Campaigns & Sessions | M (3–4 wks) | Realtime plumbing |
| 5 Combat | L (5–6 wks) | |
| 6 Spellcasting | XL (6–8 wks) | ~360 spells; long tail |
| 7 Exploration & DM Toolkit | M–L (4–5 wks) | |
| 8 Polish & Launch | M (3–4 wks) | |

Total ≈ 35–45 engineer-weeks; with two engineers and parallelism, roughly 5–6 months.

## Milestones

| Milestone | After | Exit criteria |
|---|---|---|
| **M1 Reference** | Phase 1 | Full wiki searchable; content counts match book |
| **M2 Character Builder** | Phase 3 | Any PHB L1–20 character can be built, saved, printed |
| **M3 First Playable** | Phase 5 | Acceptance script steps 1–6 pass for level 1–5 martial + half-caster characters |
| **M4 Fully Playable** | Phase 7 | Entire acceptance script passes; coverage matrix has no open ⬜ rows in Parts 1–3 |
| **M5 Release** | Phase 8 | NFR targets met; docs, onboarding, backups, monitoring in place |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Licensing:** PHB is not freely redistributable | Cannot publicly host non-SRD content | `source` tagging + `SRD_ONLY`/`FULL` mode; decide distribution model early ([04](04-content-pipeline.md)) |
| **PDF extraction quality** (two columns, letter-spaced headings, tables) | Wrong/missing data | Use SRD JSON as structured base; PDF only for gaps; human review + count/consistency tests |
| **Spell/feature long tail** (≈360 spells, ≈40 subclasses) | Scope creep, never "done" | Tiered `automation` (full/assisted/manual); DM override always available; prioritise by popularity; track in coverage matrix |
| **Rules ambiguity** | Disputes at the table | Defer to the DM; "rule note" text with page citation; house-rule toggles |
| **Realtime on serverless hosts** | SSE/LISTEN unsupported | Host on long-lived Node, or abstract transport (`lib/realtime`) so Ably/Pusher can be swapped |
| **Concurrent actions / races** in combat | Corrupted state | Server-authoritative; optimistic concurrency via `encounter.version`; idempotent action ids |
| **Hidden-info leaks** | Spoils DM secrets | Server-side filtering; authz tests; no hidden data in client payloads |
| **Engine complexity** (effect stacking, duration tracking) | Subtle bugs | Pure engine, property tests, breakdown output for debugging |
| **Mobile UX of a dense sheet** | Poor table experience | Mobile-first sheet design in Phase 3; usability tests |

## Open questions

These change scope and should be answered before Phase 1 starts. Defaults are noted so work isn't blocked.

1. **Distribution model** — private/friends only, or public? *Default: private first; keep SRD_ONLY mode working.*
2. **Play style** — online with remote friends (default) or also in-person companion? *Default: both work; no voice/video built in.*
3. **Map/VTT depth** — theatre of the mind with optional simple grid (default) vs. full VTT.
4. **Dice** — server-rolled by default; allow manual entry of physical dice. *Default: both.*
5. **Optional rules** — which variants on by default (feats, multiclassing, encumbrance, variant human, flanking)? *Default: feats + multiclassing on, encumbrance off, flanking off.*
6. **Hosting target** — affects realtime transport. *Default: single Node host + managed Postgres.*
7. **Monsters beyond Appendix D** — use SRD monster list (≈330) so DMs can run encounters. *Default: yes.*
8. **Solo play / AI DM** — out of v1.
