import { ABILITIES, type Ability, type AbilityScores } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import { isSubclassOf, subclassDueAt } from "@/engine/classes/subclasses";
import { deriveCharacter } from "@/engine/character";
import { validateCharacter } from "@/engine/character/validate";
import { asiLevels, levelForXp, type ClassLevel } from "@/engine/progression";
import { toEngineInput, type StoredCharacter } from "./derive";

export type LevelUpStored = StoredCharacter & {
  xp: number;
  currentHp: number;
  hitDiceSpent: unknown;
  feats: unknown;
};

export type ImprovementChoice =
  | { kind: "asi"; /** one ability for +2, or two for +1 each */ abilities: Ability[] }
  | { kind: "feat"; feat: string };

export type LevelUpChoices = {
  /** class to gain a level in (an existing class, or a new one to multiclass) */
  classIndex: string;
  /** required when the new class level grants an ASI or feat */
  improvement?: ImprovementChoice;
  /** required at the class's subclass level (1st for clerics, sorcerers and warlocks, 2nd druids and wizards, else 3rd) */
  subclassIndex?: string;
};

export type LevelUpResult =
  | {
      ok: true;
      update: {
        classes: ClassLevel[];
        scoreBonuses: Partial<AbilityScores>;
        feats: string[];
        currentHp: number;
        hitDiceSpent: Record<string, { total: number; spent: number }>;
      };
      newLevel: number;
      hpGained: number;
    }
  | { ok: false; errors: string[] };

export const totalLevel = (classes: ClassLevel[]) => classes.reduce((s, c) => s + c.level, 0);

/** Can this character take another level given XP (or milestone leveling when `ignoreXp`)? */
export function canLevelUp(c: Pick<LevelUpStored, "xp" | "classes">, ignoreXp = false): boolean {
  const level = totalLevel(c.classes as ClassLevel[]);
  return level < 20 && (ignoreXp || levelForXp(c.xp) > level);
}

/** Does taking `classIndex` give an ASI/feat at its new class level? */
export function improvementDue(classes: ClassLevel[], classIndex: string): boolean {
  const existing = classes.find((c) => c.classIndex === classIndex);
  return asiLevels(classIndex).includes((existing?.level ?? 0) + 1);
}

export function applyLevelUp(c: LevelUpStored, choices: LevelUpChoices, ignoreXp = false): LevelUpResult {
  const errors: string[] = [];
  const classes = (c.classes as ClassLevel[]).map((x) => ({ ...x }));
  if (!CLASS_RULES[choices.classIndex]) return { ok: false, errors: [`Unknown class: ${choices.classIndex}`] };
  if (!canLevelUp(c, ignoreXp)) errors.push("Not enough experience for another level");

  const due = improvementDue(classes, choices.classIndex);
  const bonuses: Partial<AbilityScores> = { ...(c.scoreBonuses as Partial<AbilityScores>) };
  const feats = [...(c.feats as string[])];
  if (due) {
    const imp = choices.improvement;
    if (!imp) errors.push("Choose an Ability Score Improvement or a feat");
    else if (imp.kind === "feat") {
      if (!imp.feat) errors.push("Choose a feat");
      else if (feats.includes(imp.feat)) errors.push("You already have that feat");
      else feats.push(imp.feat);
    } else {
      const picks = imp.abilities;
      if (picks.length < 1 || picks.length > 2 || new Set(picks).size !== picks.length || picks.some((a) => !ABILITIES.includes(a))) {
        errors.push("Choose one ability (+2) or two different abilities (+1 each)");
      }
      for (const a of picks) bonuses[a] = (bonuses[a] ?? 0) + (picks.length === 1 ? 2 : 1);
    }
  } else if (choices.improvement) {
    errors.push("This level does not grant an Ability Score Improvement");
  }

  const existing = classes.find((x) => x.classIndex === choices.classIndex);
  const newClassLevel = (existing?.level ?? 0) + 1;
  const needsSubclass = subclassDueAt(choices.classIndex, newClassLevel) && !existing?.subclassIndex;
  if (needsSubclass && !(choices.subclassIndex && isSubclassOf(choices.subclassIndex, choices.classIndex))) {
    errors.push("Choose a subclass for this level");
  }
  if (existing) {
    existing.level += 1;
    if (needsSubclass && choices.subclassIndex) existing.subclassIndex = choices.subclassIndex;
  } else classes.push({ classIndex: choices.classIndex, level: 1, ...(needsSubclass && choices.subclassIndex ? { subclassIndex: choices.subclassIndex } : {}) });

  const next = { ...c, classes, scoreBonuses: bonuses };
  const issues = validateCharacter(toEngineInput(next));
  // legality checks that matter here: class set, multiclass prerequisites, 20-point score cap
  errors.push(...issues.filter((i) => ["multiclass-prereq", "ability-cap", "level-range", "unknown-class"].includes(i.code)).map((i) => i.message));
  if (errors.length) return { ok: false, errors };

  const before = deriveCharacter(toEngineInput(c));
  const after = deriveCharacter(toEngineInput(next));
  const hpGained = after.maxHp - before.maxHp;

  const die = CLASS_RULES[choices.classIndex].hitDie;
  const hitDiceSpent = JSON.parse(JSON.stringify(c.hitDiceSpent ?? {})) as Record<string, { total: number; spent: number }>;
  hitDiceSpent[die] = { total: (hitDiceSpent[die]?.total ?? 0) + 1, spent: hitDiceSpent[die]?.spent ?? 0 };

  return {
    ok: true,
    newLevel: after.level,
    hpGained,
    update: { classes, scoreBonuses: bonuses, feats, currentHp: c.currentHp + hpGained, hitDiceSpent },
  };
}
