import type { Ability, Skill } from "../abilities";
import { SKILLS } from "../abilities";

export type ArmorProficiency = "light" | "medium" | "heavy" | "shields";

export type ClassRules = {
  hitDie: number;
  saves: [Ability, Ability];
  /** how many skills to choose and from which list ("any" = every skill) */
  skillChoices: { count: number; from: readonly Skill[] | "any" };
  armor: readonly ArmorProficiency[];
  /** ability used for spellcasting, if the class casts at 1st level */
  spellcasting?: Ability;
};

const ALL = Object.keys(SKILLS) as Skill[];

/** Class creation rules from the PHB class descriptions (Ch.3). */
export const CLASS_RULES: Record<string, ClassRules> = {
  barbarian: {
    hitDie: 12, saves: ["str", "con"], armor: ["light", "medium", "shields"],
    skillChoices: { count: 2, from: ["animal-handling", "athletics", "intimidation", "nature", "perception", "survival"] },
  },
  bard: { hitDie: 8, saves: ["dex", "cha"], armor: ["light"], skillChoices: { count: 3, from: "any" }, spellcasting: "cha" },
  cleric: {
    hitDie: 8, saves: ["wis", "cha"], armor: ["light", "medium", "shields"], spellcasting: "wis",
    skillChoices: { count: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
  },
  druid: {
    hitDie: 8, saves: ["int", "wis"], armor: ["light", "medium", "shields"], spellcasting: "wis",
    skillChoices: { count: 2, from: ["arcana", "animal-handling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
  },
  fighter: {
    hitDie: 10, saves: ["str", "con"], armor: ["light", "medium", "heavy", "shields"],
    skillChoices: { count: 2, from: ["acrobatics", "animal-handling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
  },
  monk: {
    hitDie: 8, saves: ["str", "dex"], armor: [],
    skillChoices: { count: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
  },
  paladin: {
    hitDie: 10, saves: ["wis", "cha"], armor: ["light", "medium", "heavy", "shields"],
    skillChoices: { count: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
  },
  ranger: {
    hitDie: 10, saves: ["str", "dex"], armor: ["light", "medium", "shields"],
    skillChoices: { count: 3, from: ["animal-handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
  },
  rogue: {
    hitDie: 8, saves: ["dex", "int"], armor: ["light"],
    skillChoices: { count: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleight-of-hand", "stealth"] },
  },
  sorcerer: {
    hitDie: 6, saves: ["con", "cha"], armor: [], spellcasting: "cha",
    skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  },
  warlock: {
    hitDie: 8, saves: ["wis", "cha"], armor: ["light"], spellcasting: "cha",
    skillChoices: { count: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
  },
  wizard: {
    hitDie: 6, saves: ["int", "wis"], armor: [], spellcasting: "int",
    skillChoices: { count: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
  },
};

export const skillOptions = (classIndex: string): Skill[] => {
  const rules = CLASS_RULES[classIndex];
  if (!rules) throw new Error(`Unknown class: ${classIndex}`);
  return rules.skillChoices.from === "any" ? [...ALL] : [...rules.skillChoices.from];
};

/** Skill names as written in the book ("Sleight of Hand") to engine keys ("sleight-of-hand"). */
export function parseSkillList(text: string): Skill[] {
  return text
    .split(/,| and /)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter((s): s is Skill => s in SKILLS);
}
