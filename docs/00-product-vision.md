# 00 — Product Vision

## Summary

A browser-based companion and light virtual tabletop for D&D 5e. It enforces the rules so the table can focus on the story: it computes character stats, tracks resources, runs initiative and combat, resolves spells, and keeps campaign state in sync for everyone.

## Users

| Persona | Needs |
|---|---|
| **New player** | Guided character creation (handbook Ch.1 "Step-by-Step Characters"), plain-language rules lookup, no arithmetic mistakes |
| **Experienced player** | Fast character sheet, automatic modifiers, spell/slot tracking, quick rolls |
| **Dungeon Master** | Run a campaign: encounters, monsters, initiative, NPC notes, rewards, rests, level-ups |
| **Solo/group lurker** | Browse rules and content (the wiki) without an account |

## What "completely playable" means

A group of 1 DM + 1–6 players can, using only this app (plus voice chat):

1. Each build a legal level-1 character from any PHB race/class/background, with all choices and derived stats correct.
2. Join one campaign and see a shared, real-time table.
3. Explore (travel, light, hazards, skill checks, social interaction), fight (full Ch.9), cast any PHB spell, rest, loot, and gain XP.
4. Level characters up to **level 20**, including subclasses, ASI/feats, multiclassing, and spell progression.
5. Resume the same campaign next week with all state intact.

The concrete pass/fail test is the acceptance script in [05-testing-and-quality.md](05-testing-and-quality.md).

## Product principles

- **Rules are data + a pure engine.** Static content lives in the DB; mechanics live in a side-effect-free TypeScript package with exhaustive unit tests. UI never computes rules inline.
- **The DM is a human.** The app is a referee's assistant, not an AI game master. The DM can always override any automated result.
- **Automate the arithmetic, not the judgement.** Apply modifiers, advantage, resistances, slots, conditions; let the DM adjudicate ambiguous cases (handbook Ch.7–8 stress DM rulings).
- **Table-first UX.** Common actions ≤2 taps; usable on a phone at the table.
- **Transparent.** Every automated number can show "why" (e.g. `+7 = +4 DEX +3 proficiency`).

## Scope

In scope: everything in the Player's Handbook rules (Parts 1–3, Appendices A–D): 9 races + subraces, 12 classes + all PHB subclasses, 13 backgrounds, equipment, feats, multiclassing, ability/skill/save rules, exploration, combat, spellcasting and every PHB spell, conditions, the planes/gods as lore reference, and the creature stat blocks in Appendix D. Monsters beyond Appendix D come from the SRD (see [04-content-pipeline.md](04-content-pipeline.md)) so a DM has enough to run encounters.

## Non-goals (v1)

- AI-run DM / AI narration.
- Full VTT (dynamic lighting, fog of war, token animation). A simple optional grid map only.
- Voice/video chat (use Discord etc.).
- Content outside the PHB + SRD monsters (Xanathar's, Tasha's, published adventures). The data model leaves room for additional sources.
- Native mobile apps (responsive web only).
- Marketplace / monetisation.

## Success metrics

- A full level 1→5 campaign arc is completed in internal playtests with no rules-blocking bugs.
- 100% of handbook checklist items in [03-rules-coverage.md](03-rules-coverage.md) are ✅ or explicitly deferred with a reason.
- Character creation (known build) in under 5 minutes; combat round resolved in under 1 minute at a 4-player table.
- Zero lost state on reconnect/refresh mid-session.
