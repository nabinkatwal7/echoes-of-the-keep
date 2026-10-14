# User guide

For people playing and running games. Developers: see [01-architecture.md](01-architecture.md).

## Contents

1. [Getting started](#getting-started)
2. [The rules wiki](#the-rules-wiki)
3. [Building a hero](#building-a-hero)
4. [Playing your hero](#playing-your-hero)
5. [Campaigns and the table](#campaigns-and-the-table)
6. [Combat](#combat)
7. [Spells in play](#spells-in-play)
8. [For the Dungeon Master](#for-the-dungeon-master)
9. [Solo play](#solo-play)
10. [Your account and your data](#your-account-and-your-data)
11. [Tips](#tips)

## Getting started

1. **Create an account** with a username (3 to 24 letters, numbers or underscores) and a password of at least 8 characters. There is no email, so **generate recovery codes** on the Account page and keep them: a code is the only way back in if you forget your password.
2. New to the game? Open **Learn** for a short introduction and a one-fight tutorial, or **Solo play** to try a game by yourself.
3. Everything in the wiki is readable without an account.

## The rules wiki

**The Tome** holds the rules chapters, classes and subclasses, races, backgrounds, feats, equipment, spells and creatures, with search (press the search button in the top bar) and filters on the spell list by level, class, ritual and concentration. The footer has options for higher contrast and a plain, highly legible typeface.

## Building a hero

Go to **Heroes** then **New hero**. The creator walks through:

1. **Race** (and subrace). Variant Human gives a feat and an extra skill.
2. **Class** (and subclass where the class chooses at level 1).
3. **Abilities**: standard array, point buy, or roll (the rolled values are checked so they cannot be swapped for better ones).
4. **Background** and **skills** from the class list.
5. **Equipment**: the starting kit, starting gold to spend, or nothing.
6. **Details**: name, alignment, personality.
7. **Review**: a plain summary and any rule problems.

Your own races, backgrounds, feats and items (**Homebrew**) appear in the creator for you only.

### The sheet

The sheet shows every number with where it came from (hover or tap a number). It has panels for hit points and death saves, spells and slots, class features and rests, companions (wild shape, familiars), inventory and money, and level-up. A **Rules audit** checks the hero against the book. You can **print or save as PDF**, **export JSON** to move a hero between installations, and add a **portrait** (a link to an image). On a phone a bar pinned to the bottom of the screen changes hit points quickly.

### Levelling up

When you have enough experience the Level up panel offers the next level: hit points (average), an Ability Score Improvement or a feat at the levels that give one, a subclass when the class asks for one, or a level in a different class (multiclassing, if the campaign allows it).

## Playing your hero

- **Rests.** A short rest lets you spend hit dice and recovers short-rest features and warlock slots. A long rest restores hit points, half your hit dice, spell slots and long-rest features. The sheet tracks all of it.
- **Spells.** Pick known or prepared spells for each class, then cast from the Spells panel. Slots are spent, concentration is tracked (casting another concentration spell ends the first), and rituals cost no slot. Sorcerers can trade slots and sorcery points.
- **Hit points.** Damage, healing and temporary hit points follow the book, including death saves at 0.
- **Dice.** At the table, type `/roll 2d6+3 sneak attack`. Rolls are made on the server so everyone sees the same result.

## Campaigns and the table

- A **Dungeon Master** creates a campaign from **Campaigns** and shares the **invite code**. Players join with the code and attach one of their heroes.
- **The Table** is the shared log: chat, rolls, emotes, and what the DM chooses to announce. Slash commands:

| Command | Does |
| --- | --- |
| `/roll 2d6+3 reason` (or `/r`) | A public roll |
| `/gmroll 1d20` | A secret roll only the DM sees (DM only) |
| `/me waves` | An emote |
| `/w dm message` | A whisper to the DM |
| `/w name message` | A whisper to another player (their username, or display name with no spaces) |

- The small dots show who has the table open. The DM can share a **call link** (Discord, Meet, Zoom, or a free Jitsi room); everyone then gets a **Join the call** button.
- The **Journal** holds your private notes, plus handouts (with an optional image) and session recaps the DM chooses to share.
- The **World** page shows the people, places and quests your party has discovered, the party stash (take items for your hero), and any random tables the DM lets you roll.
- When the DM shows a **scene**, its picture and description appear at the top of the table.

## Combat

Open **Combat** in the campaign. You see the initiative order, the battlefield grid, your actions and the log.

- **On your turn** pick your hero (click its square or its entry), then:
  - **Attack**: choose the weapon and target. Extra Attack, off-hand attacks, grapples and shoves are offered when they apply.
  - **Cast a spell**: see [Spells in play](#spells-in-play).
  - **Dash, Disengage, Dodge, Help, Hide, Search, Use an object, Ready**, and **Stand up** from prone.
  - **Move**: click an empty square. Movement is spent from your speed. Walls and creatures are walked around, and leaving an enemy's reach tells the table that an opportunity attack is possible (monsters take theirs automatically; you are told when you can take yours).
  - **End turn.** Reactions (opportunity attacks, *Shield*, *Counterspell*) can be used any time.
- Class features: Paladins can add **Divine Smite** to a melee hit; Rogues can add **Sneak Attack** when they have advantage or an ally next to the target.
- What you can see: your own side's exact hit points; foes as health words (Healthy, Wounded, Bloodied, Critical, Defeated). Armor class is shown only for your own hero. Hidden creatures and, when fog of war is on, foes out of your side's sight are not shown at all.
- The page updates the moment anything happens.

## Spells in play

The **Spells** panel in Combat lists what your hero can cast now, with a one-line summary, slots left, and a filter for *castable*. Choose a spell, a slot level if you want to upcast, then:

- **Targets**: tick who it affects (healing and buffs can include you and allies).
- **Areas**: press *Aim on map* and click a square. The cone, line, sphere or cube is worked out for you and affects everyone in it.
- **Summoning**: choose how many creatures and which (the spell's limits are enforced).

The app rolls the attack or the saving throws, applies damage and resistances, healing, conditions and lasting bonuses, tracks concentration (a damaged caster rolls the Constitution save) and logs it all. Spells that are not automated are cast (slot spent, concentration tracked) and the DM decides the effect; [spell-automation.md](spell-automation.md) lists which. A spell cast as a bonus action means only a cantrip can follow with your action.

## For the Dungeon Master

| Screen | What it does |
| --- | --- |
| **DM screen** | The whole party at a glance (hit points, armor class, speed, initiative, passive Perception, conditions), session start and end, the clock, travel and party rests, lights, calling for checks (group and secret), rewards (experience, milestone, inspiration), hazards, bringing someone back from the dead, an encounter difficulty builder, and a condition reference |
| **Combat** | Create an encounter, add the party and creatures (hidden ones too), set initiative, start, then run it: apply damage, healing and conditions, **Run monster turn** (the computer plays the active monster), draw **walls**, turn on **fog of war**, **Undo last**, **End and award XP** |
| **World** | NPCs (with attitudes and social checks), places and scenes with image backdrops, quests, the party stash and coin splitting, random tables, homebrew monsters and spells. Everything is hidden from players until you reveal it |
| **Journal** | Handouts and recaps to share, session summaries |
| **Campaign hub** | House rules (multiclassing, feats, flanking), the call link, export, the party |

Useful habits:

- Start a **session** and end it with a short summary: the next session opens with it.
- Use **Quick add** in Combat to run an initiative order without stat blocks.
- Override anything: set hit points, add or remove conditions, adjust the clock. Everything is logged.

## Solo play

No group? Open **Solo play**. Play a hero while the computer runs the story and your companions, or run the game while computer heroes play the party. Full details: [solo-play.md](solo-play.md).

## Your account and your data

The **Account** page lets you:

- change your password, and generate eight one-time **recovery codes** (shown once; a new set replaces the old);
- **download everything** you own as a JSON file (heroes, memberships, journal entries);
- **delete your account**: it is hidden for 14 days (signing in restores it) and then removed for good, along with your heroes, your journal entries, your solo games, and **the campaigns you run as DM**.

To get back in without your password, use **Recover** on the sign-in page with your username and one recovery code.

## Tips

- Hover over (or long-press) a number on the sheet to see how it is calculated.
- A hero can be in more than one campaign. The strictest house rules apply.
- Install the app from your browser's menu. The offline page lists sheets saved on that device.
- If something looks wrong, the table log says what the app did. The DM can always correct it.
