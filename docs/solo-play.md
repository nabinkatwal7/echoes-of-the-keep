# Solo play

Play without a group. A computer fills whichever seats you leave empty: either the Dungeon Master and the rest of the party, or the party alone.

- [Quick start](#quick-start)
- [The two seats](#the-two-seats)
- [A game from start to finish](#a-game-from-start-to-finish)
- [How the computer decides](#how-the-computer-decides)
- [How it is built](#how-it-is-built)
- [Extending it](#extending-it)
- [Testing](#testing)
- [Limits and known gaps](#limits-and-known-gaps)
- [Privacy, safety and cleanup](#privacy-safety-and-cleanup)
- [Troubleshooting](#troubleshooting)

## Quick start

1. Sign in and choose **Solo play** in the top menu (`/solo`).
2. Pick where you sit: **Player** or **Dungeon Master**.
3. Choose your hero (player only), how many computer heroes join you, their level (1 to 5) and an adventure (crypt, wilds, bandits or caves).
4. Press **Begin**. You land on the game's solo page (`/campaigns/<id>/solo`).
5. As a player, press the large button to move the story on. When a fight starts you are taken to the Combat page.

You can keep five solo games at once. A solo game is an ordinary campaign underneath, so the table, journal, world and combat pages all work in it.

## The two seats

| | **Player** | **Dungeon Master** |
| --- | --- | --- |
| You control | One hero | The world, the monsters, the story |
| The computer controls | The Dungeon Master and 1 to 4 companion heroes | 2 to 5 heroes |
| Who owns the campaign | A computer DM account (you are a player in it) | You |
| Story | A generated chapter, narrated for you | Yours to tell |
| Fights | Chosen by the computer to suit the party | You build them, or press *Easy / Medium / Hard fight* |
| Monster turns | Always played by the computer | Yours, unless you tick *Let the computer play the monsters too* |
| Hero choice | One of your own heroes (levels 1 to 5) or a ready-made one | Not needed |

Ready-made heroes: fighter, cleric, rogue, wizard, barbarian, paladin. Companions are picked so the party is balanced (a front-liner and a healer first, then a striker and a caster) and avoid copying the class you chose.

## A game from start to finish

### As a player

A chapter has seven scenes, shown as a progress strip on the solo page:

| # | Scene | What happens |
| --- | --- | --- |
| 1 | **The hook** | The computer DM narrates why the party is here. |
| 2 | **First fight** | An *easy* encounter for the party's level. |
| 3 | **Rest** | The party binds wounds (hit dice are spent for the hurt, up to two each), finds a little treasure and splits the coin. |
| 4 | **Second fight** | A *medium* encounter. |
| 5 | **Rest** | As above. |
| 6 | **The final chamber** | A *hard* boss fight: one strong creature with helpers. |
| 7 | **Epilogue** | A milestone is awarded, the computer heroes level up, and the chapter is marked complete. |

When a chapter is complete the button becomes **Begin the next chapter**: scenes restart, creatures scale to the party's average level, and the place changes.

**In a fight.** The Combat page shows the grid, the initiative order, your actions and the log. When it is the computer's turn a banner says *The computer is playing its turns…* and each computer turn plays out with a short pause, refreshing between turns so you can follow. It stops on your turn. *Play now* forces it to continue if it ever waits.

**Winning and losing.** When the last foe falls the encounter closes by itself: experience is awarded, the DM narrates, and the story advances. If every hero is down, the DM narrates the defeat, everyone wakes at full health and the same scene is offered again with an easier fight (one step easier for each setback, down to easy).

**Levelling.** After the epilogue the experience for the next level is set for everyone. Computer heroes level up on their own. Level your own hero on the character sheet whenever you like.

### As the Dungeon Master

Open the solo page and press **Easy**, **Medium** or **Hard fight**. A fight suited to the party is built and started. Computer heroes take their own turns on the Combat page; you play the monsters with the usual controls, including *Run monster turn* (the same planner the computer DM uses). Tick *Let the computer play the monsters too* to have every creature act automatically.

You also keep all the usual tools: DM screen, world (NPCs, places, quests, random tables, stash), journal, clock and travel, checks and rewards.

## How the computer decides

All of this is deterministic given the dice, runs on the server, and is covered by unit tests. The rules the computer follows are the same ones that apply to a person.

### Heroes (`lib/combat/heroAi.ts`)

In order, the first rule that applies is used:

1. **Heal.** If an ally (or the hero) is at 35 percent hit points or below, or down at 0, use a healing spell. A bonus-action spell such as *Healing Word* is preferred because the action stays free for the fight. If only a touch spell is available the hero walks to the ally first. One heal per turn.
2. **Bless on round one.** If *Bless* is available and at least one ally is within 30 feet, cast it on up to three creatures (it needs concentration, so it is skipped while already concentrating).
3. **Area spell.** For each foe's square, work out the spell's area (sphere, cube, cone or line, placed as the spell describes) and count foes and friends inside. Cast only when it catches **two or more foes and no friends**, never spending a slot more than one level above the spell's own.
4. **Best single target.** Score every castable damage spell and the weapon attack against each foe and take the best. A foe it can kill gets a large bonus and a hurt foe a smaller one. Leveled spells are discounted slightly so cantrips are used when they are nearly as good. Spells that need concentration are skipped while concentrating.
5. **Otherwise** make the weapon attack (every attack of Extra Attack), walking to the target first, or take the Dodge action if nobody can be reached.

Expected damage uses the real numbers: the hit chance for the attack bonus against the target's armor class, the average of the damage dice, and for saving-throw spells the target's own save bonus against the caster's DC (halved damage on a save where the spell says so).

### Monsters (`lib/combat/ai.ts`)

- Choose the foe it can hurt most (a killable one first, then wounded ones, then the nearest) and the attack with the best expected damage that can reach after moving.
- Walk the shortest route around walls and other creatures, stopping as soon as the target is in reach, and make every attack of its Multiattack, picking a new target if the first one falls.
- Take opportunity attacks when a hero leaves their reach.

### The computer Dungeon Master (`lib/solo/director.ts`)

- **Fights.** `engine/solo/encounters.ts` searches combinations of creatures from the theme's pool, with up to eight of one kind and a second kind alongside, and keeps those whose difficulty matches the target. Difficulty is the same rule of thumb used by the encounter builder on the DM screen (the handbook has no encounter tables). Creatures more than one challenge rating above the party's average level are excluded, and boss fights leave out very weak creatures so the boss is a real threat.
- **Narration.** `engine/solo/story.ts` writes original text from templates: a hook, an opening line for each fight naming the foes, victory and defeat lines, a rest with a treasure find, and an epilogue. Sentences are capitalised and creature names pluralised (Wolf becomes Wolves, Swarm of Ravens becomes Swarms of Ravens).
- **Treasure.** A few gold pieces per party level, split evenly, plus a flavour item.
- **Chatter.** Each computer hero has a few in-character lines for the start of a fight and for when an ally is in trouble.

## How it is built

```
engine/bots/blueprints.ts     six ready-made heroes: valid creation choices, spell preferences, chatter
engine/solo/encounters.ts     fight builder (pools per theme, difficulty search)
engine/solo/story.ts          narration templates, plurals, capitalisation
lib/actAs.ts                  runAs(): make requireUser() return a computer player for one call
lib/auth.ts                   requireUser()/getUser() honour runAs()
lib/solo/config.ts            settings.solo schema, readSolo(), controllerOf()
lib/solo/party.ts             create bot accounts, build and level heroes, choose spells
lib/solo/director.ts          adventure state, makeEncounter, advanceAdventure, settleEncounter, levelUpBots
lib/solo/actions.ts           server actions: startSoloGame, continueStory, generateEncounter, setAutoMonsters, deleteSoloGame
lib/solo/games.ts             the five-game cap and the list of a person's games
lib/solo/cleanup.ts           delete a person's solo games and their bots
lib/combat/heroAi.ts          pure planner for a hero's turn
lib/combat/ai.ts              pure planner for a monster's turn, damage maths, pathing
lib/combat/autoActions.ts     autoStep / autoRun: play the computer's turn through the normal actions
app/(app)/solo/               game list and the new-game form
app/(app)/campaigns/[id]/solo/ the solo page: story log, party, controls
```

### Data

No new content tables. A solo game is a normal `Campaign`:

| Where | What |
| --- | --- |
| `User.isBot` | True for computer players. They have `passwordHash = "!"`, which no password can match, and usernames like `bot_3fa91c07d2`. |
| `Campaign.settings.solo` | `{ humanId, mode: "player" | "dm", autoMonsters, botDmId, botIds, theme }`. Its presence is what makes a campaign solo. |
| `Campaign.world.solo` | The adventure: `{ chapter, sceneIndex, title, place, encounterId, setbacks, complete }`. |
| `Campaign.dmId` | The computer DM's account in player mode, you in DM mode. |
| `CampaignMember` / `CampaignCharacter` | The human, every bot, and all heroes, exactly as in any campaign. |
| `CampaignEvent` | Narration is a `system` event with `narration: true`; chatter is a `chat` event with `bot: true`. |

### Who controls what

`controllerOf()` decides, for the creature whose turn it is:

| Creature | Player mode | DM mode |
| --- | --- | --- |
| A hero you own | You | You |
| A hero a bot owns | That bot | That bot |
| A monster, summon or other non-hero | The computer DM | You, or the computer DM if *auto monsters* is on |

### Acting as a bot

The computer does not call hidden shortcuts. It performs each move through the same server actions a person would (`moveCombatant`, `attack`, `castInCombat`, `endTurn`, `runMonsterTurn`, `endEncounter`), so every rule, range check, slot spend and permission check applies. To do that, `runAs(bot, fn)` stores the bot in an `AsyncLocalStorage`, and `requireUser()` returns it for the duration of `fn`. `runAs` is a plain function in `lib/actAs.ts`, not a server action, and is only called after the caller has been checked to be the human of that solo game. See [ADR 0004](adr/0004-bots-act-as-users.md).

### One turn, step by step

1. The Combat page asks the server for the encounter view. If the active creature belongs to the computer, `aiTurn` is true.
2. The client calls `autoStep(encounterId)`.
3. `autoStep` checks the caller is the human of a solo game, then calls `settleEncounter` in case the fight was already won or lost.
4. It looks up who controls the active creature, switches to that account with `runAs`, and either runs the monster planner (`runMonsterTurn`) or the hero planner (`planHeroTurn`, then each step through the normal actions).
5. It ends the turn, calls `settleEncounter` again, and returns whether it is now a person's turn (`waiting: "human"`) or the fight is over (`waiting: "done"`).
6. The client refreshes, waits a moment and repeats until it is the person's turn.

`autoRun` loops `autoStep` up to 40 times in one request and is used by the *Play the computer's turns* button.

## Extending it

### Add a ready-made hero

Add an entry to `BLUEPRINTS` in `engine/bots/blueprints.ts`: class, race (and subrace), background, standard-array scores, class skills (not already granted by the background), the subclass chosen at the level the class asks for, the ability that takes Ability Score Improvements, names, spell preferences and chatter. `tests/botParty.db.test.ts` builds every blueprint at levels 1, 3 and 5 through the real creation and level-up rules, so a bad choice fails there. Prefer races and backgrounds that need no extra choices.

### Add or change an adventure theme

1. Add the creature list to `THEME_POOLS` in `engine/solo/encounters.ts` (indexes that are missing from the database are skipped).
2. Add places and hooks for the theme to `PLACES` and `HOOKS` in `engine/solo/story.ts`.
3. Add the theme key to `THEMES` in `lib/solo/config.ts` and to the list in `app/(app)/solo/NewSoloForm.tsx`.

`engine/solo/story.test.ts` renders every scene for every theme and fails on any unfilled placeholder.

### Teach the computer a new spell

Spells the planner can use come from `lib/combat/spellRules.ts` (the automation catalogue) and `engine/spells/effects.ts` (the text parser). If a spell is automated there, the hero planner can score it. Add healing, damage, buff or summon handling in those files and the planner picks it up. See [spell-automation.md](spell-automation.md) for what is covered.

### Change how heroes or monsters choose

Edit `planHeroTurn` or `planMonsterTurn`. They are pure functions (positions, hit points and options in, a list of steps out), so add a case to `lib/combat/heroAi.test.ts` or `lib/combat/ai.test.ts` first.

## Testing

| Layer | File | What it proves |
| --- | --- | --- |
| Unit | `lib/combat/ai.test.ts` | Damage maths, hit chance, target choice, walking around walls |
| Unit | `lib/combat/heroAi.test.ts` | Healing first, bonus-action heals, Fireball only when no friend is caught, cantrips when slots run out, dodging when boxed in |
| Unit | `lib/solo/config.test.ts` | Settings parsing and who controls which creature |
| Unit | `engine/solo/encounters.test.ts` | Fights land on the target difficulty, scale with the party, avoid over-powered creatures |
| Unit | `engine/solo/story.test.ts` | No unfilled placeholders in any theme, plurals, capitalisation |
| Database | `tests/botParty.db.test.ts` | Every blueprint builds at levels 1, 3, 5 under the real rules; bot accounts cannot sign in |
| Database | `tests/solo.db.test.ts` | A whole chapter in player mode, the story cannot be pushed during a fight, only the player can run it, DM mode with generated fights and auto monsters, the game cap, deleting a game, account deletion removes solo games |
| Browser | `e2e/a11y.spec.ts` | Creating a game through the real screens, reading the story, watching the computer act in a fight, and an axe accessibility scan of every page involved |

Run the database tests with `pnpm test:db`. To read a whole simulated game, set `DEBUG_SOLO` to a file path when running `tests/solo.db.test.ts`; the full event log is written there.

## Limits and known gaps

- Chapters are short and built from templates. There is no branching plot, no social scenes and no dungeon map beyond the combat grid.
- Computer heroes use weapons, healing, damage spells, *Bless* and similar. They do not use class features (Rage, Sneak Attack, Divine Smite, Metamagic, Channel Divinity), utility spells, or reactions such as *Shield*.
- Computer monsters make weapon attacks and Multiattack. They do not cast spells, use legendary actions or recharge abilities, or use special movement.
- The human's own turn is never played for them.
- Levels are limited to 1 to 5 at the start; chapters can take heroes higher.
- The adventure state lives in one JSON field; nothing handles two people at once in a solo game (only the human can drive it).

## Privacy, safety and cleanup

- Bot accounts have no password and cannot sign in. They are not shown as people to other users because solo games have only one human.
- Only the human of a solo game can drive it. `autoStep`, `autoRun`, `continueStory` and the other solo actions all verify this on the server.
- Deleting a game (solo page, *Delete this game*) removes the campaign and its bot accounts. Deleting an account, or the 14-day purge, removes all of that person's solo games first (`lib/solo/cleanup.ts`).
- A failed game creation removes any bot accounts it had already made.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The computer never plays | Open the Combat page for the game. The banner says whose turn it is. *Play now* retries; *Play the computer's turns* on the solo page runs up to 40 turns at once. |
| "A fight is still under way" | Finish or abandon the current encounter. In player mode it ends by itself when one side is down. |
| "No suitable foes could be found" | The theme's creatures are missing from the database (a SRD-only seed removes some). Re-seed, or add creatures to the pool. |
| "You can keep five solo games" | Delete one from its solo page. |
| A hero does nothing but dodge | It could not reach anyone (walled in) or had nothing to cast. Check the grid for walls. |
