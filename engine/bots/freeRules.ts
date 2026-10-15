import { SKILLS, type Skill } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import type { Blueprint } from "./blueprints";

/** The one background in the free rules (SRD 5.1) and the skills it grants. */
export const FREE_RULES_BACKGROUND = { index: "acolyte", skills: ["insight", "religion"] as Skill[] };

/**
 * A computer hero for the free-rules build: the SRD only has the Acolyte background, so use it, and swap any class skill the
 * background already grants for another skill the class may choose, so the hero is still valid.
 */
export function forFreeRules(bp: Blueprint, allowedBackgrounds: readonly string[]): Blueprint {
  if (allowedBackgrounds.includes(bp.backgroundIndex)) return bp;
  const granted = new Set<Skill>(FREE_RULES_BACKGROUND.skills);
  const options = CLASS_RULES[bp.classIndex]?.skillChoices.from;
  const pool = (options === "any" || !options ? (Object.keys(SKILLS) as Skill[]) : [...options]).filter((s) => !granted.has(s));
  const chosen: Skill[] = [];
  for (const s of [...bp.classSkills, ...pool]) {
    if (chosen.length >= bp.classSkills.length) break;
    if (!granted.has(s) && !chosen.includes(s) && pool.includes(s)) chosen.push(s);
  }
  return { ...bp, backgroundIndex: FREE_RULES_BACKGROUND.index, classSkills: chosen };
}
