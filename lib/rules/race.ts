import { ABILITIES, type Ability, type AbilityScores } from "@/engine/abilities";

const NAMES: Record<string, Ability> = {
  strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha",
};

export type AbilityIncrease = {
  fixed: Partial<AbilityScores>;
  /** e.g. Half-Elf: two other abilities of your choice increase by 1 */
  choose?: { count: number; amount: number };
};

/** Parse the "Ability Score Increase" trait text of a race or subrace. */
export function parseAbilityIncrease(text: string): AbilityIncrease {
  const fixed: Partial<AbilityScores> = {};
  if (/ability scores each increase by (\d+)/i.test(text)) {
    const n = Number(/each increase by (\d+)/i.exec(text)![1]);
    for (const a of ABILITIES) fixed[a] = n;
    return { fixed };
  }
  for (const m of text.matchAll(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score increases by (\d+)/gi)) {
    fixed[NAMES[m[1].toLowerCase()]] = Number(m[2]);
  }
  const choose = /(two|three|one)(?: different| other) ability scores? of your choice increases? by (\d+)/i.exec(text);
  return {
    fixed,
    ...(choose && { choose: { count: { one: 1, two: 2, three: 3 }[choose[1].toLowerCase() as "one"], amount: Number(choose[2]) } }),
  };
}

/** Base walking speed from the Speed trait text; defaults to 30. */
export function parseSpeed(text: string | undefined): number {
  const m = /base walking speed is (\d+) feet/i.exec(text ?? "");
  return m ? Number(m[1]) : 30;
}

export const SUBRACES: Record<string, string[]> = {
  dwarf: ["hill-dwarf", "mountain-dwarf"],
  elf: ["high-elf", "wood-elf", "dark-elf-drow"],
  halfling: ["lightfoot", "stout"],
  gnome: ["forest-gnome", "rock-gnome"],
  human: ["variant-human"],
};

/** Races where choosing a subrace is optional (the standard human is the default). */
export const OPTIONAL_SUBRACE = ["human"];

/** The variant human replaces the human's standard ability score increase. */
export const VARIANT_HUMAN = "variant-human";

export const BASE_RACES = ["dwarf", "elf", "halfling", "human", "dragonborn", "gnome", "half-elf", "half-orc", "tiefling"] as const;
