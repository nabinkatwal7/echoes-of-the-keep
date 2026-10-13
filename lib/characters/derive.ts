import type { AbilityScores, Skill } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import { deriveCharacter, type CharacterInput, type DerivedCharacter } from "@/engine/character";
import type { ClassLevel } from "@/engine/progression";

/** Stored character fields needed to compute the sheet (a subset of the Prisma Character row). */
export type StoredCharacter = {
  classes: unknown;
  baseScores: unknown;
  scoreBonuses: unknown;
  skillProficiencies: unknown;
  skillExpertise: unknown;
  speed: number;
};

export function toEngineInput(c: StoredCharacter): CharacterInput {
  const classes = c.classes as ClassLevel[];
  const first = CLASS_RULES[classes[0]?.classIndex];
  return {
    classes,
    baseScores: c.baseScores as AbilityScores,
    scoreBonuses: c.scoreBonuses as Partial<AbilityScores>,
    speed: c.speed,
    skillProficiencies: c.skillProficiencies as Skill[],
    skillExpertise: c.skillExpertise as Skill[],
    // only the first class grants saving throw proficiencies (PHB p.164)
    saveProficiencies: first ? [...first.saves] : [],
  };
}

export const deriveStored = (c: StoredCharacter): DerivedCharacter => deriveCharacter(toEngineInput(c));
