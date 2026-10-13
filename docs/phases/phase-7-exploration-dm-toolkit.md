# Phase 7 — Exploration & DM Toolkit

**Goal:** everything outside combat (Chapter 8) plus the tools a DM needs to prepare and run a full campaign through level 20.
**Size:** M–L · **Depends on:** Phases 4–6 · **Handbook:** Ch.7 (DCs), Ch.8 p.181–187, App.D, XP tables
**Milestone:** M4 Fully Playable

## Features

### F7.1 In-game time
- Campaign clock (minutes → days), advance by DM or by activity (travel, rest); round/minute/hour/day display; effect durations tie to the clock.
- **Acceptance:** *Mage Armor* (8 h) expires correctly after a long rest + travel.

### F7.2 Travel & movement (Ch.8)
- Party travel: pace (slow/normal/fast) with Stealth/Perception effects, distance per hour/day, terrain modifiers, forced march exhaustion, navigation (Survival), foraging, mounts & vehicles speeds, special movement rules (climb, swim, jump, high/long jump) with the jump calculator.
- **Acceptance:** 24-mile day computed correctly for a party with a mount; forced march Con save triggers exhaustion.

### F7.3 Environment & hazards
- Falling (1d6/10 ft up to 20d6), suffocation/drowning, starvation & thirst (food/water tracker), extreme temperature (variant in other books; omitted), light & vision (bright/dim/dark, darkvision, light sources with durations: torch 1 h, lantern 6 h/pint, candles), objects (AC/HP by material & size, breaking), traps/hazards as DM-placed templates (DC, damage, trigger).
- **Acceptance:** light sources burn down in clock time; darkness imposes the correct Perception/attack effects.

### F7.4 Skill-challenge and check helpers
- DM quick-call: choose skill, DC (easy 10 … nearly impossible 30), who rolls (individual, group, passive, contest), Help action; auto-resolve passives (Perception, Investigation, Insight); results logged; "hidden" calls.
- **Acceptance:** group check succeeds if at least half succeed; contested checks resolve ties correctly.

### F7.5 Social interaction (Ch.8 p.185)
- NPC attitude tracker (friendly / indifferent / hostile), notes about ideals/bonds/flaws, Insight/Persuasion/Deception/Intimidation roll prompts with suggested DCs per attitude, roleplay reminders.
- **Acceptance:** attitude changes recorded; NPC cards show personality tables.

### F7.6 Resting & recovery (Ch.8 p.186)
- Short rest (≥ 1 h): spend hit dice, short-rest resources; long rest (≥ 8 h, with ≤ 2 h light activity, once per 24 h): HP, half hit dice, slots, resources, exhaustion −1; interruption handling; party-wide rest action from DM screen with per-player confirmation.
- **Acceptance:** acceptance-script step 6; interrupted long rest requires restart after 1 h of exertion.

### F7.7 Between adventures (downtime)
- Downtime activities (crafting, practising a profession, recuperating, researching, training), lifestyle expenses, cost tracking, results log.
- **Acceptance:** lifestyle costs deducted per day; crafting progress tracked at 5 gp/day-equivalent.

### F7.8 Monster library & encounter builder
- Searchable monsters (SRD + Appendix D) by CR/type/environment; add to encounter with one click.
- Encounter difficulty by XP thresholds per character level (Easy/Medium/Hard/Deadly) with multiplier by monster count (from the SRD's encounter-building guidance) and party size.
- Random encounter tables by environment (optional).
- **Acceptance:** thresholds correct for parties of 3–6 at levels 1–20.

### F7.9 XP, milestones & levelling
- Award XP for defeated monsters (CR→XP) split among party; milestone levelling toggle; automatic level-up prompts to players ([F3.5](phase-3-character-creator.md)); inspiration award/consume (Ch.4 p.125).
- **Acceptance:** XP thresholds trigger the level-up prompt; milestone leveling works without XP.

### F7.10 Treasure & items
- Gold/silver/etc. distribution, split tool; item awards from the equipment list; DM-created custom items/magic items (name, description, effects as simple modifiers, attunement); party stash; selling/buying with currency conversion.
- **Acceptance:** awarding 150 gp across 4 players updates sheets and the log; custom +1 weapon adds to attack/damage.

### F7.11 NPCs, locations, quests
- DM databases for NPCs (from monster stat blocks or custom), locations (nested), quests (status, rewards), factions; reveal toggles to players; linkable inside notes and chat.
- **Acceptance:** revealed vs hidden entries appear correctly per role.

### F7.12 Maps & scenes
- Scene images with optional grid overlay and tokens (from Phase 5); scene switcher; player pings; DM reveal of whole map (no fog of war in v1). Upload size/type limits and moderation-friendly storage.
- **Acceptance:** scene change syncs instantly; grid scale configurable.

### F7.13 Death, resurrection & recovery
- Raise dead/resurrection/revivify rules, death saves persisted across sessions, lasting wounds not included (DMG).
- **Acceptance:** revivify within 1 minute restores 1 HP; diamonds cost deducted when automated.

### F7.14 Playable-to-20 content checks
- Level 5/10/15/20 sample parties run through scripted scenarios (high-level spells: *Wish*, *Time Stop*, *Meteor Swarm*; 9th-level slot handling; epic class features) using the engine in CI.
- **Acceptance:** acceptance-script step 9 passes.

## Exit criteria

- Every rule in Ch.7–10 is represented; coverage matrix Parts 1–3 ✅ (or deferred with rationale).
- The full acceptance script passes in CI.
