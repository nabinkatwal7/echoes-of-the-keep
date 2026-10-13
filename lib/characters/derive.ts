import type { AbilityScores, Skill } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import { ABILITIES } from "@/engine/abilities";
import { deriveCharacter, type CharacterInput, type DerivedCharacter } from "@/engine/character";
import type { PrereqContext } from "@/engine/feats";
import type { ClassLevel } from "@/engine/progression";
import { equipmentForEngine, type InventoryItem } from "./inventory";

/** Stored character fields needed to compute the sheet (a subset of the Prisma Character row). */
export type StoredCharacter = {
  classes: unknown;
  baseScores: unknown;
  scoreBonuses: unknown;
  skillProficiencies: unknown;
  skillExpertise: unknown;
  speed: number;
  /** inventory items; armor, shield and weapons that are equipped feed AC and attacks */
  equipment?: unknown;
};

export function toEngineInput(c: StoredCharacter): CharacterInput {
  const classes = c.classes as ClassLevel[];
  const first = CLASS_RULES[classes[0]?.classIndex];
  const gear = equipmentForEngine((c.equipment as InventoryItem[] | undefined) ?? [], classes.map((k) => k.classIndex));
  return {
    classes,
    baseScores: c.baseScores as AbilityScores,
    scoreBonuses: c.scoreBonuses as Partial<AbilityScores>,
    speed: c.speed,
    skillProficiencies: c.skillProficiencies as Skill[],
    skillExpertise: c.skillExpertise as Skill[],
    // only the first class grants saving throw proficiencies (PHB p.164)
    saveProficiencies: first ? [...first.saves] : [],
    armor: gear.armor,
    shield: gear.shield,
    weapons: gear.weapons,
    acBonus: gear.acBonus || undefined,
  };
}

export const deriveStored = (c: StoredCharacter): DerivedCharacter => deriveCharacter(toEngineInput(c));

/** Facts a feat prerequisite can ask about: final scores, armor training from any class, spellcasting. */
export function prereqContext(c: StoredCharacter): PrereqContext {
  const input = toEngineInput(c);
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, (input.baseScores[a] ?? 0) + (input.scoreBonuses?.[a] ?? 0)])) as PrereqContext["scores"];
  const armor = new Set<string>();
  let canCast = false;
  for (const cl of input.classes) {
    const rules = CLASS_RULES[cl.classIndex];
    rules?.armor.forEach((a) => armor.add(a));
    // half casters gain spellcasting at level 2
    if (rules?.spellcasting) canCast = true;
    if (["paladin", "ranger"].includes(cl.classIndex) && cl.level >= 2) canCast = true;
  }
  return { scores, armorProficiencies: [...armor], canCastSpells: canCast };
}
