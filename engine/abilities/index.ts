export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type AbilityScores = Record<Ability, number>;

export const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export const SKILLS = {
  acrobatics: "dex",
  "animal-handling": "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight-of-hand": "dex",
  stealth: "dex",
  survival: "wis",
} as const satisfies Record<string, Ability>;

export type Skill = keyof typeof SKILLS;

/** PHB p.173: (score - 10) / 2, rounded down. */
export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

/** PHB p.15: +2 at levels 1-4 up to +6 at 17-20. */
export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError(`Level must be 1-20, got ${level}`);
  return Math.ceil(level / 4) + 1;
}

export type ProficiencyLevel = "none" | "half" | "proficient" | "expertise";

/** Proficiency contribution: half rounds down (Jack of All Trades), expertise doubles. */
export function proficiencyContribution(bonus: number, level: ProficiencyLevel): number {
  switch (level) {
    case "none":
      return 0;
    case "half":
      return Math.floor(bonus / 2);
    case "proficient":
      return bonus;
    case "expertise":
      return bonus * 2;
  }
}

export function abilityCheckBonus(score: number, profBonus: number, level: ProficiencyLevel = "none") {
  return abilityModifier(score) + proficiencyContribution(profBonus, level);
}

export function skillBonus(
  skill: Skill,
  scores: AbilityScores,
  profBonus: number,
  level: ProficiencyLevel = "none",
) {
  return abilityCheckBonus(scores[SKILLS[skill]], profBonus, level);
}

export function savingThrowBonus(ability: Ability, scores: AbilityScores, profBonus: number, proficient: boolean) {
  return abilityCheckBonus(scores[ability], profBonus, proficient ? "proficient" : "none");
}

/** Passive check = 10 + bonus, +5 for advantage, -5 for disadvantage (PHB p.175). */
export function passiveScore(bonus: number, mode: "normal" | "advantage" | "disadvantage" = "normal") {
  return 10 + bonus + (mode === "advantage" ? 5 : mode === "disadvantage" ? -5 : 0);
}

/** Group check succeeds when at least half the group succeeds (PHB p.175). */
export function groupCheckSucceeds(successes: number, groupSize: number) {
  return groupSize > 0 && successes * 2 >= groupSize;
}

/** Contest: the higher total wins; a tie leaves the situation unchanged (PHB p.174). */
export function contestWinner(a: number, b: number): "a" | "b" | "tie" {
  return a > b ? "a" : b > a ? "b" : "tie";
}

/** Difficulty classes by difficulty (PHB p.174). */
export const DC = { veryEasy: 5, easy: 10, medium: 15, hard: 20, veryHard: 25, nearlyImpossible: 30 } as const;
