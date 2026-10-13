import type { DamageType } from "../damage";
import type { ClassLevel } from "../progression";

/** Numeric and rule-level effects a character gets from race, feats and class features. */
export type Effects = {
  hpPerLevel: number;
  initiativeBonus: number;
  speedBonus: number;
  passivePerceptionBonus: number;
  acBonus: number;
  darkvision: number;
  resistances: DamageType[];
  jackOfAllTrades: boolean;
  /** human-readable features worth showing on the sheet, with where they came from */
  traits: { name: string; source: string; automated: boolean }[];
};

export const emptyEffects = (): Effects => ({
  hpPerLevel: 0, initiativeBonus: 0, speedBonus: 0, passivePerceptionBonus: 0, acBonus: 0,
  darkvision: 0, resistances: [], jackOfAllTrades: false, traits: [],
});

type Partial_ = Partial<Omit<Effects, "traits">> & { trait?: string };

const RACE: Record<string, Partial_> = {
  dwarf: { darkvision: 60, resistances: ["poison"], trait: "Dwarven Resilience" },
  "hill-dwarf": { hpPerLevel: 1, trait: "Dwarven Toughness" },
  "mountain-dwarf": { trait: "Dwarven Armor Training" },
  elf: { darkvision: 60, trait: "Keen Senses, Fey Ancestry, Trance" },
  "high-elf": { trait: "Elf Weapon Training, Cantrip" },
  "wood-elf": { speedBonus: 5, trait: "Fleet of Foot, Mask of the Wild" },
  "dark-elf-drow": { darkvision: 120, trait: "Superior Darkvision, Sunlight Sensitivity, Drow Magic" },
  halfling: { trait: "Lucky, Brave, Halfling Nimbleness" },
  lightfoot: { trait: "Naturally Stealthy" },
  stout: { resistances: ["poison"], trait: "Stout Resilience" },
  gnome: { darkvision: 60, trait: "Gnome Cunning" },
  "forest-gnome": { trait: "Natural Illusionist, Speak with Small Beasts" },
  "rock-gnome": { trait: "Artificer's Lore, Tinker" },
  "half-elf": { darkvision: 60, trait: "Fey Ancestry, Skill Versatility" },
  "half-orc": { darkvision: 60, trait: "Menacing, Relentless Endurance, Savage Attacks" },
  tiefling: { darkvision: 60, resistances: ["fire"], trait: "Hellish Resistance, Infernal Legacy" },
  dragonborn: { trait: "Draconic Ancestry, Breath Weapon, Damage Resistance" },
};

const FEAT: Record<string, Partial_> = {
  tough: { hpPerLevel: 2, trait: "Tough" },
  alert: { initiativeBonus: 5, trait: "Alert" },
  mobile: { speedBonus: 10, trait: "Mobile" },
  observant: { passivePerceptionBonus: 5, trait: "Observant" },
};

const NOT_AUTOMATED_FEATS = new Set(["lucky", "sentinel", "sharpshooter", "great-weapon-master", "polearm-master", "war-caster", "shield-master"]);

function merge(into: Effects, e: Partial_, source: string, automated: boolean) {
  into.hpPerLevel += e.hpPerLevel ?? 0;
  into.initiativeBonus += e.initiativeBonus ?? 0;
  into.speedBonus += e.speedBonus ?? 0;
  into.passivePerceptionBonus += e.passivePerceptionBonus ?? 0;
  into.acBonus += e.acBonus ?? 0;
  into.darkvision = Math.max(into.darkvision, e.darkvision ?? 0);
  for (const r of e.resistances ?? []) if (!into.resistances.includes(r)) into.resistances.push(r);
  if (e.jackOfAllTrades) into.jackOfAllTrades = true;
  if (e.trait) for (const t of e.trait.split(", ")) into.traits.push({ name: t, source, automated });
}

export type EffectInput = {
  raceIndex: string;
  subraceIndex?: string | null;
  feats: string[];
  classes: ClassLevel[];
  /** equipped armor category, which gates Unarmored Movement and Fast Movement */
  armor?: "light" | "medium" | "heavy" | null;
  shield?: boolean;
};

/** Gather the effects the engine applies automatically. Everything else stays as a displayed trait. */
export function collectEffects(i: EffectInput): Effects {
  const out = emptyEffects();
  const race = i.raceIndex === "human" ? {} : RACE[i.raceIndex];
  if (race) merge(out, race, i.raceIndex, !!(race.hpPerLevel || race.speedBonus || race.darkvision || race.resistances?.length));
  if (i.subraceIndex && RACE[i.subraceIndex]) merge(out, RACE[i.subraceIndex], i.subraceIndex, !!(RACE[i.subraceIndex].hpPerLevel || RACE[i.subraceIndex].speedBonus || RACE[i.subraceIndex].resistances?.length));
  for (const f of i.feats) {
    if (FEAT[f]) merge(out, FEAT[f], "feat", true);
    else out.traits.push({ name: f.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), source: "feat", automated: !NOT_AUTOMATED_FEATS.has(f) && false });
  }

  for (const { classIndex, level } of i.classes) {
    if (classIndex === "bard" && level >= 2) {
      out.jackOfAllTrades = true;
      out.traits.push({ name: "Jack of All Trades", source: "bard", automated: true });
    }
    if (classIndex === "barbarian" && level >= 5 && i.armor !== "heavy") {
      out.speedBonus += 10;
      out.traits.push({ name: "Fast Movement", source: "barbarian", automated: true });
    }
    if (classIndex === "monk" && level >= 2 && !i.armor && !i.shield) {
      out.speedBonus += level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : 10;
      out.traits.push({ name: "Unarmored Movement", source: "monk", automated: true });
    }
  }
  return out;
}
