# 03 — Rules Coverage Matrix

Chapter-by-chapter map of the *Player's Handbook* to features and phases. Page numbers are the book's printed pages. Status legend: ⬜ not started · 🟨 partial · ✅ done · ➖ reference only (lore/text, no automation).

Use this file as the living checklist; update status as phases land. "Playable" is reached when every ⬜/🟨 row in Parts 1–3 + Appendices A and D is ✅ or has an explicit deferral note.

## Part 1 — Creating a Character

| Handbook | Feature | Phase |
|---|---|---|
| Ch.1 Step-by-Step Characters p.11 | Guided creator wizard: race → class → abilities → description → equipment → finish | 3 |
| Ch.1 Ability score generation | Standard array, point buy (27 pts), 4d6-drop-lowest | 2, 3 |
| Ch.1 Beyond 1st Level p.15 | Level up flow, XP thresholds, HP gain (roll/average), proficiency bonus table | 2, 3 |
| Ch.2 Races p.17 | Dwarf (Hill, Mountain) · Elf (High, Wood, Dark/Drow) · Halfling (Lightfoot, Stout) · Human (standard + variant) · Dragonborn (10 ancestries, breath weapon) · Gnome (Forest, Rock) · Half-Elf · Half-Orc · Tiefling. ASI, speed, size, darkvision, languages, traits | 1 content, 3 creator |
| Ch.3 Classes p.45 | Barbarian · Bard · Cleric · Druid · Fighter · Monk · Paladin · Ranger · Rogue · Sorcerer · Warlock · Wizard: hit die, proficiencies, equipment choices, level 1–20 feature tables | 1 content, 2/3 engine |
| Ch.3 Subclasses (archetypes, domains, circles, oaths, patrons, traditions, schools) | All PHB subclasses (≈40) with features by level | 1, 3 |
| Ch.3 Class resources | Rage, Bardic Inspiration, Channel Divinity, Wild Shape, Second Wind/Action Surge, Ki, Lay on Hands, Divine Smite, Favoured Enemy, Sneak Attack, Sorcery Points/Metamagic, Pact Magic/Invocations, Arcane Recovery, etc. | 3 (tracking), 5–6 (in-play effects) |
| Ch.4 Personality & Background p.121 | Name, details, alignment (9), inspiration, 13 backgrounds (Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin) with traits/ideals/bonds/flaws tables and features | 1, 3 |
| Ch.5 Equipment p.143 | Starting equipment/wealth, armor & shields (AC, Str req., stealth), weapons (properties, versatile, finesse, reach, thrown…), adventuring gear, packs, tools, mounts & vehicles, trade goods, expenses/lifestyle, trinkets (d100) | 1, 3 |
| Ch.5 Currency | cp/sp/ep/gp/pp conversion, purchases | 3 |
| Ch.6 Customization p.163 | Multiclassing: prerequisites, proficiencies gained, combined spell slot table, Extra Attack stacking | 2, 3 |
| Ch.6 Feats p.165 | All 42 PHB feats with prerequisites and effects | 1, 3 |

## Part 2 — Playing the Game

| Handbook | Feature | Phase |
|---|---|---|
| Ch.7 Using Ability Scores p.173 | Modifiers, advantage/disadvantage (no stacking), proficiency bonus, expertise, ability checks, contests, passive checks, working together/Help, group checks, 18 skills, saving throws, DC guidance | 2 |
| Ch.8 Adventuring p.181 | Time (rounds/minutes/days) · Movement: travel pace & distance, difficult terrain, special movement (climb/swim/jump rules, long/high jump) · Environment: falling, suffocating, vision & light (darkvision, bright/dim/darkness, heavily obscured), food & water, interacting with objects · Social interaction (attitudes, Insight/Persuasion/Deception/Intimidation) · Resting: short rest (hit dice), long rest (HP, half hit dice, slot reset, resource recharge) · Between adventures (downtime activities) | 7 (rest rules in 3/6) |
| Ch.9 Combat p.189 | Order of combat & surprise · initiative · turns · movement & position (difficult terrain, crawling/prone, flying, creature size & space, squeezing) · actions (Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object, Improvise) · bonus actions & reactions · opportunity attacks · making an attack (attack roll, modifiers, crit/nat 1, unseen attackers, ranged in melee, long range, melee attack options: grapple, shove, two-weapon fighting; cover) · damage & healing (damage rolls, crits, resistance/vulnerability/immunity, HP, instant death, death saves, stabilising, knocking out, monsters/NPCs, temp HP) · mounted combat · underwater combat | 5 |

## Part 3 — Rules of Magic

| Handbook | Feature | Phase |
|---|---|---|
| Ch.10 Spellcasting p.201 | Spell slots & levels, cantrips, rituals, casting time (action/bonus/reaction/long), range, components (V/S/M, focus, costs), duration, concentration (and breaking it), targets, areas of effect (cone/cube/cylinder/line/sphere) with origin and cover, saving throws & attack rolls for spells, combining effects, bonus-action-spell limit | 6 |
| Ch.11 Spell lists p.207 | Per-class lists, cantrips through 9th level; prepared vs. known casters; spellbook for wizards; ritual casters | 1, 3, 6 |
| Ch.11 Spell descriptions p.211–289 | ~360 spells (A–Z): mechanical data in `Spell.mechanics`; a handler for each that needs special logic; text fallback + DM adjudication for narrative-only spells | 1 (content), 6 (play) |

## Appendices

| Handbook | Feature | Phase |
|---|---|---|
| App.A Conditions p.290 | Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious — as engine effects with automatic attack-roll/save/speed consequences | 2 (model), 5 (apply) |
| App.B Gods of the Multiverse p.293 | Pantheon reference; deity selection for Clerics/Paladins | 1 |
| App.C Planes of Existence p.300 | Lore reference (wiki) | 1 ➖ |
| App.D Creature Statistics p.304 | Handbook creatures (animals/companions: used by Find Familiar, Conjure Animals, Beast Master, Wild Shape, polymorph) + stat-block rendering | 1, 6, 7 |
| App.E Inspirational Reading p.312 | Wiki "Further reading" page | 1 ➖ |
| Character Sheet p.317 | On-screen sheet matching the official layout; printable/PDF export | 3, 8 |

## Cross-cutting rules that must not be missed

These are easy to forget and break "playable":

- Advantage/disadvantage cancel to a straight roll regardless of count.
- Proficiency bonus is applied once; Expertise doubles it; Jack of All Trades/half-proficiency rounding.
- Heavy armor Strength requirement and Stealth disadvantage; AC formulas (Unarmored Defense for Barbarian/Monk, Mage Armor, Draconic resilience).
- Two-weapon fighting: bonus-action off-hand attack, no ability modifier to damage unless negative.
- Critical hits double dice only; Rogue Sneak Attack and Divine Smite dice double too.
- Concentration: only one at a time; Con save DC = max(10, half damage taken).
- Spell slot economy across multiclassing; Warlock Pact Magic slots are separate and recover on short rest.
- Death saves: three successes/failures, nat 20 = 1 HP, nat 1 = two failures; damage at 0 HP = failure(s); instant death threshold.
- Exhaustion cumulative effects; long rest reduces exhaustion by 1.
- Resting: hit dice recovery is half of max (min 1) on a long rest; one long rest per 24 h.
- Surprise, readied actions, and reaction timing (resets at start of own turn).
- Encumbrance (variant rule) as an optional toggle.
