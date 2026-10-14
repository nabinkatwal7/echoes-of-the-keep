import type { Ability } from "@/engine/abilities";
import { cantripDiceMultiplier } from "./index";

/** The damage types spells use. */
const TYPES = ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"] as const;
export type SpellDamageType = (typeof TYPES)[number];

const ABILITY_BY_NAME: Record<string, Ability> = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" };
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const CONDITIONS = ["blinded", "charmed", "deafened", "frightened", "paralyzed", "petrified", "poisoned", "restrained", "stunned", "incapacitated", "prone"] as const;
export type SpellCondition = (typeof CONDITIONS)[number];

export type AreaShape = "sphere" | "cylinder" | "cube" | "cone" | "line";
export type SpellArea = {
  shape: AreaShape;
  /** radius for spheres and cylinders, side for cubes, length for cones and lines (feet) */
  size: number;
  /** line width in feet */
  width?: number;
  /** the area starts at the caster rather than at a chosen point */
  fromSelf: boolean;
};

export type SpellEffect = {
  /** how the spell reaches its targets */
  delivery: "attack" | "save" | "auto" | "heal" | "temp" | "pool" | "none";
  attack?: "melee" | "ranged";
  save?: Ability;
  halfOnSave: boolean;
  damage?: { dice: string; type: SpellDamageType; flat: number };
  healing?: { dice: string; addModifier: boolean; /** a fixed amount instead of dice (Heal restores 70) */ flat?: number };
  /** temporary hit points granted (False Life, Armor of Agathys) */
  tempHp?: { dice: string; flat: number; perSlotLevel: number };
  /** a pool of hit points rolled once; creatures are affected lowest first (Sleep, Color Spray) */
  pool?: { dice: string; condition: "unconscious" | "blinded" };
  /** extra damage or healing dice for each slot level above the spell's own */
  upcastDice?: string;
  /** damage that grows with character level (cantrips) */
  cantripScaling: boolean;
  /** darts or rays, one attack or hit each */
  projectiles?: { count: number; extraPerLevel: number };
  /** extra targets per slot level above the spell's own */
  extraTargetsPerLevel: number;
  area?: SpellArea;
  /** condition imposed on a failed save (or on a hit) */
  condition?: SpellCondition;
  /** rounds the effect lasts; 0 when instantaneous */
  durationRounds: number;
  concentration: boolean;
  /** touch, self, or a range in feet */
  range: { kind: "self" | "touch" | "ranged" | "sight"; feet: number };
};

/** The handbook text has stray spaces inside dice ("8d 6", "2 d10") and words; fix them before matching. */
export const cleanSpellText = (s: string) => s.replace(/(\d+)\s*d\s*(\d+)/g, "$1d$2").replace(/\s+/g, " ");

export function durationToRounds(duration: string): number {
  const m = /(\d+)\s*(round|minute|hour|day)/i.exec(duration);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return unit === "round" ? n : unit === "minute" ? n * 10 : unit === "hour" ? n * 600 : n * 14400;
}

function parseRange(range: string): SpellEffect["range"] {
  if (/^self/i.test(range)) return { kind: "self", feet: 0 };
  if (/^touch/i.test(range)) return { kind: "touch", feet: 5 };
  if (/^sight/i.test(range)) return { kind: "sight", feet: 1000 };
  const m = /(\d+)\s*feet/i.exec(range);
  return { kind: "ranged", feet: m ? Number(m[1]) : 0 };
}

function parseArea(range: string, text: string): SpellArea | undefined {
  const fromSelf = /^self/i.test(range);
  let m = /(\d+)-foot[- ]radius(?:,\s*\d+-foot-tall)?\s*(sphere|cylinder)/i.exec(text) ?? /(\d+)-foot[- ]radius\s*(sphere|cylinder)/i.exec(range);
  if (m) return { shape: m[2].toLowerCase() as AreaShape, size: Number(m[1]), fromSelf };
  m = /(\d+)-foot[- ](cone|cube)/i.exec(range) ?? /(\d+)-foot[- ](cone|cube)/i.exec(text);
  if (m) return { shape: m[2].toLowerCase() as AreaShape, size: Number(m[1]), fromSelf };
  m = /line (\d+) feet long and (\d+) feet wide/i.exec(text) ?? /(\d+)-foot line/i.exec(range);
  if (m) return { shape: "line", size: Number(m[1]), width: m[2] ? Number(m[2]) : 5, fromSelf };
  return undefined;
}

/** Read a spell's mechanics from its handbook text. This covers the common patterns; anything else is "none" (narrated). */
export function parseSpellEffect(spell: { level: number; range: string; duration: string; description: string; higherLevels: string; concentration: boolean }): SpellEffect {
  const text = cleanSpellText(spell.description);
  const higher = cleanSpellText(spell.higherLevels);
  const range = parseRange(spell.range);

  const attack = /(melee|ranged) spell attack/i.exec(text)?.[1].toLowerCase() as "melee" | "ranged" | undefined;
  const saveName = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i.exec(text)?.[1].toLowerCase();
  const save = saveName ? ABILITY_BY_NAME[saveName] : undefined;

  const dmg = new RegExp(`(\\d+d\\d+)(?:\\s*\\+\\s*(\\d+))?\\s+(${TYPES.join("|")})\\s+damage`, "i").exec(text);
  const heal = /regains? (?:a number of )?hit points equal to (\d+d\d+)( \+ your spellcasting ability modifier)?/i.exec(text);

  const upcast = /(?:damage|healing) increases by (\d+d\d+) for each slot level above/i.exec(higher)?.[1];
  const cantripScaling = spell.level === 0 && /increases by \d+d\d+ when you reach 5th level/i.test(text);

  let projectiles: SpellEffect["projectiles"];
  const proj = /(one|two|three|four|five|six) (?:glowing )?(darts|rays|beams)/i.exec(text);
  if (proj) projectiles = { count: NUMBER_WORDS[proj[1].toLowerCase()], extraPerLevel: /(?:one )?(?:more|additional) (?:dart|ray)/i.test(higher) ? 1 : 0 };

  const extraTargets = /(?:one |1 )?additional (?:humanoid|creature|target)s? for each slot level/i.exec(higher) ? 1 : 0;
  const area = parseArea(spell.range, text) ?? (/within (\d+) feet of a point you choose/i.test(text) ? { shape: "sphere" as const, size: Number(/within (\d+) feet of a point you choose/i.exec(text)![1]), fromSelf: false } : undefined);

  const cond = new RegExp(`(?:be|becomes?|is) (${CONDITIONS.join("|")})`, "i").exec(text)?.[1].toLowerCase() as SpellCondition | undefined;

  const flatHeal = /regains? (\d+) hit points/i.exec(text);
  const temp = /(?:gain|gains)\s+(?:(\d+d\d+)(?:\s*\+\s*(\d+))?|(\d+))\s+temporary hit points/i.exec(text);
  const tempPerLevel = /(\d+) additional temporary hit points for each slot level/i.exec(higher) ?? /temporary hit points increases? by (\d+) for each slot level/i.exec(higher);
  const poolMatch = /roll (\d+d\d+); the total is how many hit points/i.exec(text);
  const poolExtra = /roll an additional (\d+d\d+) for each slot level/i.exec(higher)?.[1];

  let delivery: SpellEffect["delivery"] = "none";
  if (attack) delivery = "attack";
  else if (save && (dmg || cond)) delivery = "save";
  else if (heal || flatHeal) delivery = "heal";
  else if (temp) delivery = "temp";
  else if (poolMatch) delivery = "pool";
  else if (dmg && /never misses|automatically hits?|dart hits/i.test(text)) delivery = "auto";

  return {
    delivery,
    attack,
    save,
    halfOnSave: /half as much damage/i.test(text),
    damage: dmg ? { dice: dmg[1], type: dmg[3].toLowerCase() as SpellDamageType, flat: dmg[2] ? Number(dmg[2]) : 0 } : undefined,
    healing: heal ? { dice: heal[1], addModifier: !!heal[2] } : flatHeal ? { dice: "0d1", addModifier: false, flat: Number(flatHeal[1]) } : undefined,
    tempHp: temp ? { dice: temp[1] ?? "0d1", flat: temp[1] ? Number(temp[2] ?? 0) : Number(temp[3]), perSlotLevel: tempPerLevel ? Number(tempPerLevel[1]) : 0 } : undefined,
    pool: poolMatch ? { dice: poolMatch[1], condition: /blinded/i.test(text) ? "blinded" : "unconscious" } : undefined,
    upcastDice: upcast ?? poolExtra,
    cantripScaling,
    projectiles,
    extraTargetsPerLevel: extraTargets,
    area,
    condition: cond,
    durationRounds: durationToRounds(spell.duration),
    concentration: spell.concentration,
    range,
  };
}

/** Multiply the dice count of "NdM" by a factor, or add n extra dice of the same size. */
const diceParts = (d: string) => {
  const [n, s] = d.split("d").map(Number);
  return { n, s };
};

/** The damage or healing dice at a given slot level and character level. */
export function scaledDice(base: string, effect: SpellEffect, spellLevel: number, slotLevel: number, characterLevel: number): string {
  const { n, s } = diceParts(base);
  let count = n;
  if (effect.cantripScaling) count = n * cantripDiceMultiplier(characterLevel);
  if (effect.upcastDice && slotLevel > spellLevel) count += diceParts(effect.upcastDice).n * (slotLevel - spellLevel);
  return `${count}d${s}`;
}

export const projectileCount = (effect: SpellEffect, spellLevel: number, slotLevel: number) =>
  effect.projectiles ? effect.projectiles.count + effect.projectiles.extraPerLevel * Math.max(0, slotLevel - spellLevel) : 1;

export const maxTargets = (effect: SpellEffect, spellLevel: number, slotLevel: number) => 1 + effect.extraTargetsPerLevel * Math.max(0, slotLevel - spellLevel);
