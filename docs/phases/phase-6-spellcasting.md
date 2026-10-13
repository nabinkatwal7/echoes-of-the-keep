# Phase 6 — Spellcasting

**Goal:** every PHB spell can be cast in play, with correct slot spending, targeting, saves/attacks, damage/healing, conditions, duration and concentration.
**Size:** XL · **Depends on:** Phases 3, 5 · **Handbook:** Ch.10 p.201–206, Ch.11 p.207–289

Spells are the long tail, so work is **tiered** by automation level ([04](../04-content-pipeline.md#encoding-mechanics-effects)):
- **full** – engine resolves everything.
- **assisted** – engine does the math, DM confirms/places effects.
- **manual** – text card + log entry; DM adjudicates.

## Features

### F6.1 Casting flow (Ch.10)
- Cast from sheet or turn panel: pick spell → slot level (upcast) → targets/area → components check (V/S/M, free hand, focus, costly material consumed) → casting time (action / bonus / reaction / 1 min+ / ritual) → resolve → log.
- Enforce: one slot-spell per turn with a bonus-action spell (cantrip-only action allowed); casting-time > 1 action prevents other actions; reaction spells trigger prompts.
- **Acceptance:** illegal casts blocked with the rule explained (e.g. bonus-action spell then slot-spell action).

### F6.2 Slots, known/prepared, rituals
- Slot spending/recovery integrated with Phase 3 tracker; Pact Magic; ritual casting without slot (prepared Clerics/Druids/Wizards-from-book; not Sorcerer/Warlock unless feature); Sorcery Point conversion; Arcane Recovery on short rest; Spell Mastery/Signature Spells.
- **Acceptance:** each caster class' resource rules tested.

### F6.3 Targeting & areas of effect
- Single/multiple targets, self, touch, range check, sight requirement; AoE shapes (cone, cube, cylinder, line, sphere, emanation) with origin points; grid-based template picker and theatre-of-mind "pick affected creatures" list; cover bonus to Dex saves; spreads around corners where applicable.
- **Acceptance:** Fireball radius 20 ft and Cone of Cold 60 ft correctly select grid creatures; DM can adjust the list.

### F6.4 Spell attacks & saving throws
- Spell attack bonus, spell save DC (8 + prof + ability), per-target saves (auto-rolled for monsters, prompted for players), half damage on success, evasion/Magic Resistance interactions, advantage/disadvantage from effects.
- **Acceptance:** *Fireball*, *Burning Hands*, *Guiding Bolt*, *Hold Person* flows verified.

### F6.5 Damage, healing & scaling
- Damage dice per slot level and by character level for cantrips (5/11/17), multiple darts/rays (*Magic Missile*, *Scorching Ray*, *Eldritch Blast* beams + Agonizing Blast), healing spells (*Cure Wounds*, *Healing Word*, *Mass Cure Wounds*, *Heal*), temp HP spells.
- **Acceptance:** scaling table tests for the top 40 spells.

### F6.6 Concentration
- Track one concentration spell; automatic Con save prompt on damage (DC max(10, damage/2)), on incapacitation/death auto-break; casting another concentration spell ends the first; visible indicator; ends effects on its targets.
- **Acceptance:** break → all linked effects (conditions, summoned creatures, buffs) removed.

### F6.7 Duration & effect tracking
- Timed effects (rounds/minutes/hours) with automatic expiry tied to combat rounds and the in-game clock; save-ends effects; buffs (*Bless*, *Haste*, *Mage Armor*, *Shield of Faith*) applied as engine effects; ends on dismissal.
- **Acceptance:** *Haste* adds speed/AC/Dex-save/extra action and applies lethargy when it ends.

### F6.8 Summons & creatures
- *Find Familiar*, *Conjure Animals*, *Conjure Woodland Beings*, *Animate Dead*, *Polymorph*, *Wild Shape*, *Simulacrum*-style: spawn stat blocks from Appendix D/SRD as controllable combatants with correct initiative placement, HP, and dismissal; polymorph HP/reversion rules.
- **Acceptance:** Wild Shape beast forms by CR limit; polymorph damage overflow to original form.

### F6.9 Utility, exploration & social spells
- Detection, divination, illusions, teleportation, movement, light/darkness, communication, summoning-less utility: modelled as text cards with structured metadata (duration, range, effect summary), applying light/vision state or buffs where straightforward, else logged for DM adjudication.
- **Acceptance:** *Light*, *Darkness*, *Misty Step*, *Knock*, *Detect Magic*, *Speak with Animals* produce usable table output.

### F6.10 Reaction & trigger spells
- *Shield*, *Absorb Elements*, *Counterspell* (incl. ability check for higher levels), *Hellish Rebuke*, *Feather Fall*: prompts appear to eligible players with a timer, DM can resolve.
- **Acceptance:** Shield retroactively turns a hit into a miss with proper AC recompute.

### F6.11 Class spellcasting features
- Metamagic options (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned), Eldritch Invocations affecting spells, Divine Smite, Wizard School features (Evocation Sculpt Spells, Abjuration Arcane Ward, etc.), Cleric domain spells & Channel Divinity, Druid Circle spells, Paladin oath spells, Warlock Pact Boon, Bard Magical Secrets, Ranger spells.
- **Acceptance:** automation tier recorded for each; assisted at minimum.

### F6.12 Spell browser in play
- Filterable spell list by class/level/school/concentration/ritual on the sheet; "castable now" filter; spell cards with full text and upcast table; favourites/spellbook UI.

### F6.13 Spell coverage plan & report
- Coverage dashboard from `Spell.automation`: target ≥ 85% full/assisted of all PHB spells, 100% of combat-relevant ones; remaining are manual with text cards. Prioritisation by class popularity: Wizard/Cleric/Sorcerer/Druid/Bard/Warlock/Paladin/Ranger.

## Exit criteria

- Every spell castable (at least manual card) and every cantrip/1st–5th level combat spell at least assisted; coverage dashboard green against targets.
- Concentration and duration logic leak-free under property tests; Acceptance-script step 5 spell portions pass.
