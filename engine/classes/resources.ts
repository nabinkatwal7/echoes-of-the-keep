import { abilityModifier, type AbilityScores } from "../abilities";
import type { Recharge } from "../rest";
import type { ClassLevel } from "../progression";

export type ClassResource = {
  key: string;
  label: string;
  max: number;
  recharge: Recharge;
  /** "pool" resources are counted in points (Lay on Hands, Ki); others are discrete uses */
  style: "uses" | "pool";
  classIndex: string;
};

/** Limited-use class features by class and level (PHB Ch.3). Unlimited features (Rage at 20) are omitted. */
export function classResources(classes: ClassLevel[], scores: AbilityScores): ClassResource[] {
  const out: ClassResource[] = [];
  const add = (classIndex: string, key: string, label: string, max: number, recharge: Recharge, style: "uses" | "pool" = "uses") => {
    if (max > 0) out.push({ classIndex, key, label, max, recharge, style });
  };
  const cha = Math.max(1, abilityModifier(scores.cha));

  for (const { classIndex, level } of classes) {
    switch (classIndex) {
      case "barbarian":
        if (level < 20) add(classIndex, "rage", "Rage", level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2, "long");
        break;
      case "bard":
        add(classIndex, "bardic-inspiration", "Bardic Inspiration", cha, level >= 5 ? "short" : "long");
        break;
      case "cleric":
        add(classIndex, "channel-divinity", "Channel Divinity", level >= 18 ? 3 : level >= 6 ? 2 : level >= 2 ? 1 : 0, "short");
        break;
      case "druid":
        if (level >= 2) add(classIndex, "wild-shape", "Wild Shape", 2, "short");
        break;
      case "fighter":
        add(classIndex, "second-wind", "Second Wind", 1, "short");
        if (level >= 2) add(classIndex, "action-surge", "Action Surge", level >= 17 ? 2 : 1, "short");
        if (level >= 9) add(classIndex, "indomitable", "Indomitable", level >= 17 ? 3 : level >= 13 ? 2 : 1, "long");
        break;
      case "monk":
        if (level >= 2) add(classIndex, "ki", "Ki points", level, "short", "pool");
        break;
      case "paladin":
        add(classIndex, "lay-on-hands", "Lay on Hands", level * 5, "long", "pool");
        add(classIndex, "divine-sense", "Divine Sense", 1 + abilityModifier(scores.cha), "long");
        if (level >= 3) add(classIndex, "channel-divinity", "Channel Divinity", 1, "short");
        break;
      case "rogue":
        if (level >= 20) add(classIndex, "stroke-of-luck", "Stroke of Luck", 1, "short");
        break;
      case "sorcerer":
        if (level >= 2) add(classIndex, "sorcery-points", "Sorcery points", level, "long", "pool");
        break;
      case "wizard":
        add(classIndex, "arcane-recovery", "Arcane Recovery", 1, "long");
        break;
    }
  }
  // two classes with the same key (e.g. Channel Divinity) are tracked separately by class
  return out.map((r) => (out.filter((o) => o.key === r.key).length > 1 ? { ...r, key: `${r.classIndex}:${r.key}` } : r));
}

/** Wizard Arcane Recovery: recover slots totalling up to half wizard level (rounded up), none above 5th level. */
export const arcaneRecoveryBudget = (wizardLevel: number) => Math.ceil(wizardLevel / 2);

/** Rage damage bonus by barbarian level (PHB p.46). */
export const rageDamage = (level: number) => (level >= 16 ? 4 : level >= 9 ? 3 : 2);
