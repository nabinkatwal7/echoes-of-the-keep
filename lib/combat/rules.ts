import { abilityModifier } from "@/engine/abilities";
import {
  coverBonus,
  nextTurn as engineNextTurn,
  offHandModifier,
  resolveAttack,
  resolveGrappleOrShove,
  rollDamage,
  startTurn,
  takeAction,
  takeBonusAction,
  takeReaction,
  type Cover,
  type MonsterAttack,
  type TurnResources,
} from "@/engine/combat";
import { underwaterAttack } from "@/engine/combat/environment";
import { rechargeRoll, resetLegendary, type LegendaryState, type RechargeAbility } from "@/engine/combat/special";
import { conditionSet, tickConditions, type ActiveCondition } from "@/engine/conditions/timers";
import { attackModifiers, cannotAct, effectiveSpeed } from "@/engine/conditions";
import { adjustDamage, applyDamage, deathSave, type DamageType, type Defenses, type Vitals } from "@/engine/damage";
import { parseDice, resolveRollMode, rollD20, cryptoRng, type Rng } from "@/engine/dice";

/** A weapon or monster attack in the form combat needs. */
export type AttackProfile = {
  name: string;
  toHit: number;
  /** damage dice without modifier, e.g. "1d8"; empty for flat damage (the modifier is the whole damage) */
  dice: string;
  /** flat modifier added to damage */
  modifier: number;
  damageType: DamageType | string;
  melee: boolean;
  /** melee reach in feet (default 5) */
  reach?: number;
  range?: { normal: number; long: number };
  /** ability modifier used, so off-hand attacks can drop it (PHB p.195) */
  abilityMod?: number;
  light?: boolean;
  finesse?: boolean;
  /** weapon name as sold, used for underwater rules */
  weapon?: string;
};

export type CombatDefenses = Defenses & {
  athletics?: number;
  acrobatics?: number;
  /** saving throw bonuses by ability; missing entries fall back to 0 (Dexterity to the dexterity modifier) */
  saves?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
};

/** A timed bonus from a spell or feature, tracked in rounds of the owner's turns. */
export type Buff = {
  id: string;
  label: string;
  rounds: number;
  /** who is concentrating on it, so ending concentration removes it */
  source?: string;
  acBonus?: number;
  /** added to speed in feet (before a multiplier) */
  speedBonus?: number;
  /** Haste doubles speed */
  speedMultiplier?: number;
  /** a die added to attack rolls (Bless) */
  attackDie?: number;
  /** a die added to saving throws (Bless) */
  saveDie?: number;
  /** advantage on Dexterity saves (Haste) */
  dexSaveAdvantage?: boolean;
  /** one extra action: a single weapon attack, Dash, Disengage, Hide, or Use an Object */
  haste?: boolean;
  /** when the buff ends, the creature cannot move or act on that turn */
  lethargy?: boolean;
};

/** The form a polymorphed creature returns to. Excess damage past 0 HP carries over. */
export type SavedForm = {
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  attacks: unknown;
  defenses: unknown;
  attacksPerAction?: number;
  size?: string;
};

export const acBonus = (c: Pick<Cmb, "buffs">) => (c.buffs ?? []).reduce((s, b) => s + (b.acBonus ?? 0), 0);
export const effectiveAc = (c: Pick<Cmb, "ac" | "buffs">) => c.ac + acBonus(c);

export type Cmb = {
  id: string;
  kind: "character" | "monster" | "npc";
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  speed: number;
  initiative: number | null;
  dexMod: number;
  conditions: ActiveCondition[];
  hidden: boolean;
  surprised: boolean;
  defeated: boolean;
  deathSaves: { successes: number; failures: number };
  turn: Turn;
  x: number | null;
  y: number | null;
  defenses: CombatDefenses;
  exhaustion?: number;
  /** attacks made by one Attack action (Extra Attack for characters, Multiattack for monsters); default 1 */
  attacksPerAction?: number;
  /** a stable (not dying) unconscious creature at 0 HP */
  stable?: boolean;
  concentrating?: string | null;
  buffs?: Buff[];
  /** summoned or controlled creatures fight on the party's side */
  ally?: boolean;
  /** original stats while polymorphed; cleared when the new form drops to 0 HP */
  polymorph?: SavedForm | null;
  recharge?: RechargeAbility[];
  legendary?: LegendaryState;
  mounted?: boolean;
  /** speed while mounted; the creature's own speed is kept for when they dismount */
  mountSpeed?: number;
};

export type Turn = TurnResources & {
  attacksRemaining?: number;
  helped?: boolean;
  /** a bonus-action spell was cast this turn: only cantrips may follow */
  bonusSpell?: boolean;
  /** a leveled action spell was cast this turn */
  leveledSpell?: boolean;
  /** Sneak Attack has been used this turn */
  sneakUsed?: boolean;
  /** Haste's extra action is still available */
  hasteAction?: boolean;
  /** already mounted or dismounted this turn */
  mountedThisTurn?: boolean;
};

export const emptyTurn = (speed = 30): Turn => startTurn(speed, false);

/** Speed for this turn: a mount replaces it, then buffs add or multiply (Haste doubles). */
export function movementSpeed(c: Pick<Cmb, "speed" | "mounted" | "mountSpeed" | "buffs">): number {
  const base = c.mounted ? (c.mountSpeed ?? c.speed) : c.speed;
  const buffs = c.buffs ?? [];
  const flat = buffs.reduce((s, b) => s + (b.speedBonus ?? 0), 0);
  const mult = buffs.reduce((m, b) => m * (b.speedMultiplier ?? 1), 1);
  return base * mult + flat;
}

/** Monsters and NPCs die at 0 HP; player characters fall unconscious and make death saves. */
export const diesAtZero = (c: Pick<Cmb, "kind">) => c.kind !== "character";

export const toVitals = (c: Cmb): Vitals => ({
  hp: c.hp, maxHp: c.maxHp, tempHp: c.tempHp,
  dying: c.kind === "character" && c.hp === 0 && !c.defeated && !c.stable,
  stable: !!c.stable,
  dead: c.defeated,
  deathSaves: c.deathSaves,
});

export function fromVitals(c: Cmb, v: Vitals): Cmb {
  return { ...c, hp: v.hp, tempHp: v.tempHp, deathSaves: v.deathSaves, defeated: v.dead, stable: v.stable };
}

// ---------------------------------------------------------------------------------------------- turns

export type Line = string;

/** Begin a creature's turn: start-of-turn timers, then fresh action economy limited by conditions (App. A). */
export function beginTurn(c: Cmb, rng: Rng = cryptoRng): { cmb: Cmb; lines: Line[] } {
  const lines: Line[] = [];
  let cmb = c;
  const tick = tickConditions(c.conditions, "start");
  cmb = { ...cmb, conditions: tick.remaining };
  for (const e of tick.expired) lines.push(`${c.name} is no longer ${e.condition}`);
  let lethargy = false;
  if (cmb.buffs?.length) {
    const aged = cmb.buffs.map((b) => ({ ...b, rounds: b.rounds - 1 }));
    for (const b of aged.filter((x) => x.rounds <= 0)) {
      lines.push(`${b.label} fades from ${c.name}`);
      if (b.lethargy) lethargy = true;
    }
    cmb = { ...cmb, buffs: aged.filter((x) => x.rounds > 0) };
  }
  if (cmb.recharge?.some((a) => !a.ready)) {
    const d6 = () => Math.floor(rng() * 6) + 1;
    const rolled = rechargeRoll(cmb.recharge, d6);
    cmb = { ...cmb, recharge: rolled.abilities };
    for (const line of rolled.lines) lines.push(`${c.name}: ${line}`);
  }
  if (cmb.legendary) cmb = { ...cmb, legendary: resetLegendary(cmb.legendary) };

  // a dying character makes a death saving throw at the start of each turn (PHB p.197)
  if (cmb.kind === "character" && cmb.hp === 0 && !cmb.defeated && !cmb.stable) {
    const natural = rollD20(0, "normal", rng).natural;
    const v = deathSave(toVitals(cmb), natural);
    cmb = fromVitals(cmb, v);
    lines.push(`${c.name} rolls a ${natural} on a death save (${v.dead ? "dies" : v.hp > 0 ? "regains 1 HP" : v.stable ? "stabilizes" : `${v.deathSaves.successes} successes, ${v.deathSaves.failures} failures`})`);
  }

  const set = conditionSet(cmb.conditions);
  const speed = effectiveSpeed(movementSpeed(cmb), set, cmb.exhaustion ?? 0);
  const fresh = startTurn(speed, cmb.surprised);
  const stopped = cannotAct(set) || cmb.defeated || (cmb.kind === "character" && cmb.hp === 0) || lethargy;
  const turn: Turn = stopped
    ? { ...fresh, action: false, bonusAction: false, reaction: lethargy && !cmb.defeated && !cannotAct(set) ? fresh.reaction : false, movement: cmb.defeated || lethargy ? 0 : fresh.movement }
    : fresh;
  if (lethargy) lines.push(`${c.name} is lethargic and cannot move or take actions`);
  else if ((cmb.buffs ?? []).some((b) => b.haste)) turn.hasteAction = true;
  if (stopped && !cmb.defeated && !lethargy) lines.push(`${c.name} cannot act this turn`);
  return { cmb: { ...cmb, turn }, lines };
}

/** End a creature's turn: end-of-turn timers; a surprised creature is no longer surprised. */
export function finishTurn(c: Cmb): { cmb: Cmb; lines: Line[] } {
  const tick = tickConditions(c.conditions, "end");
  return {
    cmb: { ...c, conditions: tick.remaining, surprised: false },
    lines: tick.expired.map((e) => `${c.name} is no longer ${e.condition}`),
  };
}

export type Order = { id: string; defeated: boolean }[];

/** Who acts next and whether the round counter advances. Defeated creatures are skipped. */
export function advance(order: Order, activeIndex: number, round: number): { activeIndex: number; round: number } {
  const state = engineNextTurn(
    {
      round,
      active: activeIndex,
      order: order.map((o) => ({ id: o.id, name: o.id, dexModifier: 0, defeated: o.defeated })),
      turn: startTurn(30),
    },
    {},
  );
  return { activeIndex: state.active, round: state.round };
}

// ---------------------------------------------------------------------------------------------- actions

export type SimpleAction = "dash" | "disengage" | "dodge" | "help" | "hide" | "search" | "use-object" | "ready";

const HASTE_ACTIONS: SimpleAction[] = ["dash", "disengage", "hide", "use-object"];

export function spendSimpleAction(c: Cmb, action: SimpleAction): { cmb: Cmb; line: Line } {
  if (cannotAct(conditionSet(c.conditions))) throw new Error(`${c.name} cannot take actions`);
  if (!c.turn.action && c.turn.hasteAction && HASTE_ACTIONS.includes(action)) {
    const turn: Turn = { ...c.turn, hasteAction: false };
    if (action === "dash") turn.movement += movementSpeed(c);
    if (action === "disengage") turn.disengaged = true;
    const verb: Record<string, string> = { dash: "dash", disengage: "disengage", hide: "hide", "use-object": "use an object" };
    return { cmb: { ...c, turn }, line: `${c.name} uses Haste to ${verb[action]}` };
  }
  const turn = takeAction(c.turn, action === "ready" ? "ready" : action === "use-object" ? "use-object" : action, movementSpeed(c));
  const verb: Record<SimpleAction, string> = {
    dash: "dashes (movement doubled)",
    disengage: "disengages",
    dodge: "takes the Dodge action",
    help: "helps an ally",
    hide: "tries to hide",
    search: "searches",
    "use-object": "uses an object",
    ready: "readies an action",
  };
  return { cmb: { ...c, turn: { ...turn } }, line: `${c.name} ${verb[action]}` };
}

export const spendBonus = (c: Cmb): Cmb => ({ ...c, turn: takeBonusAction(c.turn) });
export const spendReaction = (c: Cmb): Cmb => ({ ...c, turn: takeReaction(c.turn) });

// ---------------------------------------------------------------------------------------------- attacks

export type AttackContext = {
  cover?: Cover;
  withinFiveFeet?: boolean;
  underwater?: boolean;
  /** distance to the target in feet, for range and long-range checks */
  distanceFeet?: number;
  /** extra advantage or disadvantage sources the DM adds (flanking, Reckless Attack, ...) */
  extraAdvantage?: number;
  extraDisadvantage?: number;
  offHand?: boolean;
  /** opportunity attack: uses the reaction instead of an action */
  reaction?: boolean;
  /** the caller has already paid for this attack (a spell, a smite, a further ray) */
  skipEconomy?: boolean;
  /** extra damage dice added on a hit and doubled on a crit, e.g. Sneak Attack "3d6" or Divine Smite "2d8" */
  bonusDamage?: { dice: string; type?: string; label?: string }[];
};

export type AttackOutcome = {
  attacker: Cmb;
  target: Cmb;
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  roll: number;
  natural: number;
  mode: string;
  damage: number;
  lines: Line[];
  /** the target dropped to 0 HP */
  dropped: boolean;
  /** DC for a Constitution save if the target was concentrating */
  concentrationDc: number | null;
};

/** Split "1d8+3" into dice and modifier. */
export function splitDamage(expr: string): { dice: string; modifier: number } {
  const p = parseDice(expr);
  const dice = p.terms.map((t) => `${t.sign < 0 ? "-" : ""}${t.count}d${t.sides}`).join("+").replace(/\+-/g, "-");
  return { dice: dice || "0", modifier: p.modifier };
}

/** Apply damage, including a polymorphed form breaking and spilling the excess onto the original. */
export function absorbDamage(target: Cmb, amount: number, opts: { critical?: boolean } = {}): { cmb: Cmb; dropped: boolean; lines: Line[] } {
  const before = toVitals(target);
  const form = target.polymorph;
  const after = applyDamage(before, amount, { critical: opts.critical, diesAtZero: form ? false : diesAtZero(target) });
  const lines: Line[] = [];
  const formDropped = before.hp > 0 && after.hp === 0;
  if (form && formDropped) {
    const overflow = Math.max(0, amount - before.tempHp - before.hp);
    const restored: Cmb = {
      ...target,
      name: form.name,
      ac: form.ac,
      hp: form.hp,
      maxHp: form.maxHp,
      speed: form.speed,
      tempHp: 0,
      attacksPerAction: form.attacksPerAction,
      polymorph: null,
      defeated: false,
      stable: false,
      defenses: form.defenses && typeof form.defenses === "object" ? (form.defenses as CombatDefenses) : target.defenses,
    };
    const carried = overflow > 0 ? applyDamage(toVitals(restored), overflow, { diesAtZero: diesAtZero(restored) }) : toVitals(restored);
    lines.push(`${target.name} reverts to ${form.name}${overflow ? `; ${overflow} damage carries over` : ""}`);
    if (form.hp > 0 && carried.hp === 0) lines.push(carried.dead ? `${form.name} is slain` : `${form.name} falls unconscious`);
    return { cmb: fromVitals(restored, carried), dropped: form.hp > 0 && carried.hp === 0, lines };
  }
  if (formDropped) lines.push(after.dead ? `${target.name} is slain` : `${target.name} falls unconscious`);
  else if (before.hp === 0 && after.deathSaves.failures > before.deathSaves.failures) lines.push(`${target.name} suffers a death save failure${after.dead ? " and dies" : ""}`);
  return { cmb: fromVitals(target, after), dropped: formDropped, lines };
}

/** Resolve one attack from start to finish: economy, advantage sources, the roll, damage, resistances and dropping to 0. */
export function resolveAttackAction(attacker: Cmb, target: Cmb, profile: AttackProfile, ctx: AttackContext = {}, rng: Rng = cryptoRng): AttackOutcome {
  if (attacker.defeated) throw new Error(`${attacker.name} is defeated`);
  const aSet = conditionSet(attacker.conditions);
  if (cannotAct(aSet)) throw new Error(`${attacker.name} cannot take actions`);

  // spend the right resource
  let turn: Turn = { ...attacker.turn };
  if (ctx.skipEconomy) {
    // already paid for
  } else if (ctx.reaction) turn = takeReaction(turn);
  else if (ctx.offHand) turn = takeBonusAction(turn);
  else if (!turn.action && turn.hasteAction) turn = { ...turn, hasteAction: false, attacksRemaining: 0 };
  else if ((turn.attacksRemaining ?? 0) > 0) turn = { ...turn, attacksRemaining: (turn.attacksRemaining ?? 0) - 1 };
  else {
    // the first attack spends the action; Extra Attack and Multiattack give the rest for free
    turn = takeAction(turn, "attack", attacker.speed);
    turn = { ...turn, attacksRemaining: Math.max(0, (attacker.attacksPerAction ?? 1) - 1) };
  }
  const lines: Line[] = [];

  // sources of advantage and disadvantage
  const adjacent = ctx.withinFiveFeet ?? true;
  const mods = attackModifiers({ attacker: aSet, target: conditionSet(target.conditions), withinFiveFeet: adjacent, attackerExhaustion: attacker.exhaustion });
  const advantage = mods.advantage + (ctx.extraAdvantage ?? 0) + (attacker.turn.helped ? 1 : 0);
  let disadvantage = mods.disadvantage + (ctx.extraDisadvantage ?? 0);
  if (target.turn.dodging && !aSet.has("blinded")) disadvantage += 1;
  let autoMiss = false;
  if (profile.melee && adjacent === false && (profile.reach ?? 5) <= 5) lines.push(`${target.name} is out of ${attacker.name}'s reach`);
  if (!profile.melee) {
    if (adjacent) disadvantage += 1; // ranged attack with a hostile within 5 ft
    const range = profile.range;
    if (range && ctx.distanceFeet !== undefined) {
      if (ctx.distanceFeet > range.long) autoMiss = true;
      else if (ctx.distanceFeet > range.normal) disadvantage += 1;
    }
  }
  if (ctx.underwater) {
    const u = underwaterAttack({ melee: profile.melee, weaponName: profile.weapon ?? profile.name, beyondNormalRange: !!profile.range && (ctx.distanceFeet ?? 0) > profile.range.normal });
    if (u.disadvantage) disadvantage += 1;
    if (u.autoMiss) autoMiss = true;
  }
  if (autoMiss) lines.push("The target is out of range");
  const mode = resolveRollMode({ advantage, disadvantage });

  const cover = ctx.cover ?? "none";
  // Bless and similar: a die added to the attack roll
  const dieBonus = (attacker.buffs ?? []).reduce((sum, b) => sum + (b.attackDie ? Math.floor(rng() * b.attackDie) + 1 : 0), 0);
  const toHit = profile.toHit + dieBonus;
  const out = autoMiss
    ? { roll: rollD20(toHit, "normal", rng), effectiveAc: effectiveAc(target) + coverBonus(cover), hit: false, critical: false, fumble: false }
    : resolveAttack({ attackBonus: toHit, targetAc: effectiveAc(target), cover, mode, autoCrit: mods.autoCrit && adjacent, rng });
  const hit = out.hit && !autoMiss;

  let damage = 0;
  let t = target;
  let dropped = false;
  let concentrationDc: number | null = null;
  const verb = `${attacker.name} attacks ${target.name} with ${profile.name}`;
  const rollText = `${out.roll.natural}${toHit >= 0 ? "+" : ""}${toHit} = ${out.roll.total} vs AC ${out.effectiveAc}${mode !== "normal" ? ` (${mode})` : ""}`;

  if (!hit) {
    lines.push(`${verb}: ${out.fumble ? "natural 1, " : ""}miss (${rollText})`);
  } else {
    const modifier = ctx.offHand ? offHandModifier(profile.modifier, false) : profile.modifier;
    const dmg = profile.dice ? rollDamage(profile.dice, modifier, { critical: out.critical, rng }) : { total: Math.max(0, modifier), critical: out.critical, dice: String(modifier) };
    let adjusted = adjustDamage(dmg.total, profile.damageType as DamageType, target.defenses);
    let bonusText = "";
    for (const extra of ctx.bonusDamage ?? []) {
      const bonus = rollDamage(extra.dice, 0, { critical: out.critical, rng });
      const bonusType = (extra.type ?? profile.damageType) as DamageType;
      const bonusAdjusted = adjustDamage(bonus.total, bonusType, target.defenses);
      adjusted += bonusAdjusted;
      bonusText += ` including ${bonusAdjusted} ${bonusType} from ${extra.label ?? extra.dice}`;
    }
    if (ctx.underwater && profile.damageType === "fire") adjusted = Math.floor(adjusted / 2);
    const absorbed = absorbDamage(target, adjusted, { critical: out.critical });
    t = absorbed.cmb;
    damage = adjusted;
    dropped = absorbed.dropped;
    const resisted = adjusted !== dmg.total ? ` (${dmg.total} before resistances)` : "";
    lines.push(`${verb}: ${out.critical ? "CRITICAL HIT" : "hit"} (${rollText}) for ${adjusted} ${profile.damageType} damage${bonusText}${resisted}`);
    lines.push(...absorbed.lines);
    if (target.concentrating && !dropped && t.hp > 0) concentrationDc = Math.max(10, Math.floor(adjusted / 2));
    if (target.concentrating && (dropped || t.hp === 0)) lines.push(`${t.name} loses concentration`);
  }
  return {
    attacker: { ...attacker, turn }, target: t, hit, critical: out.critical, fumble: out.fumble,
    roll: out.roll.total, natural: out.roll.natural, mode, damage, lines, dropped, concentrationDc,
  };
}

// ---------------------------------------------------------------------------------------------- grapple and shove

export type GrappleOutcome = { attacker: Cmb; target: Cmb; success: boolean; line: Line };

export function resolveGrappleAction(
  attacker: Cmb,
  target: Cmb,
  kind: "grapple" | "shove-prone" | "shove-push",
  sizes: { attacker: string; target: string },
  rng: Rng = cryptoRng,
): GrappleOutcome {
  const order = ["tiny", "small", "medium", "large", "huge", "gargantuan"];
  if (order.indexOf(sizes.target.toLowerCase()) > order.indexOf(sizes.attacker.toLowerCase()) + 1) throw new Error("The target is too large");
  if (cannotAct(conditionSet(attacker.conditions))) throw new Error(`${attacker.name} cannot take actions`);
  const turn = (attacker.turn.attacksRemaining ?? 0) > 0 ? { ...attacker.turn, attacksRemaining: (attacker.turn.attacksRemaining ?? 0) - 1 } : takeAction(attacker.turn, "attack", attacker.speed);
  const contest = resolveGrappleOrShove(
    { athletics: attacker.defenses.athletics ?? 0 },
    { athletics: target.defenses.athletics ?? 0, acrobatics: target.defenses.acrobatics ?? target.dexMod },
    rng,
  );
  let t = target;
  let line = `${attacker.name} tries to ${kind === "grapple" ? "grapple" : "shove"} ${target.name} (${contest.attackerTotal} vs ${contest.defenderTotal}): `;
  if (!contest.attackerWins) {
    line += "fails";
  } else if (kind === "grapple") {
    t = { ...target, conditions: [...target.conditions.filter((c) => !(c.condition === "grappled" && c.source === attacker.id)), { condition: "grappled", source: attacker.id }] };
    line += `${target.name} is grappled`;
  } else if (kind === "shove-prone") {
    t = { ...target, conditions: [...target.conditions.filter((c) => c.condition !== "prone"), { condition: "prone" }] };
    line += `${target.name} is knocked prone`;
  } else {
    line += `${target.name} is pushed 5 feet away`;
  }
  return { attacker: { ...attacker, turn }, target: t, success: contest.attackerWins, line };
}

// ---------------------------------------------------------------------------------------------- building combatants

/** Make a monster's parsed attacks into attack profiles. */
export function monsterProfiles(attacks: MonsterAttack[]): AttackProfile[] {
  return attacks.map((a) => {
    const { dice, modifier } = a.flat ? { dice: "", modifier: Number(a.damage) } : splitDamage(a.damage);
    return {
      name: a.name, toHit: a.toHit, dice, modifier,
      damageType: a.damageType, melee: a.melee, reach: a.reach, range: a.range,
    };
  });
}

export const modOf = (score: number) => abilityModifier(score);
