# 07 — Website Content

What the site shows, page by page, and where each piece of content comes from. This is the bridge between the extracted handbook data ([04-content-pipeline.md](04-content-pipeline.md)) and the pages built in Phase 1 (wiki) and Phases 3–7 (play).

**Source of truth:** everything under `content/extracted/` is produced by `npm run content:extract` from `DD-Player-Handbook.pdf` (≈207,000 words, 360 spells, 12 classes, 18 races/subraces, 13 backgrounds, 42 feats, 15 conditions, 31 creatures, ≈230 equipment rows). `content/extracted/REPORT.md` is regenerated on each run with exact counts and known gaps.

> **Licensing reminder.** The extracted text is the copyrighted Player's Handbook. Only SRD 5.1 content may go on a public site. Every record keeps its source/page so the `SRD_ONLY` filter in [04](04-content-pipeline.md#licensing-note-read-first) can be applied. The marketing and onboarding copy in §4 is original text written for this product, not handbook text.

---

## 1. Content inventory

### 1.1 Extracted files

| File (under `content/extracted/`) | What it holds | Feeds |
|---|---|---|
| `chapters/*.md` (17 files) | Cleaned full text of the book by chapter/appendix, with `<!-- pdf-page N -->` markers | Rules text pages, search index, learn-to-play |
| `structured/spells.json` | 360 spells: name, level, school, ritual, casting time, range, components, duration, concentration, description, higher-level text, classes | Spell browser, spell pages, sheet/spellbook |
| `structured/spell-lists.json` | Class spell lists by level (842 entries) | Class pages, spell filters |
| `structured/classes.json` | 12 classes: hit die, proficiencies, 20-row level table, full class text | Class pages, level-up |
| `structured/races.json` | 18 races/subraces with named traits | Race pages, creator |
| `structured/backgrounds.json` | 13 backgrounds: skills, tools, languages, equipment, feature, text (incl. trait/ideal/bond/flaw tables) | Background pages, creator |
| `structured/feats.json` | 42 feats with prerequisite and text | Feat pages, level-up |
| `structured/conditions.json` | 15 conditions | Conditions page, combat UI tooltips |
| `structured/equipment.json` | ≈230 rows: armor (13), weapons (36), gear, tools, mounts, services; cost/weight/damage/AC where parsed | Equipment pages, shop, inventory |
| `structured/creatures.json` | 31 Appendix D stat blocks | Creature pages, companions, Wild Shape |
| `structured/gods.json` | Pantheon table rows (needs review) | Deities page |
| `REPORT.md` | Coverage counts and known gaps | QA |

Every structured record has `pdfPages` (or `pdfPage`) so an editor can open the book at that page. Page markers are **0-based PDF indexes**; the PDF has 294 pages against 317 printed pages.

### 1.2 Known gaps (must be filled by hand or from the SRD before launch)

| Gap | Impact | Fix |
|---|---|---|
| Spell text for **Control Weather** and **Trap the Soul** missing from the PDF text layer | 2 spells without descriptions | Transcribe from the book or take from SRD data |
| **Variant Human** traits (skill + feat at level 1) missing | The most common feat-at-1 option | Add to `content/overrides/` manually |
| Chapter 5 first page (starting equipment, wealth) missing | Starting-gold rules | Transcribe manually; class starting equipment is still in class text |
| Class level tables are raw text rows (`columns`) | No per-column data for rage uses, slots, etc. | Column-split in Phase 1 using class-specific parsers, or take from SRD JSON |
| Equipment `category` unreliable for gear; gods table unreviewed | Wrong grouping on some pages | Manual review pass |
| Residual OCR artefacts (e.g. `them selves`, `Ship’s Passage` apostrophe) | Typos on pages | Spell-check pass; fix via overrides |
| Table pages (multiclass slots, trinkets, personality tables) are kept as text | Not yet rollable/queryable | Parse into rows in Phase 1 (d6/d8/d100 tables) |

---

## 2. Site map

```
/                              Home (marketing)
/learn                         How to play (onboarding)
/wiki                          Rules reference home + global search
  /wiki/races                  List  → /wiki/races/[index]            (9 races, 18 incl. subraces)
  /wiki/classes                List  → /wiki/classes/[index]          (12) → subclass sections
  /wiki/backgrounds            List  → /wiki/backgrounds/[index]      (13)
  /wiki/feats                  List  → /wiki/feats/[index]            (42)
  /wiki/equipment              Tabs: Armor · Weapons · Gear · Tools · Mounts & Vehicles · Trade goods · Services
  /wiki/spells                 Filterable list → /wiki/spells/[index] (360)
  /wiki/conditions             All 15 on one page
  /wiki/rules                  Chapters 7–10 as linkable sections (abilities, adventuring, combat, spellcasting)
  /wiki/creatures              List  → /wiki/creatures/[index]        (31 + SRD monsters later)
  /wiki/gods                   Pantheons
  /wiki/planes                 Planes of existence
  /wiki/character              Existing section: abilities, alignment, background, languages, proficiency, skills
/characters                    (auth) list, creator wizard, sheet           — Phase 3
/campaigns                     (auth) hub, DM screen, live table             — Phases 4–7
/account, /help, /legal        Settings, support, attribution & licences
```

Navigation: top bar (Wiki · Play · Characters · Campaigns · account), wiki sidebar generated from a content-type registry (replaces `data/pageTabData/CharacterTabData.ts`), breadcrumb on every wiki page, `⌘K` global search.

---

## 3. Page specifications

Each wiki detail page shows the entity's fields, a "Source: Player's Handbook, p.N" citation, previous/next within the list, and cross-links (any spell, condition, feat, or equipment name in text becomes a link).

### 3.1 Home `/`
- **Purpose:** explain the product in 10 seconds and send people to play or learn.
- **Content:** hero, three feature blocks (Build · Play · Learn), "Browse the rules" tiles with live counts from the DB (e.g. *360 spells*), a featured spell/class of the day, call-to-action buttons.
- **Data:** counts and a random featured entity; copy from §4.

### 3.2 Learn to play `/learn`
- **Purpose:** onboarding for new players and DMs.
- **Content:** original five-step explainer (§4.3), glossary of core terms (§5), "Make your first character" CTA, "Run your first session" checklist for DMs.
- **Data:** links into wiki sections; no handbook text reproduced.

### 3.3 Races `/wiki/races`, `/wiki/races/[index]`
- **List:** cards with name, size, speed, ability bonuses, one-line trait summary; subraces nested under their race.
- **Detail fields:** description text, ability score increase, age, alignment, size, speed, languages, each named trait (name + description), subrace choices, names tables (text).
- **Source:** `races.json` (`traits[]`, `text`).
- **Notes:** Variant Human to be added by override.

### 3.4 Classes `/wiki/classes`, `/wiki/classes/[index]`
- **List:** 12 cards with hit die, primary ability, saves, spellcasting yes/no.
- **Detail sections:** overview, class features table (levels 1–20 with proficiency bonus and features), hit points, proficiencies (armor, weapons, tools, saves, skills), starting equipment, level-by-level feature descriptions, subclass sections (one anchor per archetype/domain/circle/oath/patron/tradition), multiclass requirements, a "Quick Build" tip, spell list link for casters.
- **Source:** `classes.json` (`hitDie`, `proficiencies`, `levelTable`, `text`), `spell-lists.json`.
- **Notes:** `levelTable.columns` is raw text until column-split.

### 3.5 Backgrounds `/wiki/backgrounds`
- **Detail:** skill proficiencies, tool proficiencies, languages, equipment, background feature (name + text), suggested personality traits/ideals/bonds/flaws with "roll one" buttons, variants.
- **Source:** `backgrounds.json`.

### 3.6 Feats `/wiki/feats`
- **List:** searchable table: feat, prerequisite, summary. Filter by "no prerequisite", ability prerequisite, armor/weapon/spell requirement.
- **Detail:** prerequisite, benefits list.
- **Source:** `feats.json`.

### 3.7 Equipment `/wiki/equipment`
- **Tabs:** Armor (AC, Strength, Stealth, weight, cost) · Weapons (damage, weight, properties with tooltips) · Adventuring gear · Tools · Mounts & vehicles · Trade goods · Lifestyle/services · Trinkets (d100 roller).
- **Features:** sortable columns, currency converter (cp/sp/ep/gp/pp), "add to character" (Phase 3).
- **Source:** `equipment.json`, `chapters/05-equipment.md`.

### 3.8 Spells `/wiki/spells`, `/wiki/spells/[index]`
- **List:** table with name, level, school, casting time, range, concentration ◆, ritual ®, classes. Filters: level (0–9), class, school, concentration, ritual, components (V/S/M), search.
- **Detail:** full stat line (casting time, range, components with material text, duration), description, "At Higher Levels", classes that can cast it, damage/save summary chips (Phase 6).
- **Source:** `spells.json`, `spell-lists.json`.
- **Counts:** cantrips 27, 1st 62, 2nd 59, 3rd 50, 4th 35, 5th 42, 6th 32, 7th 20, 8th 17, 9th 16 (+2 descriptions missing).

### 3.9 Conditions `/wiki/conditions`
- One page, 15 anchored sections plus the exhaustion table; each condition is also a tooltip anywhere the term appears (combat log, sheet).
- **Source:** `conditions.json`.

### 3.10 Rules `/wiki/rules`
- **Sections** split from chapters 7–10: ability scores & modifiers, advantage/disadvantage, proficiency, ability checks and each ability's uses, saving throws; time, movement, environment, social interaction, resting, downtime; combat order, movement, actions, attacks, cover, damage and healing, mounted and underwater combat; spellcasting rules.
- **Source:** `chapters/07..10-*.md`, split at headings in Phase 1.

### 3.11 Creatures `/wiki/creatures`
- Stat-block layout (AC, HP, speed, ability scores with modifiers, skills, senses, languages, challenge/XP, traits, actions). Filters: type, size, CR.
- **Source:** `creatures.json` (`abilities` parsed; traits/actions currently in `text`).

### 3.12 Gods, planes, further reading
- Gods table by pantheon (domain, alignment, symbol); planes pages; recommended reading list.
- **Source:** `chapters/appendix-b/c/e-*.md`, `gods.json` (review first).

### 3.13 Existing wiki section `/wiki/character`
- Keep the current pages (abilities, alignment, background) but source them from the new tables rather than `getData`. Add Languages, Proficiencies, Skills, which are already tabs in `data/pageTabData/CharacterTabData.ts`.

### 3.14 Play-side pages (content only; features in later phases)
- **Character creator:** step copy and hints per step (§4.4), choice cards pulling from races/classes/backgrounds/feats/equipment.
- **Character sheet / campaign table:** labels, tooltips with rule citations, empty-state copy.

---

## 4. Original copy (ready to use)

### 4.1 Home
- **Headline:** *Your table, wherever your friends are.*
- **Sub-headline:** Build characters, run sessions, and keep every roll and rule straight, so everyone at the table can focus on the story.
- **Feature blocks**
  - **Build.** Step-by-step character creation with every race, class, background and feat, checked against the rules as you go.
  - **Play.** Real-time sessions with dice, initiative, spells and conditions handled for you. Your Dungeon Master can override anything.
  - **Learn.** A searchable rules reference with every spell, class and condition one click away.
- **Primary CTA:** Create a character · **Secondary CTA:** Browse the rules

### 4.2 Wiki intro
Everything you need to look up mid-session. Search for a spell, compare two classes, or check what a condition does. Every entry links to the book page it came from.

### 4.3 Learn to play: five steps
1. **One person is the Dungeon Master (DM).** They describe the world and play everyone the players don't control.
2. **Everyone else plays one adventurer.** You decide who they are and what they try to do.
3. **Describe what you want to do.** The DM tells you what happens, often after you roll a twenty-sided die.
4. **Rolls decide uncertain outcomes.** Add your character's bonuses; meet or beat the target number to succeed.
5. **Stories continue.** Your character grows stronger across sessions, and the campaign remembers what you did.

### 4.4 Creator step hints
| Step | Hint |
|---|---|
| Concept | Start with an idea ("a cautious healer", "a thief with a conscience"), not numbers. |
| Race | Race sets your starting bonuses and a few traits. It doesn't dictate your personality. |
| Class | Class is what your character is best at. Fighters fight, wizards cast, and everything in between. |
| Abilities | Put your highest score in your class's key ability. We'll show what each choice affects. |
| Background | Where you came from, with two skills, a feature and a few roleplaying hooks. |
| Equipment | Take the suggested kit, or spend your starting gold. You can change it later. |
| Review | Check the summary. Anything the rules disallow is flagged with an explanation. |

### 4.4b Empty states and errors
- No characters: *No adventurers yet. Create your first one in a few minutes.*
- No campaigns: *Start a campaign as DM or join one with an invite code.*
- Search with no results: *Nothing matched "{query}". Try a spell, class, or condition name.*
- Hidden information: *Only the DM can see this.*
- Disconnected: *Reconnecting… your table's state is safe.*

### 4.5 Footer and legal
- **Attribution (SRD mode):** *This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC, available under the Creative Commons Attribution 4.0 International License.*
- **Not affiliated:** *This is an unofficial fan project and is not affiliated with or endorsed by Wizards of the Coast.*
- Links: Terms · Privacy · Licences · Report a content error.

### 4.6 FAQ
- **Do I need to know the rules?** No. The app handles the arithmetic, and the wiki explains anything you're unsure about.
- **Do I need a Dungeon Master?** Yes. One person runs the game; the app supports them but doesn't replace them.
- **Can the DM change a result?** Always. Every automated outcome has a manual override.
- **Is voice or video included?** Not yet. Use your usual chat tool alongside the table.
- **Which rules are supported?** The 5th Edition Player's Handbook rules, levels 1–20 (see the coverage list).

---

## 5. Glossary (seed for tooltips and `/learn`)

Ability check · Ability score · Advantage / disadvantage · Armor Class (AC) · Attack roll · Background · Bonus action · Cantrip · Challenge rating · Class · Concentration · Condition · Critical hit · Damage type · Death saving throw · Difficulty Class (DC) · Dungeon Master · Experience points · Feat · Hit points · Initiative · Inspiration · Level · Long rest · Multiclassing · Proficiency bonus · Race · Reaction · Ritual · Saving throw · Short rest · Skill · Spell slot · Subclass · Temporary hit points.

Short definitions are written once (in our words) and used by tooltips, `/learn`, and the creator. They link to the matching wiki section for the full rule.

---

## 6. Content model per page type

Field names match the JSON so import is mechanical.

| Type | Fields |
|---|---|
| Spell | `index, name, level, school, ritual, castingTime, range, components, duration, concentration, description, higherLevels, classes[]` |
| Class | `index, name, hitDie, proficiencies{Armor,Weapons,Tools,Saving Throws,Skills}, levelTable[{level,proficiencyBonus,columns}], text, pdfPages` |
| Race / subrace | `index, name, traits[{name,description}], text, pdfPages` |
| Background | `index, name, skillProficiencies, toolProficiencies, languages, equipment, featureName, text` |
| Feat | `index, name, prerequisite, description` |
| Condition | `index, name, description` |
| Equipment | `name, category, cost, weight, damage, properties, armorClass, strengthRequired, stealthDisadvantage` |
| Creature | `index, name, size, type, alignment, armorClass, hitPoints, speed, abilities{str..cha}, senses, languages, challenge, text` |

Planned additions in Phase 1: `source` (`PHB`/`SRD`), `automation` tier, parsed effects ([04](04-content-pipeline.md#encoding-mechanics-effects)), per-column class tables, parsed d-tables.

## 7. SEO and sharing
- One canonical URL per entity (`/wiki/spells/fireball`); human-readable slugs from `index`.
- Page title `Fireball · 3rd-level evocation · {Site}`; meta description from the first sentence of the entry (only in SRD/licensed mode).
- Structured data (`schema.org/Article`) for rules pages; sitemap generated from the content registry.
- Open Graph card with the entity name, type and key stats.
- Wiki pages are statically generated and revalidated on content changes.

## 8. Editorial process
1. Run `npm run content:extract` after any change to the extraction scripts or PDF; review `REPORT.md` for count regressions.
2. Fix text errors in `content/overrides/` (never by editing `extracted/`, which is regenerated).
3. Each content change cites the PDF page; reviewers compare against the book.
4. Add new entities (homebrew, additional sources) as separate sources, never mixed into PHB rows.
5. Spell-check and link-check in CI; broken cross-links fail the build.
