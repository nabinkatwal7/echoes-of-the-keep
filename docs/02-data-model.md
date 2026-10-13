# 02 — Data Model

Two families of tables: **Rules content** (static, seeded, read-only at runtime) and **Play state** (user-created, mutable). Prisma schema lives in `prisma/schema.prisma`; this doc is the design that Phase 0–4 migrations implement.

## Conventions

- Rules content rows have a stable string `index` (slug, e.g. `hill-dwarf`, `fireball`) as natural key, matching SRD API naming so imports are idempotent (`upsert` by `index`).
- Every content row has `source` (`PHB`, `SRD`, `HOMEBREW`) and optional `page` for citing the handbook.
- Variable-shaped rules data (feature effects, spell damage, option choices) is stored as validated `Json` columns; Zod schemas in `content/schemas/` define and enforce the shape at seed time.
- Play-state rows carry `createdAt/updatedAt`; campaign events are append-only.

## Rules content (Phase 1)

| Entity | Key fields | PHB reference |
|---|---|---|
| `AbilityScore` | index (str…cha), name, description, skills[] | Ch.7 p.173 |
| `Skill` | index, ability, description | Ch.7 p.174 |
| `Proficiency` | index, type (armor/weapon/tool/skill/save/instrument/language) | Ch.5–7 |
| `Language` | index, type, script, typicalSpeakers | Ch.4 p.123 |
| `Alignment` | index, abbreviation, description | Ch.4 p.122 |
| `Race` / `Subrace` | speed, size, abilityBonuses, traits[], languages, proficiencies | Ch.2 p.17–43 |
| `Trait` | index, description, effects (Json) | Ch.2 |
| `Class` | hitDie, savingThrows, proficiencies, startingEquipment(+options), spellcasting?, multiclass prereqs/proficiencies | Ch.3 p.45–120 |
| `ClassLevel` | class, level, profBonus, features[], classSpecific (Json: rage uses, sneak-attack dice, ki…), spellcasting slots/known | Ch.3 class tables |
| `Subclass` | class, name, flavor, features by level, spells | Ch.3 |
| `Feature` | index, name, description, level, class/subclass/race, effects (Json), handlerKey? | Ch.2–3 |
| `Background` | proficiencies, languages, equipment, feature, suggested traits/ideals/bonds/flaws tables | Ch.4 p.125–141 |
| `Feat` | prerequisites (Json), effects (Json), description | Ch.6 p.165–170 |
| `Equipment` (+`Weapon`, `Armor`, `Gear`, `Tool`, `Mount`, `Vehicle`, `TradeGood`) | cost, weight, category, damage/AC/properties | Ch.5 p.143–159 |
| `EquipmentPack` | contents[] | Ch.5 p.151 |
| `Spell` | level, school, castingTime, range, components(+material), duration, concentration, ritual, classes[], description, higherLevel, `mechanics` (Json: attack/save, damage by slot level, area, conditions) | Ch.11 p.207–289 |
| `Condition` | index, description, effects (Json) | App.A p.290 |
| `Damage Type`, `MagicSchool`, `WeaponProperty` | lookup tables | Ch.5, 9 |
| `Monster` | full stat block (AC, HP dice, speeds, abilities, saves, skills, resistances, senses, languages, CR, XP, traits, actions, reactions, legendary actions) | App.D p.304 + SRD |
| `Deity` / `Plane` | lore reference | App.B, C |
| `Rule` | free-text rules chapters as searchable sections (Ch.7–10 prose) | Ch.7–10 |

## Play state

### Accounts
- `User` (Auth.js: `Account`, `Session`, `VerificationToken`), `displayName`, `avatar`.

### Characters (Phase 3)
- `Character`: owner, name, race, subrace, background, alignment, `xp`, `inspiration`, personality text fields (traits, ideals, bonds, flaws), appearance/backstory, `abilityScoresBase` (Json), `abilityMethod` (standard array / point buy / roll), `currentHp`, `tempHp`, `hitDiceSpent`, `deathSaves`, `exhaustion`, `conditions`, `currency` (cp/sp/ep/gp/pp).
- `CharacterClassLevel`: character, class, subclass?, level, ordering (supports multiclass).
- `CharacterChoice`: every decision with a `kind` + `payload`: skill picks, languages, cantrips known, spells known/prepared, spellbook, feat or ASI per level, fighting style, expertise, favoured enemy, etc.
- `CharacterItem`: equipment instance (equipped, attuned, quantity, custom name, notes).
- `CharacterSpellSlot`: level, expended (derived max).
- `CharacterResource`: limited-use features (rage, ki, channel divinity, second wind…) with `recharge` (short/long/dawn).
- `LevelUpLog`: history for audit/undo.

### Campaigns (Phase 4)
- `Campaign`: name, description, DM (`User`), settings (house rules toggles: variant human, feats, multiclassing, encumbrance, critical rules), invite code, status.
- `CampaignMember`: user, role (`DM`/`PLAYER`), joinedAt.
- `CampaignCharacter`: links a `Character` to a campaign (a character may be in one active campaign).
- `Session`: campaign, number, title, startedAt/endedAt, summary.
- `JournalEntry`: shared recap / private notes; `Note` visibility (`DM_ONLY`, `PLAYER`, `PARTY`).
- `Npc`, `Location`, `Quest`: DM tools with reveal flags.
- `CampaignEvent`: append-only log (id, campaign, session, actor, type, payload Json, visibility). Drives chat/roll log, combat log, SSE replay.
- `ChatMessage` (or events of type `chat`), `RollRecord` (expression, results, reason, secret flag).

### Encounters & combat (Phase 5, 7)
- `Encounter`: campaign, name, state (`PLANNED|ACTIVE|DONE`), round, activeCombatantId, xpBudget.
- `Combatant`: encounter, ref (character or monster instance), name, initiative, `hp`, `maxHp`, `tempHp`, position (x,y), `conditions` (Json with durations), `reactionUsed`, `actionState` (action/bonus/movement remaining), `isHidden`, `deathSaves`, `concentratingOn`.
- `MonsterInstance`: monster ref + per-instance overrides/HP.
- `MapScene` (optional): background, grid size, tokens.

### Items & treasure (Phase 7)
- `MagicItem` content table is out of scope of PHB (DMG); model `CampaignItem` for DM-created items and homebrew.
- `TreasureHoard`/`LootAward`: records of gold/items distributed.

### Homebrew (Phase 8)
- `HomebrewEntry`: type, JSON payload validated by the same Zod schemas as content, owner, campaign scope.

## Indexing and integrity notes

- Unique: `(campaignId, userId)` on members; `(characterId, classId)` on class levels; content `index`.
- Foreign keys with `onDelete: Cascade` for owned play-state; `Restrict` on content references used by characters (content is never deleted, only deprecated).
- Event log index on `(campaignId, id)` for replay; partial index for visibility filters.
- Full-text search: Postgres `tsvector` on `Spell`, `Feature`, `Rule`, `Monster`, `Equipment` for the wiki search.
