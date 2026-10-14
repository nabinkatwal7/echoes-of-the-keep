/**
 * SRD-only mode (CONTENT_LICENSE_MODE=SRD_ONLY).
 *
 * The Player's Handbook text is not freely licensed. The System Reference Document 5.1 is, under CC-BY-4.0.
 * In this mode the app only offers options whose names appear in the SRD, and pages omit handbook prose
 * (see docs/licensing.md). Spell descriptions are still the handbook's wording in the database; they are not shown.
 */
import { SRD_GEAR_NAMES, SRD_MONSTER_NAMES, SRD_SPELL_ALIASES, SRD_SPELL_NAMES } from "./srdCatalog";

export const SRD_RACES = ["dwarf", "hill-dwarf", "elf", "high-elf", "halfling", "lightfoot", "human", "dragonborn", "gnome", "rock-gnome", "half-elf", "half-orc", "tiefling"];
export const SRD_SUBCLASSES = [
  "path-of-the-berserker", "college-of-lore", "life-domain", "circle-of-the-land", "champion", "way-of-the-open-hand",
  "oath-of-devotion", "hunter", "thief", "draconic-bloodline", "the-fiend", "school-of-evocation",
];
export const SRD_BACKGROUNDS = ["acolyte"];
export const SRD_FEATS = ["grappler"];

export const srdOnly = () => process.env.CONTENT_LICENSE_MODE === "SRD_ONLY";

type Kind = "race" | "subclass" | "background" | "feat";
const LISTS: Record<Kind, string[]> = { race: SRD_RACES, subclass: SRD_SUBCLASSES, background: SRD_BACKGROUNDS, feat: SRD_FEATS };

/** Prisma `where` fragment that limits a query to SRD content when the mode is on. */
export const srdWhere = (kind: Kind): { index?: { in: string[] } } => (srdOnly() ? { index: { in: LISTS[kind] } } : {});

export const allowed = (kind: Kind, index: string | undefined | null) =>
  !srdOnly() || !index || index.startsWith("homebrew-") || LISTS[kind].includes(index);

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const SPELLS = new Set<string>(SRD_SPELL_NAMES);
const ALIASES = new Set<string>(SRD_SPELL_ALIASES);
const SPELL_SUFFIXES = [...SRD_SPELL_NAMES].filter((n) => n.length >= 7).sort((a, b) => b.length - a.length);
const GEAR = new Set<string>(SRD_GEAR_NAMES);
const MONSTERS = new Set<string>(SRD_MONSTER_NAMES);

/** True when this spell title is in the SRD, including the extract's broken spacing and a proper-name prefix. */
export function spellInSrd(name: string): boolean {
  const n = letters(name);
  if (SPELLS.has(n) || ALIASES.has(n)) return true;
  return SPELL_SUFFIXES.some((s) => n.length > s.length && n.length - s.length <= 16 && n.endsWith(s));
}

/** True when this item title is in the SRD equipment or magic-item list. Armor rows in the extract omit the word "armor". */
export function gearInSrd(name: string): boolean {
  const n = letters(name);
  return GEAR.has(n) || GEAR.has(`${n}armor`);
}

/** True when this creature title is in the SRD. "Hawk (Falcon)" matches Hawk. */
export function creatureInSrd(name: string): boolean {
  const n = letters(name);
  if (MONSTERS.has(n)) return true;
  const head = letters(name.split("(")[0] ?? "");
  return head.length > 0 && MONSTERS.has(head);
}

export const showSpell = (name: string, source?: string | null) => !srdOnly() || source === "HOMEBREW" || spellInSrd(name);
export const showGear = (name: string) => !srdOnly() || gearInSrd(name);
export const showCreature = (name: string, campaignId?: string | null) => !srdOnly() || !!campaignId || creatureInSrd(name);

/** Error messages for any choice that is outside the SRD while the mode is on. */
export function srdViolations(c: { raceIndex?: string; subraceIndex?: string | null; backgroundIndex?: string; subclassIndex?: string | null; feats?: string[] }): string[] {
  const out: string[] = [];
  if (!allowed("race", c.raceIndex)) out.push("That race is not part of the free rules (SRD)");
  if (!allowed("race", c.subraceIndex)) out.push("That subrace is not part of the free rules (SRD)");
  if (!allowed("background", c.backgroundIndex)) out.push("That background is not part of the free rules (SRD)");
  if (!allowed("subclass", c.subclassIndex)) out.push("That subclass is not part of the free rules (SRD)");
  for (const f of c.feats ?? []) if (!allowed("feat", f)) out.push("That feat is not part of the free rules (SRD)");
  return out;
}
