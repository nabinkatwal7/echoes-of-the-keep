import type { Ability, AbilityScores } from "../abilities";

export type Prerequisite =
  | { kind: "ability"; abilities: Ability[]; min: number }
  | { kind: "armor"; armor: "light" | "medium" | "heavy" | "shields" }
  | { kind: "spellcasting" }
  | { kind: "unknown"; text: string };

const ABILITY_WORDS: Record<string, Ability> = {
  strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha",
};

/**
 * Turn a feat prerequisite line into checkable parts, e.g. "Intelligence or Wisdom 13 or higher".
 * Anything unrecognised becomes `unknown`, which the DM must judge.
 */
export function parsePrerequisite(text: string | null | undefined): Prerequisite[] {
  if (!text) return [];
  const out: Prerequisite[] = [];
  for (const part of text.split(/;|\band\b(?! higher)/i).map((p) => p.trim()).filter(Boolean)) {
    const ability = /^((?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+or\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))*)\s+(\d+)\s+or higher$/i.exec(part);
    const armor = /^Proficiency with (light|medium|heavy) armor$/i.exec(part);
    if (ability) {
      out.push({ kind: "ability", abilities: ability[1].split(/\s+or\s+/i).map((w) => ABILITY_WORDS[w.toLowerCase()]), min: Number(ability[2]) });
    } else if (armor) {
      out.push({ kind: "armor", armor: armor[1].toLowerCase() as "light" | "medium" | "heavy" });
    } else if (/ability to cast at least one spell|spellcasting or pact magic/i.test(part)) {
      out.push({ kind: "spellcasting" });
    } else {
      out.push({ kind: "unknown", text: part });
    }
  }
  return out;
}

export type PrereqContext = {
  /** final ability scores including bonuses */
  scores: AbilityScores;
  armorProficiencies: readonly string[];
  canCastSpells: boolean;
};

export type PrereqCheck = { met: boolean; unmet: string[]; needsDmReview: string[] };

export function checkPrerequisites(text: string | null | undefined, ctx: PrereqContext): PrereqCheck {
  const unmet: string[] = [];
  const needsDmReview: string[] = [];
  for (const p of parsePrerequisite(text)) {
    if (p.kind === "ability") {
      if (!p.abilities.some((a) => ctx.scores[a] >= p.min)) unmet.push(`${p.abilities.map((a) => a.toUpperCase()).join(" or ")} ${p.min}+`);
    } else if (p.kind === "armor") {
      if (!ctx.armorProficiencies.includes(p.armor)) unmet.push(`${p.armor} armor proficiency`);
    } else if (p.kind === "spellcasting") {
      if (!ctx.canCastSpells) unmet.push("the ability to cast a spell");
    } else needsDmReview.push(p.text);
  }
  return { met: unmet.length === 0, unmet, needsDmReview };
}
