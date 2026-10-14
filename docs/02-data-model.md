# 02 - Data model

Two families of tables: **rules content** (seeded, read-only at run time) and **play state** (created by people and by play). The schema is `prisma/schema.prisma`; migrations are in `prisma/migrations/`. This page describes what exists.

## Conventions

- Content rows have a stable string `index` (a slug such as `hill-dwarf` or `fireball`) as the natural key, so seeding is an idempotent upsert.
- Content rows carry `source` (`PHB`, `HOMEBREW`) and, where known, the handbook `pdfPages`.
- Variable-shaped data (class level tables, race traits, a character's inventory) is stored in validated `Json` columns.
- Characters refer to content by index **string**, not by foreign key, so content can be re-seeded without touching characters.
- Owned play state uses `onDelete: Cascade` from its owner (a user, a campaign or an encounter).
- Migrations are SQL files. When the database shows "migration modified after applied" (line endings), do not reset it: create new migrations with `prisma migrate diff`, apply them, then `prisma migrate resolve --applied <name>`.

## Rules content

| Model | Holds |
| --- | --- |
| `Alignment`, `Language`, `Condition` | Short reference lists |
| `Race` | Races and subraces (`traits` JSON, text) |
| `Class`, `Subclass` | Hit die, proficiencies, level table; subclass text |
| `Background`, `Feat` | Skills and features; feat prerequisites as text, checked by `engine/feats` |
| `Spell` | Level, school, casting time, range, components, duration, ritual, concentration, text, class list. `campaignId` is set for a campaign's homebrew spell |
| `EquipmentItem` | Cost, weight, damage, properties, category |
| `Creature` | Stat blocks. The 31 handbook creatures plus the SRD monsters. `campaignId` is set for a homebrew monster |
| `RuleSection` | The handbook's rules chapters split into linkable sections |

## Accounts

| Model | Notes |
| --- | --- |
| `User` | `username` (lowercase, unique), `displayName`, `passwordHash` (scrypt), `deletedAt` (14-day soft delete), `recoveryHashes`, **`isBot`** (computer player, cannot sign in) |
| `LoginThrottle` | Failed sign-ins per username, shared by every server process |
| `HomebrewEntry` | A person's own race, background, feat or item, visible only to them |

## Characters

`Character` holds one hero: owner, race, subrace, background, alignment, `classes` (JSON list of `{classIndex, level, subclassIndex}`), `baseScores`, `scoreBonuses`, skills, feats, speed, `xp`, `inspiration`, `rezPenalty` (after being raised), `portraitUrl`, hit points and temporary hit points, `hitDiceSpent`, `deathSaves`, `conditions`, `exhaustion`, `currency`, `equipment` (JSON inventory), `spellSlotsUsed`, `resources` (class feature uses), `spells` (known, prepared, spellbook per class, and current concentration), `companions` (wild shape, familiars), `personality`, `notes`.

Derived numbers (armor class, hit point maximum, attack bonuses, save and skill totals, spell slots) are **never stored**. They are computed by `engine/character` and `lib/characters/derive.ts` from these fields each time.

## Campaigns

| Model | Holds |
| --- | --- |
| `Campaign` | `dmId`, invite code, `settings` (house rules, call link, and `solo` for solo games), `clockMinutes` (in-game time, day 1 at 08:00 = 480), `world` (burning lights, and `solo` adventure state) |
| `CampaignMember` | Role `DM` or `PLAYER`, `lastSeenAt` for presence |
| `CampaignCharacter` | Which heroes are in which campaign |
| `CampaignEvent` | Append-only log: chat, rolls, system lines, sheet changes, combat. `audience` is `ALL`, `DM` or `USER:<id>` |
| `GameSession` | Numbered sessions with a recap and a "next up" note |
| `JournalEntry` | Notes (private), handouts and recaps (shared on purpose), optional image |
| `Npc`, `Location`, `Quest` | The DM's world, each with a `revealed` flag. A location can be the current scene |
| `StashItem` | Party treasure |
| `RandomTable` | Weighted tables, optionally rollable by players |

## Combat

| Model | Holds |
| --- | --- |
| `Encounter` | State `PLANNED`, `ACTIVE` or `DONE`, round, active index, grid size, `environment` (underwater, mounted, fog, walls) |
| `Combatant` | A hero or creature in an encounter: kind, linked character or creature, initiative and turn order, hit points, armor class, speed, position, conditions with timers, `turn` (action economy), attacks (JSON profiles), defenses, `extra` (buffs, concentration, summoner, ally flag, polymorph and recharge state), death saves |

A combatant of kind `character` mirrors its hit points and conditions to the `Character` row on every change. Monsters and summons exist only in the encounter.

## How solo play uses these

No new content tables. A solo game is a `Campaign` whose `settings.solo` and `world.solo` hold the configuration and the adventure, and whose computer players are `User` rows with `isBot = true`. See [solo-play.md](solo-play.md#data).

## Indexes and integrity

- Unique: `(campaignId, userId)` on members; `inviteCode`; `username`; `(campaignId, number)` on sessions.
- `CampaignEvent` is indexed on `(campaignId, id)` for the stream.
- Deleting a user cascades to their characters, memberships and journal entries and to the campaigns they run. The account purge removes a person's solo games and bot accounts first.
