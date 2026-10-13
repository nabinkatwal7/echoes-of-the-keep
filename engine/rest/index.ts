import { abilityModifier } from "../abilities";

export type Recharge = "short" | "long" | "dawn" | "none";

export type Resource = {
  key: string;
  max: number;
  used: number;
  recharge: Recharge;
};

export type RestState = {
  hp: number;
  maxHp: number;
  tempHp: number;
  /** keyed by die size (8 = d8): total dice and how many are spent */
  hitDice: Record<number, { total: number; spent: number }>;
  resources: Resource[];
  /** expended spell slots indexed by spell level 1-9 (index 0 = 1st level) */
  spellSlotsUsed: number[];
  pactSlotsUsed: number;
  exhaustion: number;
};

export type HitDieSpend = {
  die: number;
  count: number;
  /** rolled values; omit to use the average */ rolls?: number[];
};

const average = (die: number) => Math.floor(die / 2) + 1;

/** Short rest (PHB p.186): spend hit dice to heal; short-rest resources and Pact Magic slots recharge. */
export function shortRest(
  state: RestState,
  conScore: number,
  spend: HitDieSpend[] = [],
): { state: RestState; healed: number } {
  const hitDice = structuredClone(state.hitDice);
  let healed = 0;
  for (const s of spend) {
    const pool = hitDice[s.die];
    if (!pool || pool.total - pool.spent < s.count)
      throw new Error(`Not enough d${s.die} hit dice`);
    if (s.rolls && s.rolls.length !== s.count)
      throw new Error("Provide one roll per hit die spent");
    for (let i = 0; i < s.count; i++) {
      const roll = s.rolls?.[i] ?? average(s.die);
      if (roll < 1 || roll > s.die)
        throw new RangeError(`Roll must be 1-${s.die}`);
      healed += Math.max(0, roll + abilityModifier(conScore));
    }
    pool.spent += s.count;
  }
  const hp = Math.min(state.maxHp, state.hp + healed);
  return {
    healed: hp - state.hp,
    state: {
      ...state,
      hp,
      hitDice,
      pactSlotsUsed: 0,
      resources: state.resources.map((r) =>
        r.recharge === "short" ? { ...r, used: 0 } : r,
      ),
    },
  };
}

export const HOURS_BETWEEN_LONG_RESTS = 24;

/** A character can benefit from only one long rest in 24 hours (PHB p.186). */
export function canLongRest(now: Date, lastLongRest?: Date): boolean {
  return (
    !lastLongRest ||
    now.getTime() - lastLongRest.getTime() >=
      HOURS_BETWEEN_LONG_RESTS * 3600_000
  );
}

/** Long rest: full HP, half of total hit dice back (min 1), all slots and resources, exhaustion -1. */
export function longRest(state: RestState): RestState {
  const totalDice = Object.values(state.hitDice).reduce(
    (s, d) => s + d.total,
    0,
  );
  let toRecover = Math.max(1, Math.floor(totalDice / 2));
  const hitDice = structuredClone(state.hitDice);
  // recover the largest dice first
  for (const die of Object.keys(hitDice)
    .map(Number)
    .sort((a, b) => b - a)) {
    const back = Math.min(toRecover, hitDice[die].spent);
    hitDice[die].spent -= back;
    toRecover -= back;
  }
  return {
    ...state,
    hp: state.maxHp,
    hitDice,
    spellSlotsUsed: state.spellSlotsUsed.map(() => 0),
    pactSlotsUsed: 0,
    exhaustion: Math.max(0, state.exhaustion - 1),
    resources: state.resources.map((r) =>
      r.recharge === "none" ? r : { ...r, used: 0 },
    ),
  };
}

/** Features that recharge at dawn (e.g. some magic items) reset when dawn passes. */
export function dawn(state: RestState): RestState {
  return {
    ...state,
    resources: state.resources.map((r) =>
      r.recharge === "dawn" ? { ...r, used: 0 } : r,
    ),
  };
}

export function spendResource(
  state: RestState,
  key: string,
  amount = 1,
): RestState {
  const r = state.resources.find((x) => x.key === key);
  if (!r) throw new Error(`Unknown resource: ${key}`);
  if (r.used + amount > r.max) throw new Error(`${key} has no uses left`);
  return {
    ...state,
    resources: state.resources.map((x) =>
      x === r ? { ...x, used: x.used + amount } : x,
    ),
  };
}
