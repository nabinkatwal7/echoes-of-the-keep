import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  proficiencyBonus,
  proficiencyContribution,
  type Ability,
  type AbilityScores,
  type ProficiencyLevel,
  type Skill,
} from "../abilities";
import { HIT_DICE, type ClassLevel } from "../progression";

export type ArmorInput = {
  name: string;
  category: "light" | "medium" | "heavy";
  baseAc: number;
  strengthRequired?: number;
};

export type WeaponInput = {
  name: string;
  /** damage dice, e.g. "1d8" */
  damage: string;
  melee: boolean;
  finesse?: boolean;
  proficient: boolean;
  /** magic weapon bonus to attack and damage */
  magicBonus?: number;
};

export type CharacterInput = {
  classes: ClassLevel[];
  baseScores: AbilityScores;
  /** racial bonuses and ASIs, summed per ability */
  scoreBonuses?: Partial<AbilityScores>;
  /** base walking speed from race */
  speed: number;
  skillProficiencies?: Skill[];
  skillExpertise?: Skill[];
  saveProficiencies?: Ability[];
  /** Jack of All Trades: half proficiency on checks you are not proficient in */
  jackOfAllTrades?: boolean;
  armor?: ArmorInput;
  shield?: boolean;
  weapons?: WeaponInput[];
  /** extra hit points per level, e.g. Tough feat (2) or Hill Dwarf (1) */
  hpPerLevelBonus?: number;
  /** flat AC bonuses from magic items, fighting style Defense, etc. */
  acBonus?: number;
  /** extra to initiative (e.g. Alert feat +5) */
  initiativeBonus?: number;
  /** extra to passive Perception (e.g. Observant feat +5) */
  passivePerceptionBonus?: number;
};

export type Part = { label: string; value: number };
export type Breakdown = { total: number; parts: Part[] };

export type DerivedCharacter = {
  level: number;
  proficiencyBonus: number;
  abilities: Record<Ability, { score: number; modifier: number }>;
  maxHp: number;
  armorClass: Breakdown;
  initiative: Breakdown;
  speed: number;
  saves: Record<Ability, Breakdown>;
  skills: Record<Skill, Breakdown>;
  passivePerception: number;
  attacks: { name: string; attackBonus: Breakdown; damage: string }[];
};

const total = (parts: Part[]): Breakdown => ({ total: parts.reduce((s, p) => s + p.value, 0), parts });
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function deriveCharacter(input: CharacterInput): DerivedCharacter {
  const level = input.classes.reduce((s, c) => s + c.level, 0);
  if (level < 1 || level > 20) throw new RangeError(`Total level must be 1-20, got ${level}`);
  const prof = proficiencyBonus(level);

  // ability scores: base + bonuses, capped at 20
  const abilities = Object.fromEntries(
    ABILITIES.map((a) => {
      const score = Math.min(20, input.baseScores[a] + (input.scoreBonuses?.[a] ?? 0));
      return [a, { score, modifier: abilityModifier(score) }];
    }),
  ) as DerivedCharacter["abilities"];
  const mod = (a: Ability) => abilities[a].modifier;

  // hit points: first class's first level is max die, other levels use the average
  let maxHp = 0;
  input.classes.forEach((c, i) => {
    const die = HIT_DICE[c.classIndex];
    if (!die) throw new Error(`Unknown class: ${c.classIndex}`);
    for (let l = 1; l <= c.level; l++) {
      const base = i === 0 && l === 1 ? die : Math.floor(die / 2) + 1;
      maxHp += Math.max(1, base + mod("con") + (input.hpPerLevelBonus ?? 0));
    }
  });

  // armor class
  const acParts: Part[] = [];
  const unarmoredClass = input.classes.find((c) => ["barbarian", "monk"].includes(c.classIndex))?.classIndex;
  if (input.armor) {
    acParts.push({ label: input.armor.name, value: input.armor.baseAc });
    if (input.armor.category === "light") acParts.push({ label: "Dex", value: mod("dex") });
    if (input.armor.category === "medium") acParts.push({ label: "Dex (max +2)", value: Math.min(2, mod("dex")) });
  } else if (unarmoredClass === "barbarian") {
    acParts.push({ label: "Unarmored Defense", value: 10 }, { label: "Dex", value: mod("dex") }, { label: "Con", value: mod("con") });
  } else if (unarmoredClass === "monk" && !input.shield) {
    acParts.push({ label: "Unarmored Defense", value: 10 }, { label: "Dex", value: mod("dex") }, { label: "Wis", value: mod("wis") });
  } else {
    acParts.push({ label: "Base", value: 10 }, { label: "Dex", value: mod("dex") });
  }
  if (input.shield) acParts.push({ label: "Shield", value: 2 });
  if (input.acBonus) acParts.push({ label: "Bonuses", value: input.acBonus });

  // speed: heavy armor with unmet Strength requirement costs 10 ft
  let speed = input.speed;
  if (input.armor?.strengthRequired && abilities.str.score < input.armor.strengthRequired) speed -= 10;

  const profLevel = (skill: Skill): ProficiencyLevel =>
    input.skillExpertise?.includes(skill) ? "expertise"
    : input.skillProficiencies?.includes(skill) ? "proficient"
    : input.jackOfAllTrades ? "half"
    : "none";

  const skills = Object.fromEntries(
    (Object.keys(SKILLS) as Skill[]).map((skill) => {
      const ability = SKILLS[skill];
      const level = profLevel(skill);
      const parts: Part[] = [{ label: ability.toUpperCase(), value: mod(ability) }];
      const p = proficiencyContribution(prof, level);
      if (p) parts.push({ label: level === "expertise" ? "Expertise" : level === "half" ? "Half proficiency" : "Proficiency", value: p });
      return [skill, total(parts)];
    }),
  ) as Record<Skill, Breakdown>;

  const saves = Object.fromEntries(
    ABILITIES.map((a) => {
      const parts: Part[] = [{ label: a.toUpperCase(), value: mod(a) }];
      if (input.saveProficiencies?.includes(a)) parts.push({ label: "Proficiency", value: prof });
      return [a, total(parts)];
    }),
  ) as Record<Ability, Breakdown>;

  const attacks = (input.weapons ?? []).map((w) => {
    const ability: Ability = !w.melee ? "dex" : w.finesse ? (mod("dex") > mod("str") ? "dex" : "str") : "str";
    const parts: Part[] = [{ label: ability.toUpperCase(), value: mod(ability) }];
    if (w.proficient) parts.push({ label: "Proficiency", value: prof });
    if (w.magicBonus) parts.push({ label: "Magic", value: w.magicBonus });
    const dmgMod = mod(ability) + (w.magicBonus ?? 0);
    return { name: w.name, attackBonus: total(parts), damage: dmgMod === 0 ? w.damage : `${w.damage}${sign(dmgMod)}` };
  });

  const initiativeParts: Part[] = [{ label: "Dex", value: mod("dex") }];
  if (input.initiativeBonus) initiativeParts.push({ label: "Bonus", value: input.initiativeBonus });

  return {
    level,
    proficiencyBonus: prof,
    abilities,
    maxHp,
    armorClass: total(acParts),
    initiative: total(initiativeParts),
    speed,
    saves,
    skills,
    passivePerception: 10 + skills.perception.total + (input.passivePerceptionBonus ?? 0),
    attacks,
  };
}

/** Human-readable explanation, e.g. "+7 = +4 DEX +3 Proficiency". */
export function explain(b: Breakdown): string {
  return `${sign(b.total)} = ${b.parts.map((p) => `${sign(p.value)} ${p.label}`).join(" ")}`;
}
