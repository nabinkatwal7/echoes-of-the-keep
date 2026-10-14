# Changelog

What was built, grouped by area, newest first. The project has no version numbers yet; entries are dated by when the work landed.

## 2026-10-14

### Echoes of the Keep: new name, light and dark themes, pixel art
- **Renamed to Echoes of the Keep.** The product name is now Echoes of the Keep; "5th Edition" and the not-affiliated notices are unchanged.
- **Light and dark themes.** The header and footer have an Auto / Light / Dark switch (Auto follows the device). The choice is remembered, applied before the page paints, and every colour is a theme token. Both themes pass the axe scan; high contrast still overrides either.
- **Pixel art.** Every class has a pixel hero, creatures get one of 16 shapes by type, and five night scenes dress the landing page and solo games. They are drawn in code (`engine/pixel/`) as crisp SVG: no image files. Heroes without a portrait photo use their class sprite on the heroes list, sheet, campaign and solo pages; the initiative list and battle map show tokens.
- **Layout fixes.** The header fits from 320 px to wide screens (full menu from 1280 px), the Combat page no longer repeats the wall and fog buttons or overflows on phones.

### Solo play
- **Play alone.** Choose a seat on `/solo`: a player with a computer Dungeon Master and companions, or the Dungeon Master with computer heroes.
- A generated chapter of seven scenes in four themes (crypt, wilds, bandits, caves), narrated by the computer DM, with fights chosen to suit the party, rests, treasure and levelling.
- Computer heroes heal, bless, cast area spells, and pick the best spell or weapon attack. Computer monsters pick targets, walk around walls and use Multiattack.
- Computer players are real accounts with no password and act through the normal actions ([ADR 0004](adr/0004-bots-act-as-users.md)). Deleting a game or an account removes them.
- The Combat page plays the computer's turns one at a time, in view. See [solo-play.md](solo-play.md).

### Combat
- Run a monster's turn with one button; monsters take opportunity attacks on their own; combat updates arrive instantly over the event stream.
- Walls, fog of war and line of sight on the battle map; walls block movement, sight, ranged attacks and spells.
- Quick add for running an initiative order without stat blocks.
- Fixed: flanking checked the wrong side of the target.

### Spells
- Temporary hit points, hit point pools (Sleep, Color Spray), flat healing, Mage Armor, Barkskin, Resistance, Blur, Bane, Faerie Fire, Guiding Bolt, Aid.
- Summoning with each spell's limits (Conjure Animals, Conjure Woodland Beings, Conjure Minor Elementals, Conjure Elemental, Conjure Fey, Conjure Celestial, Animate Dead); summons vanish when concentration ends.
- Automation coverage rose from 32 to 38 percent.

### Monsters
- `pnpm monsters:audit`. The stat block parser now reads "Melee or Ranged" and spell attacks and uses the fastest listed speed. 330 of 335 creatures run cleanly.

### Campaign tools
- Random tables (weighted, with four starter tables, shareable with players, secret rolls).
- Handouts can carry an image. A call link (Discord, Meet, Zoom or a free Jitsi room) with a Join button.

### Characters
- Portraits, a print layout for A4, and a pinned hit point bar on phones.

### Quality and operations
- Fixed accessibility problems found by axe: map roles, labels on the sheet, the combat log markup.
- Browser checks for reflow at 320 and 640 px, text spacing, forced colors, keyboard, the character sheet and the solo flow.
- SRD-only seeding (`pnpm db:seed:srd`) that keeps 319 spells and removes the rest.
- `pnpm purge:accounts` removes accounts deleted more than 14 days ago.
- Fixed: half and third casters had the wrong spell slots when they were a character's only spellcasting class.
- Documentation rewritten to match the build.

## 2026-10-13

### Foundation
- Next.js app with Prisma and PostgreSQL, username and password sign-in, a design system, CI.
- Content pipeline: the handbook PDF is extracted, validated and seeded (spells, classes, races, backgrounds, feats, equipment, creatures, rules chapters).
- The rules wiki with search.

### Rules engine
- Pure, tested modules for dice, abilities, characters, progression, rests, conditions, damage, exploration, economy, experience, spells, effects, companions and combat.

### Heroes
- Guided creator, sheet with explained numbers, level-up with subclasses, feats and multiclassing, spells and rests, class resources, companions, inventory and money, import and export, rules audit, print.

### Campaigns and the table
- Invites and roles, the live table with chat, secret rolls, whispers and presence, the event stream with replay, hidden-information filtering, live sheet edits with an audit trail, journal, handouts and sessions.

### Combat
- Encounters with initiative, the action economy, attacks, grapple and shove, conditions with timers, death saves, grid movement and opportunity attacks, ready actions, mounted and underwater combat, recharge and legendary actions, undo.
- Spells in combat: attacks, saves, scaling, areas, concentration, Counterspell, Shield, Divine Smite, Sneak Attack, Flexible Casting and metamagic.

### Dungeon Master toolkit
- DM screen, the clock and light, travel, party rests, check helpers, social attitudes, downtime, resurrection, rewards, NPCs, places and scenes, quests, stash, encounter builder, homebrew monsters and spells.

### Polish and launch
- Learn page and a one-fight tutorial, installable app with an offline page, high-contrast and plain-type options, security headers, health and metrics endpoints, structured logging, backups, account export and deletion with recovery codes, user documentation, runbook and release checklist.
