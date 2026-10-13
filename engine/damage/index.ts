export const DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export type Defenses = {
  resistances?: readonly DamageType[];
  vulnerabilities?: readonly DamageType[];
  immunities?: readonly DamageType[];
  /** e.g. petrified: resist everything */
  resistAll?: boolean;
};

/**
 * Resistance halves (rounded down), vulnerability doubles; each applies once, resistance first (PHB p.197).
 * Immunity ignores the damage entirely.
 */
export function adjustDamage(
  amount: number,
  type: DamageType,
  d: Defenses = {},
): number {
  if (d.immunities?.includes(type)) return 0;
  let n = amount;
  if (d.resistAll || d.resistances?.includes(type)) n = Math.floor(n / 2);
  if (d.vulnerabilities?.includes(type)) n *= 2;
  return n;
}

export type DeathSaves = { successes: number; failures: number };

export type Vitals = {
  hp: number;
  maxHp: number;
  tempHp: number;
  /** unconscious at 0 HP and making death saves */
  dying: boolean;
  /** unconscious at 0 HP but no longer making saves */
  stable: boolean;
  dead: boolean;
  deathSaves: DeathSaves;
};

export const newVitals = (maxHp: number): Vitals => ({
  hp: maxHp,
  maxHp,
  tempHp: 0,
  dying: false,
  stable: false,
  dead: false,
  deathSaves: { successes: 0, failures: 0 },
});

export type DamageOptions = {
  /** a critical hit against a creature at 0 HP counts as two failed death saves */
  critical?: boolean;
  /** knock out instead of killing (PHB p.198) */
  nonlethal?: boolean;
  /** monsters and most NPCs die at 0 HP instead of making death saves */
  diesAtZero?: boolean;
};

/** Apply already-adjusted damage: temp HP first, then HP; handles dropping to 0, instant death and death saves. */
export function applyDamage(
  v: Vitals,
  amount: number,
  opts: DamageOptions = {},
): Vitals {
  if (v.dead || amount <= 0) return v;
  const absorbed = Math.min(v.tempHp, amount);
  const tempHp = v.tempHp - absorbed;
  const remaining = amount - absorbed;
  if (remaining === 0) return { ...v, tempHp };

  if (v.hp > 0) {
    const overflow = remaining - v.hp;
    if (remaining < v.hp) return { ...v, tempHp, hp: v.hp - remaining };
    // dropped to 0 HP: massive damage kills outright
    if (overflow >= v.maxHp || opts.diesAtZero)
      return { ...v, tempHp, hp: 0, dead: true, dying: false };
    if (opts.nonlethal)
      return { ...v, tempHp, hp: 0, stable: true, dying: false };
    return {
      ...v,
      tempHp,
      hp: 0,
      dying: true,
      stable: false,
      deathSaves: { successes: 0, failures: 0 },
    };
  }

  // already at 0 HP: damage causes a death save failure (two on a crit); stable creatures start dying again
  if (remaining >= v.maxHp)
    return { ...v, tempHp, dead: true, dying: false, stable: false };
  if (opts.nonlethal) return { ...v, tempHp };
  const failures = v.deathSaves.failures + (opts.critical ? 2 : 1);
  return {
    ...v,
    tempHp,
    stable: false,
    dying: failures < 3,
    dead: failures >= 3,
    deathSaves: { ...v.deathSaves, failures: Math.min(3, failures) },
  };
}

/** Healing cannot exceed max HP. Any healing wakes a creature at 0 HP and clears death saves. */
export function heal(v: Vitals, amount: number): Vitals {
  if (v.dead || amount <= 0) return v;
  const hp = Math.min(v.maxHp, v.hp + amount);
  const wasDown = v.hp === 0;
  return {
    ...v,
    hp,
    dying: wasDown ? false : v.dying,
    stable: wasDown ? false : v.stable,
    deathSaves: wasDown ? { successes: 0, failures: 0 } : v.deathSaves,
  };
}

/** Temporary HP do not stack: keep the larger of the old and new pool (PHB p.198). */
export const gainTempHp = (v: Vitals, amount: number): Vitals => ({
  ...v,
  tempHp: Math.max(v.tempHp, amount),
});

/** Roll a death saving throw (PHB p.197). `natural` is the d20 result. */
export function deathSave(v: Vitals, natural: number): Vitals {
  if (!v.dying || v.dead) return v;
  if (natural === 20) {
    return {
      ...v,
      hp: 1,
      dying: false,
      stable: false,
      deathSaves: { successes: 0, failures: 0 },
    };
  }
  let { successes, failures } = v.deathSaves;
  if (natural === 1) failures += 2;
  else if (natural >= 10) successes += 1;
  else failures += 1;
  successes = Math.min(3, successes);
  failures = Math.min(3, failures);
  if (failures >= 3)
    return {
      ...v,
      dying: false,
      dead: true,
      deathSaves: { successes, failures },
    };
  if (successes >= 3)
    return {
      ...v,
      dying: false,
      stable: true,
      deathSaves: { successes: 0, failures: 0 },
    };
  return { ...v, deathSaves: { successes, failures } };
}

/** A successful Wisdom (Medicine) DC 10 check or Spare the Dying stabilizes a dying creature. */
export function stabilize(v: Vitals): Vitals {
  if (!v.dying) return v;
  return {
    ...v,
    dying: false,
    stable: true,
    deathSaves: { successes: 0, failures: 0 },
  };
}

/** Convenience: resolve typed damage against defenses, then apply it. */
export function takeDamage(
  v: Vitals,
  amount: number,
  type: DamageType,
  defenses: Defenses = {},
  opts: DamageOptions = {},
) {
  return applyDamage(v, adjustDamage(amount, type, defenses), opts);
}
