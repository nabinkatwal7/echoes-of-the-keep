# Phase 5 — Combat

**Goal:** the complete Chapter 9 combat system, runnable at the table with automatic bookkeeping and DM override.
**Size:** L · **Depends on:** Phases 2, 4 · **Handbook:** Ch.9 p.189–198, App.A p.290, App.D
**Milestone:** M3 First Playable (with Phase 3–4)

## Features

### F5.1 Encounter setup (DM)
- Create encounter: add player characters, monsters from library (quantity, auto-numbered "Goblin 1–4"), custom NPCs; per-monster HP (average or rolled); hidden/revealed flags.
- Start combat → surprise assignment (Ch.9 p.189) → initiative.
- **Acceptance:** can add 10+ combatants quickly; hidden monsters invisible to players.

### F5.2 Initiative & turn order
- Roll initiative (Dex check + modifiers: Alert, advantage features, etc.); monsters can roll individually or grouped; manual override; tie-break rules; delay/reorder by DM; mid-combat joiners.
- Turn tracker: current turn, round counter, next-up, per-turn action economy reset (action, bonus action, movement, free object interaction), reaction resets at start of creature's own turn.
- **Acceptance:** surprised creatures can't act or react in round 1; order stable under reconnect.

### F5.3 Action economy & available actions (p.192)
- Per-turn menu: Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object, Improvise; bonus actions (class/feature-based, e.g. Cunning Action, off-hand attack, Second Wind); reactions (opportunity attack, Shield, Readied, Counterspell).
- Class/feature actions appear automatically from the sheet when available (Action Surge, Rage, Flurry of Blows, Channel Divinity, etc.).
- **Acceptance:** menu reflects what the creature can do now (e.g. no off-hand attack without a light weapon in each hand; Dash doubles remaining movement).

### F5.4 Attack resolution (p.193–196)
- Weapon/spell attacks, melee & ranged, finesse/thrown/reach/loading/ammunition/heavy/light/versatile, range & long-range disadvantage, ranged attack in melee disadvantage, unseen attackers, advantage/disadvantage sources auto-collected (conditions, prone at range/melee, Help, Dodge, flanking option, Reckless Attack, Sneak Attack eligibility), critical hits/misses (nat 20 / nat 1), cover (half +2, ¾ +5, total).
- Special melee: **grapple** (contested Athletics vs Athletics/Acrobatics, size limit), **shove** (prone/push), **two-weapon fighting** (bonus action, no mod to damage unless Style/negative).
- Attack breakdown shown ("Hit: 17 vs AC 15, longsword 1d8+3").
- **Acceptance:** each p.194–196 example reproduced; advantage sources each unit-tested.

### F5.5 Damage, healing & HP (p.196–197)
- Damage roll with crit doubling, types, resistance/vulnerability/immunity, temp HP first, healing, massive damage instant death, drop to 0 HP, unconscious & prone, death saving throws UI (auto-roll at the creature's turn start), stabilise (Medicine DC 10, *Spare the Dying*), knock-out option, monsters die at 0 unless DM says otherwise.
- **Acceptance:** acceptance-script step 5 death-save flow passes; instant-death threshold exact.

### F5.6 Conditions in play (App.A)
- Apply from actions/spells/monster abilities with duration (rounds, until end of target's/caster's next turn, save-ends each turn), source tracking, icons + tooltips; engine automatically alters rolls, speed, actions per condition. Exhaustion tracked 1–6.
- End-of-turn saving throw prompts for "save ends" effects.
- **Acceptance:** every condition's mechanical effect verified in tests; expiries fire at the right time.

### F5.7 Movement & position (p.190–192)
- Theatre-of-the-mind default with **range bands** (melee/near/far) plus optional **grid map** (5 ft squares): drag tokens, speed tracking, difficult terrain, crawling/prone (stand up costs half movement), squeezing, size & space, moving through allies/enemies, flying/swimming/climbing speeds, opportunity attack detection on leaving reach, Disengage exemption.
- Distance/range measurement, line of sight basics, cover suggestions from obstacles.
- **Acceptance:** leaving reach triggers an OA reaction prompt to the right player; grid is optional, not required.

### F5.8 Reactions & readied actions
- Ready: set trigger + response; prompt when DM marks trigger; reaction consumption; opportunity attack, Shield/Absorb Elements-type spell reactions (Phase 6).
- **Acceptance:** one reaction per round enforced; readied spell holds concentration (Phase 6).

### F5.9 Mounted & underwater combat (p.198)
- Mount/dismount (half movement), controlled vs. independent mounts, mounted attack restrictions; underwater: melee disadvantage unless piercing weapons, ranged auto-miss beyond normal range, fire resistance.
- **Acceptance:** toggles on encounter (`environment: underwater`, `mounted`) apply modifiers automatically.

### F5.10 Combat log & undo
- Event stream in human-readable text and structured form; DM undo/redo last event, edit any number; export log to the session journal.
- **Acceptance:** undo reverts HP, conditions, resources consistently.

### F5.11 Monster behaviours (DM-driven)
- One-click monster actions from stat block (multiattack runs all attacks, recharge abilities tracked 5–6, legendary actions and lair actions optional), saving-throw prompts for players, damage auto-applied on confirmation.
- **Acceptance:** Goblin, Wolf (pack tactics), Ogre, Young Dragon (breath recharge) run correctly.

### F5.12 Player combat UI
- Mobile-first turn panel: big action buttons, target picker, attack/spell result confirmation, "end turn". Own-turn highlight and notification; other players see public results only.
- **Acceptance:** a new player completes a full round without reading rules docs.

### F5.13 Encounter end & rewards
- End combat; clear temporary conditions/effects; XP prompt hand-off to Phase 7 (awarded split among party).

## Exit criteria

- All Ch.9 rules in coverage matrix are ✅ except spell-specific interactions (Phase 6).
- Acceptance-script steps 5 and 8 pass; a level 1–5 martial party can complete a multi-encounter session.
