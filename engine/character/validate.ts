import { ABILITIES } from "../abilities";
import { asiLevels, canMulticlassInto, HIT_DICE } from "../progression";
import type { CharacterInput } from "./index";

export type Issue = { code: string; message: string };

export type BuildChoices = {
  /** ability score improvements taken (each is +2 split across abilities) */
  asiTaken?: number;
  featsTaken?: number;
  /** Human (variant) grants a feat at level 1 */
  bonusFeats?: number;
};

/** Rule violations in a character build; empty when legal (PHB Ch.1, 3, 6). */
export function validateCharacter(input: CharacterInput, choices: BuildChoices = {}): Issue[] {
  const issues: Issue[] = [];
  const push = (code: string, message: string) => issues.push({ code, message });

  const level = input.classes.reduce((s, c) => s + c.level, 0);
  if (input.classes.length === 0) push("no-class", "A character needs at least one class");
  if (level < 1 || level > 20) push("level-range", `Total level must be 1-20 (got ${level})`);
  if (input.classes.some((c) => c.level < 1)) push("class-level", "Each class must have at least 1 level");

  const seen = new Set<string>();
  for (const c of input.classes) {
    if (!HIT_DICE[c.classIndex]) push("unknown-class", `Unknown class: ${c.classIndex}`);
    if (seen.has(c.classIndex)) push("duplicate-class", `${c.classIndex} appears more than once`);
    seen.add(c.classIndex);
  }

  for (const a of ABILITIES) {
    const base = input.baseScores[a];
    if (!Number.isInteger(base) || base < 1 || base > 20) push("ability-range", `${a.toUpperCase()} base score must be 1-20`);
    if (base + (input.scoreBonuses?.[a] ?? 0) > 20) push("ability-cap", `${a.toUpperCase()} cannot exceed 20`);
  }

  if (input.classes.length > 1 && input.classes.every((c) => HIT_DICE[c.classIndex])) {
    const scores = Object.fromEntries(
      ABILITIES.map((a) => [a, input.baseScores[a] + (input.scoreBonuses?.[a] ?? 0)]),
    ) as typeof input.baseScores;
    for (const c of input.classes) {
      const others = input.classes.filter((o) => o !== c).map((o) => o.classIndex);
      if (!canMulticlassInto(c.classIndex, others, scores)) {
        push("multiclass-prereq", `Multiclassing into ${c.classIndex} needs 13 in the key ability of every class`);
        break;
      }
    }
  }

  const slots = input.classes.reduce((n, c) => n + asiLevels(c.classIndex).filter((l) => l <= c.level).length, 0);
  const used = (choices.asiTaken ?? 0) + (choices.featsTaken ?? 0);
  if (used > slots) push("too-many-improvements", `Used ${used} ASI/feat choices but only ${slots} are available`);

  const prof = new Set<string>(input.skillProficiencies ?? []);
  for (const s of input.skillExpertise ?? []) {
    if (!prof.has(s)) push("expertise-without-proficiency", `Expertise in ${s} requires proficiency`);
  }

  return issues;
}
