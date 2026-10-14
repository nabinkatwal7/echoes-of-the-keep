import { parseChallenge } from "@/engine/companions";

/** What a summoning spell lets the caster call, by slot level. Numbers follow the spell descriptions. */
export type SummonRule = {
  /** creature type the spell allows (matched against the stat block's type) */
  type: RegExp;
  label: string;
  /** the combinations the caster may choose from at this slot level */
  options: (slotLevel: number) => { count: number; maxCr: number }[];
  /** only these names, for Animate Dead */
  names?: string[];
  /** the creatures stay only while the caster concentrates */
  concentration: boolean;
};

export const SUMMON_RULES: Record<string, SummonRule> = {
  // Conjure Animals: 5th level doubles the number, 7th triples, 9th quadruples (PHB p.225)
  "conjure-animals": {
    type: /beast/, label: "beasts", concentration: true,
    options: (slot) => {
      const mult = slot >= 9 ? 4 : slot >= 7 ? 3 : slot >= 5 ? 2 : 1;
      return [{ count: 1, maxCr: 2 }, { count: 2 * mult, maxCr: 1 }, { count: 4 * mult, maxCr: 0.5 }, { count: 8 * mult, maxCr: 0.25 }];
    },
  },
  "conjure-woodland-beings": {
    type: /fey/, label: "fey creatures", concentration: true,
    options: (slot) => {
      const mult = slot >= 9 ? 4 : slot >= 7 ? 3 : slot >= 6 ? 2 : 1;
      return [{ count: 1, maxCr: 2 }, { count: 2 * mult, maxCr: 1 }, { count: 4 * mult, maxCr: 0.5 }, { count: 8 * mult, maxCr: 0.25 }];
    },
  },
  "conjure-minor-elementals": {
    type: /elemental/, label: "elementals", concentration: true,
    options: (slot) => {
      const mult = slot >= 8 ? 3 : slot >= 6 ? 2 : 1;
      return [{ count: 1, maxCr: 2 }, { count: 2 * mult, maxCr: 1 }, { count: 4 * mult, maxCr: 0.5 }, { count: 8 * mult, maxCr: 0.25 }];
    },
  },
  "conjure-elemental": { type: /elemental/, label: "an elemental", concentration: true, options: (slot) => [{ count: 1, maxCr: 5 + Math.max(0, slot - 5) }] },
  "conjure-fey": { type: /fey|beast/, label: "a fey creature or beast", concentration: true, options: (slot) => [{ count: 1, maxCr: 6 + Math.max(0, slot - 6) }] },
  "conjure-celestial": { type: /celestial/, label: "a celestial", concentration: true, options: (slot) => [{ count: 1, maxCr: slot >= 9 ? 5 : 4 }] },
  // Animate Dead: one skeleton or zombie, two more for each slot level above 3rd (PHB p.212)
  "animate-dead": { type: /undead/, label: "skeletons or zombies", concentration: false, names: ["skeleton", "zombie"], options: (slot) => [{ count: 1 + 2 * Math.max(0, slot - 3), maxCr: 0.25 }] },
};

export const summonRule = (spellIndex: string) => SUMMON_RULES[spellIndex];

/** An error message when this choice is not allowed, otherwise null. */
export function checkSummon(spellIndex: string, slotLevel: number, creature: { index: string; name: string; type: string | null; challenge: string | null }, count: number): string | null {
  const rule = SUMMON_RULES[spellIndex];
  if (!rule) return "That spell does not summon creatures";
  if (!rule.type.test((creature.type ?? "").toLowerCase())) return `${rule.label.replace(/^an? /, "")} only: ${creature.name} is the wrong kind of creature`;
  if (rule.names && !rule.names.some((n) => creature.name.toLowerCase().includes(n))) return `Choose ${rule.label}`;
  const cr = parseChallenge(creature.challenge);
  const opts = rule.options(slotLevel);
  const fits = opts.some((o) => count === o.count && cr <= o.maxCr);
  if (fits) return null;
  const allowed = opts.map((o) => `${o.count} of CR ${o.maxCr < 1 ? (o.maxCr === 0.5 ? "1/2" : "1/4") : o.maxCr} or lower`).join(", or ");
  return `At this level you can summon ${allowed}`;
}

/** The longest list of allowed counts, for the interface. */
export const summonChoices = (spellIndex: string, slotLevel: number) => SUMMON_RULES[spellIndex]?.options(slotLevel) ?? [];

