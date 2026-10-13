import { rollD20, cryptoRng, type Rng } from "../dice";

export type Combatant = {
  id: string;
  name: string;
  dexModifier: number;
  initiative?: number;
  /** surprised creatures cannot move or act on their first turn, and cannot react until it ends */
  surprised?: boolean;
  /** monsters and PCs at 0 HP are skipped (dead) or still tracked (dying) */
  defeated?: boolean;
  /** bonus to the initiative check (e.g. Alert) and optional advantage */
  initiativeBonus?: number;
  initiativeAdvantage?: boolean;
};

/** Roll initiative for everyone without a value. Ties: higher Dex modifier, then original order (PHB p.189). */
export function rollInitiative(combatants: Combatant[], rng: Rng = cryptoRng): Combatant[] {
  const rolled = combatants.map((c, i) => {
    const initiative =
      c.initiative ??
      rollD20(c.dexModifier + (c.initiativeBonus ?? 0), c.initiativeAdvantage ? "advantage" : "normal", rng).total;
    return { c: { ...c, initiative }, i };
  });
  rolled.sort((a, b) => b.c.initiative! - a.c.initiative! || b.c.dexModifier - a.c.dexModifier || a.i - b.i);
  return rolled.map((r) => r.c);
}

export type TurnResources = {
  action: boolean;
  bonusAction: boolean;
  reaction: boolean;
  /** feet of movement remaining this turn */
  movement: number;
  /** one free object interaction per turn */
  objectInteraction: boolean;
  dodging: boolean;
  disengaged: boolean;
  /** set while surprised: cannot move, act or react */
  surprisedTurn: boolean;
};

export function startTurn(speed: number, surprised = false): TurnResources {
  return {
    action: !surprised,
    bonusAction: !surprised,
    // the reaction refreshes at the start of the creature's own turn; surprised creatures act normally from round 2
    reaction: !surprised,
    movement: surprised ? 0 : speed,
    objectInteraction: !surprised,
    dodging: false,
    disengaged: false,
    surprisedTurn: surprised,
  };
}

export type CombatState = {
  round: number;
  order: Combatant[];
  active: number;
  turn: TurnResources;
};

export function startCombat(order: Combatant[], speeds: Record<string, number>): CombatState {
  if (order.length === 0) throw new Error("Combat needs at least one combatant");
  const first = order.findIndex((c) => !c.defeated);
  if (first === -1) throw new Error("Everyone is defeated");
  return { round: 1, order, active: first, turn: startTurn(speeds[order[first].id] ?? 30, !!order[first].surprised) };
}

/** Advance to the next living combatant; a new round begins when the order wraps. Surprise ends after each creature's first turn. */
export function nextTurn(state: CombatState, speeds: Record<string, number>): CombatState {
  const order = state.order.map((c, i) => (i === state.active ? { ...c, surprised: false } : c));
  let active = state.active;
  let round = state.round;
  for (let step = 0; step < order.length; step++) {
    active = (active + 1) % order.length;
    if (active === 0) round++;
    if (!order[active].defeated) {
      return { round, order, active, turn: startTurn(speeds[order[active].id] ?? 30, !!order[active].surprised) };
    }
  }
  return state; // everyone defeated
}

export type TurnAction = "attack" | "cast" | "dash" | "disengage" | "dodge" | "help" | "hide" | "ready" | "search" | "use-object";

/** Spend the action for a standard action; Dash adds speed to movement, Dodge and Disengage set flags (PHB p.192). */
export function takeAction(turn: TurnResources, action: TurnAction, speed: number): TurnResources {
  if (!turn.action) throw new Error("No action left this turn");
  const t = { ...turn, action: false };
  if (action === "dash") t.movement += speed;
  if (action === "dodge") t.dodging = true;
  if (action === "disengage") t.disengaged = true;
  return t;
}

export function takeBonusAction(turn: TurnResources): TurnResources {
  if (!turn.bonusAction) throw new Error("No bonus action left this turn");
  return { ...turn, bonusAction: false };
}

export function takeReaction(turn: TurnResources): TurnResources {
  if (!turn.reaction) throw new Error("No reaction left this round");
  return { ...turn, reaction: false };
}

/** Free interaction (draw a weapon, open a door); a second one costs the Use an Object action. */
export function interactWithObject(turn: TurnResources): TurnResources {
  if (turn.objectInteraction) return { ...turn, objectInteraction: false };
  return takeAction(turn, "use-object", 0);
}

export function move(turn: TurnResources, feet: number): TurnResources {
  if (feet < 0) throw new RangeError("Cannot move a negative distance");
  if (feet > turn.movement) throw new Error(`Only ${turn.movement} ft of movement left`);
  return { ...turn, movement: turn.movement - feet };
}

/** Standing up from prone costs half your speed (PHB p.190). */
export function standUp(turn: TurnResources, speed: number): TurnResources {
  return move(turn, Math.floor(speed / 2));
}

/** Leaving an enemy's reach provokes an opportunity attack unless you Disengaged or were teleported/forced (PHB p.195). */
export function provokesOpportunityAttack(turn: TurnResources, leavesReach: boolean, voluntary = true): boolean {
  return leavesReach && voluntary && !turn.disengaged;
}
