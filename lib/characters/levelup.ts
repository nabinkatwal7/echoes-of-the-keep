import { ABILITIES, type Ability, type AbilityScores } from "@/engine/abilities";
import { featuresAt, subclassFeaturesAt } from "@/engine/classes/features";
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
      /** class and subclass features printed at this new class level */
      gained: string[];
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

  const subclassIndex = classes.find((x) => x.classIndex === choices.classIndex)?.subclassIndex;
  const gained = [
    ...featuresAt(choices.classIndex, newClassLevel).map((f) => f.name),
    ...(subclassIndex ? subclassFeaturesAt(subclassIndex, newClassLevel).map((f) => f.name) : []),
  ];

  return {
    ok: true,
    newLevel: after.level,
    hpGained,
    gained,
    update: { classes, scoreBonuses: bonuses, feats, currentHp: c.currentHp + hpGained, hitDiceSpent },
  };
}

export const UNDO_KEY = "_undo";

export type UndoSnapshot = {
  classes: ClassLevel[];
  scoreBonuses: Partial<AbilityScores>;
  feats: string[];
  currentHp: number;
  hitDiceSpent: Record<string, { total: number; spent: number }>;
};

const resourceMap = (resources: unknown): Record<string, number | string> =>
  resources && typeof resources === "object" && !Array.isArray(resources) ? { ...(resources as Record<string, number | string>) } : {};

/** Snapshot written into resources so the last level-up can be undone. */
export function withUndoSnapshot(resources: unknown, c: LevelUpStored): Record<string, number | string> {
  const map = resourceMap(resources);
  const snap: UndoSnapshot = {
    classes: c.classes as ClassLevel[],
    scoreBonuses: { ...(c.scoreBonuses as Partial<AbilityScores>) },
    feats: [...(c.feats as string[])],
    currentHp: c.currentHp,
    hitDiceSpent: JSON.parse(JSON.stringify(c.hitDiceSpent ?? {})),
  };
  map[UNDO_KEY] = JSON.stringify(snap);
  return map;
}

/** Restore the character to the state saved before the last level-up. One step only. */
export function undoLevelUp(c: LevelUpStored & { resources: unknown }):
  | { ok: true; update: UndoSnapshot & { resources: Record<string, number | string> } }
  | { ok: false; errors: string[] } {
  const map = resourceMap(c.resources);
  const raw = map[UNDO_KEY];
  if (typeof raw !== "string") return { ok: false, errors: ["No level-up to undo"] };
  let snap: UndoSnapshot;
  try {
    snap = JSON.parse(raw) as UndoSnapshot;
  } catch {
    return { ok: false, errors: ["The saved level-up could not be read"] };
  }
  if (!Array.isArray(snap.classes) || snap.classes.length === 0) return { ok: false, errors: ["The saved level-up could not be read"] };
  delete map[UNDO_KEY];
  return { ok: true, update: { ...snap, resources: map } };
}
