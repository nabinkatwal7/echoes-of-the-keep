import { ABILITIES, SKILLS, type Ability, type AbilityScores, type Skill } from "@/engine/abilities";
import {
  validatePointBuy,
  validateRolledAssignment,
  validateStandardArray,
} from "@/engine/abilities/generation";
import { CLASS_RULES, parseSkillList, skillOptions } from "@/engine/classes/rules";
import { deriveCharacter } from "@/engine/character";
import { VARIANT_HUMAN, parseAbilityIncrease, parseSpeed } from "@/lib/rules/race";

export type AbilityMethod = "standard" | "pointbuy" | "roll";

export type CreatorChoices = {
  name: string;
  raceIndex: string;
  subraceIndex?: string;
  classIndex: string;
  backgroundIndex: string;
  alignment?: string;
  abilityMethod: AbilityMethod;
  /** scores assigned to abilities before racial bonuses */
  scores: AbilityScores;
  /** the six rolled values, required for the "roll" method so the assignment can be checked */
  rolled?: number[];
  /** Half-Elf: two abilities other than Charisma */
  flexibleBonuses?: Ability[];
  /** skills chosen from the class list */
  classSkills: Skill[];
  /** Variant Human: one extra skill and a feat at 1st level */
  variantSkill?: Skill;
  variantFeat?: string;
  personality?: { traits?: string; ideals?: string; bonds?: string; flaws?: string; backstory?: string };
};

/** What the builder needs to know about the selected content rows. */
export type BuildContent = {
  race: { index: string; traits: { name: string; description: string }[] };
  subrace?: { index: string; traits: { name: string; description: string }[] };
  background: { index: string; skillProficiencies: string | null };
};

export type NewCharacter = {
  name: string;
  raceIndex: string;
  subraceIndex: string | null;
  backgroundIndex: string;
  alignment: string | null;
  classes: { classIndex: string; level: number }[];
  baseScores: AbilityScores;
  abilityMethod: AbilityMethod;
  scoreBonuses: Partial<AbilityScores>;
  skillProficiencies: Skill[];
  feats: string[];
  speed: number;
  currentHp: number;
  hitDiceSpent: Record<string, { total: number; spent: number }>;
  personality: NonNullable<CreatorChoices["personality"]>;
};

export type BuildResult = { ok: true; character: NewCharacter } | { ok: false; errors: string[] };

const trait = (traits: { name: string; description: string }[] | undefined, name: string) =>
  traits?.find((t) => t.name === name)?.description;

export function buildCharacter(choices: CreatorChoices, content: BuildContent): BuildResult {
  const errors: string[] = [];
  const rules = CLASS_RULES[choices.classIndex];
  if (!choices.name.trim()) errors.push("Name is required");
  if (!rules) errors.push(`Unknown class: ${choices.classIndex}`);

  // ability scores by method
  const method =
    choices.abilityMethod === "standard" ? validateStandardArray(choices.scores)
    : choices.abilityMethod === "pointbuy" ? validatePointBuy(choices.scores)
    : validateRolledAssignment(choices.rolled ?? [], choices.scores);
  errors.push(...method.errors);

  // racial bonuses: race plus subrace
  const bonuses: Partial<AbilityScores> = {};
  const add = (a: Ability, n: number) => (bonuses[a] = (bonuses[a] ?? 0) + n);
  const variant = content.subrace?.index === VARIANT_HUMAN;
  // the variant human replaces the human's standard increase
  const raceAsi = variant ? { fixed: {} } : parseAbilityIncrease(trait(content.race.traits, "Ability Score Increase") ?? "");
  const subAsi = parseAbilityIncrease(trait(content.subrace?.traits, "Ability Score Increase") ?? "");
  for (const asi of [raceAsi, subAsi]) for (const [a, n] of Object.entries(asi.fixed)) add(a as Ability, n!);
  const chooseRule = variant ? subAsi.choose : (raceAsi as ReturnType<typeof parseAbilityIncrease>).choose;
  if (chooseRule) {
    const picks = choices.flexibleBonuses ?? [];
    const fixedKeys = Object.keys(raceAsi.fixed);
    if (picks.length !== chooseRule.count || new Set(picks).size !== picks.length) {
      errors.push(`Choose ${chooseRule.count} different abilities for your racial bonus`);
    } else if (picks.some((a) => fixedKeys.includes(a))) {
      errors.push("Racial bonus choices must differ from the ability that already increases");
    } else if (picks.some((a) => !ABILITIES.includes(a))) {
      errors.push("Unknown ability in racial bonus");
    } else {
      for (const a of picks) add(a, chooseRule.amount);
    }
  }

  // skills: background grants fixed skills; class choices must be new, from the list, and the right count
  const backgroundSkills = parseSkillList(content.background.skillProficiencies ?? "");
  if (rules) {
    const allowed = skillOptions(choices.classIndex);
    const { count } = rules.skillChoices;
    if (choices.classSkills.length !== count) errors.push(`Choose exactly ${count} class skills`);
    if (new Set(choices.classSkills).size !== choices.classSkills.length) errors.push("Class skills must be different");
    for (const s of choices.classSkills) {
      if (!allowed.includes(s)) errors.push(`${s} is not a ${choices.classIndex} skill`);
      if (backgroundSkills.includes(s)) errors.push(`${s} is already granted by your background; pick another`);
    }
  }

  if (errors.length || !rules) return { ok: false, errors };

  const skillProficiencies = [...backgroundSkills, ...choices.classSkills];
  const feats: string[] = [];
  if (variant) {
    if (!choices.variantSkill || !(choices.variantSkill in SKILLS)) errors.push("Choose a skill for your variant human trait");
    else if (skillProficiencies.includes(choices.variantSkill)) errors.push(`${choices.variantSkill} is already a proficiency; pick another skill`);
    else skillProficiencies.push(choices.variantSkill);
    if (!choices.variantFeat) errors.push("Choose a feat for your variant human trait");
    else feats.push(choices.variantFeat);
    if (errors.length) return { ok: false, errors };
  }
  const speed = parseSpeed(trait(content.race.traits, "Speed"));
  const derived = deriveCharacter({
    classes: [{ classIndex: choices.classIndex, level: 1 }],
    baseScores: choices.scores,
    scoreBonuses: bonuses,
    speed,
  });

  return {
    ok: true,
    character: {
      name: choices.name.trim(),
      raceIndex: content.race.index,
      subraceIndex: content.subrace?.index ?? null,
      backgroundIndex: content.background.index,
      alignment: choices.alignment ?? null,
      classes: [{ classIndex: choices.classIndex, level: 1 }],
      baseScores: choices.scores,
      abilityMethod: choices.abilityMethod,
      scoreBonuses: bonuses,
      skillProficiencies,
      feats,
      speed,
      currentHp: derived.maxHp,
      hitDiceSpent: { [rules.hitDie]: { total: 1, spent: 0 } },
      personality: choices.personality ?? {},
    },
  };
}
