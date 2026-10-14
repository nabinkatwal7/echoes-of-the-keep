import { parseDice } from "@/engine/dice";

const CLASSES = ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"];
const SAVES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const TYPES = ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"];

export type HomebrewSpellInput = {
  name: string;
  level: number;
  className: string;
  kind: "save" | "attack" | "heal";
  dice: string;
  damageType?: string;
  save?: string;
  range: number;
  upcastDice?: string;
};

export type HomebrewSpellFields = {
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higherLevels: string;
  classes: string[];
  source: "HOMEBREW";
};

/** Turn a short form into spell text the combat parser already understands. */
export function homebrewSpellFields(input: HomebrewSpellInput): { ok: true; fields: HomebrewSpellFields } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Give the spell a name (2-60 characters)" };
  if (!Number.isInteger(input.level) || input.level < 0 || input.level > 9) return { ok: false, error: "Spell level must be 0-9" };
  if (!CLASSES.includes(input.className)) return { ok: false, error: "Choose which class can learn it" };
  if (!Number.isInteger(input.range) || input.range < 5 || input.range > 500) return { ok: false, error: "Range must be 5-500 feet" };
  try {
    parseDice(input.dice);
  } catch {
    return { ok: false, error: `"${input.dice}" is not a dice expression` };
  }
  const upcast = input.upcastDice?.trim() ?? "";
  if (upcast && input.level === 0) return { ok: false, error: "Cantrips do not scale with a higher slot" };
  if (upcast) {
    try {
      parseDice(upcast);
    } catch {
      return { ok: false, error: `"${upcast}" is not a dice expression` };
    }
  }

  let description: string;
  if (input.kind === "heal") {
    description = `A creature you can see within range regains hit points equal to ${input.dice} + your spellcasting ability modifier.`;
  } else {
    if (!input.damageType || !TYPES.includes(input.damageType)) return { ok: false, error: "Choose a damage type" };
    if (input.kind === "attack") description = `Make a ranged spell attack against one target. On a hit, the target takes ${input.dice} ${input.damageType} damage.`;
    else if (input.kind === "save") {
      if (!input.save || !SAVES.includes(input.save)) return { ok: false, error: "Choose the saving throw" };
      description = `The target must succeed on a ${input.save} saving throw or take ${input.dice} ${input.damageType} damage. On a successful save, the target takes half as much damage.`;
    } else return { ok: false, error: "Choose how the spell hits" };
  }

  const what = input.kind === "heal" ? "healing" : "damage";
  const higherLevels = upcast ? `The ${what} increases by ${upcast} for each slot level above ${input.level}.` : "";
  return {
    ok: true,
    fields: {
      name, level: input.level, school: "evocation", ritual: false, concentration: false, castingTime: "1 action",
      range: `${input.range} feet`, components: "V, S", duration: "Instantaneous", description, higherLevels,
      classes: [input.className], source: "HOMEBREW",
    },
  };
}
