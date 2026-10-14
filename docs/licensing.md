# Licensing and attribution

This is a fan project built from a copy of the *Player's Handbook* supplied by its owner. Read this before putting the app on the public internet.

## What is and is not freely usable

| Material | Status |
| --- | --- |
| Game rules as mechanics (how a d20 check works, what a condition does) | Ideas and mechanics are not copyrightable, but the wording is |
| The *Player's Handbook* text, tables, spell descriptions, class and race descriptions | Copyright Wizards of the Coast. **Not licensed for redistribution** |
| The **System Reference Document 5.1 (SRD)** | Published by Wizards of the Coast under the Creative Commons Attribution 4.0 license (CC-BY-4.0). Free to use with the attribution below |
| Artwork, logos, the names of settings and some product identity terms | Not covered by the SRD |

The importer in `content/` extracts text from the PDF the owner provides. That extracted text (`content/extracted/**`) and the database seeded from it contain handbook wording. **Do not publish that content on a public site or in a public repository.** Keep `content/extracted/` out of any public deployment, or run in SRD-only mode (below) and import only SRD text.

## SRD-only mode

Set `CONTENT_LICENSE_MODE=SRD_ONLY` to restrict what players can choose and see (`lib/srd.ts`):

- Races and subraces: Dwarf (Hill), Elf (High), Halfling (Lightfoot), Human, Dragonborn, Gnome (Rock), Half-Elf, Half-Orc, Tiefling.
- Subclasses: one per class, as in the SRD (Berserker, Lore, Life, Land, Champion, Open Hand, Devotion, Hunter, Thief, Draconic, Fiend, Evocation). The creator and level-up only offer these, and the server refuses the rest.
- Backgrounds: Acolyte. Feats: Grappler.
- Spells, equipment and creatures are matched by name against the SRD 5.1 lists (spacing and a proper-name prefix are ignored, so the extract's "Me lf's Acid Arrow" still counts). Direct links to anything else return 404. Search, the spell picker and the encounter list use the same filter. Homebrew rows (`source: HOMEBREW` or a campaign id) stay visible inside that campaign.
- Wiki pages, including rules chapters, show a one-line note instead of handbook prose.

**Seeding for a public site.** Run `pnpm db:seed:srd` (same as `prisma db seed` with `CONTENT_LICENSE_MODE=SRD_ONLY`). It writes only SRD rows, empties class and subclass prose, writes no handbook chapters, and **deletes** anything else already in the database. On a test run it left 319 spells (the SRD's own count), 13 races, 12 subclasses, 1 background, 1 feat, 189 equipment rows and no rule sections. Deploy that database, not the full one.

What this does not prove:

1. SRD rows still carry the text as extracted from the handbook PDF. Where the SRD covers an item the wording is the same, but the extract has spacing errors, and nobody has compared each entry with the SRD file. Spell descriptions stay hidden in the free-rules build for that reason. Before showing them, compare against the SRD text or re-import from the SRD files.
2. Names are matched against the SRD name lists (`lib/srdCatalog.ts`), so a handbook item that shares an SRD name is kept even if its wording differs slightly.
3. Racial trait sentences for the 13 SRD races still go to the character creator because ability bonuses and speed are read from them. They are SRD content.
4. This is not legal advice (see below).

## Attribution to display

When serving SRD content, show this notice (it is included in the site footer and on `/legal`):

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

The app must not claim to be affiliated with or endorsed by Wizards of the Coast. The footer already says it is an unofficial fan project.

## Homebrew

Homebrew monsters a DM builds belong to that DM and are visible only inside their campaign. They are not added to the public wiki.

## Questions this document does not answer

This is a project note, not legal advice. If the app will be public or paid, get a short review from someone qualified in intellectual property law.
