import type { Combatant, Encounter } from "@prisma/client";
import { healthWord } from "@/engine/combat";
import { effectiveAc } from "./rules";
import { rowToCmb, profilesOf, sideOf } from "./store";

export type CombatantView = {
  id: string;
  kind: string;
  name: string;
  initiative: number | null;
  active: boolean;
  /** exact numbers for the DM and for the player's own party; health words for monsters shown to players */
  hp: number | null;
  maxHp: number | null;
  tempHp: number;
  health: string;
  ac: number | null;
  conditions: { condition: string; rounds?: number }[];
  buffs: { label: string; rounds: number }[];
  defeated: boolean;
  concentrating: string | null;
  hidden: boolean;
  surprised: boolean;
  x: number | null;
  y: number | null;
  /** characters controlled by this viewer */
  mine: boolean;
  /** present only for combatants the viewer may act for */
  turn: { action: boolean; bonusAction: boolean; reaction: boolean; movement: number; dodging: boolean; disengaged: boolean; attacksRemaining: number } | null;
  attacks: { name: string; melee: boolean; light?: boolean }[];
  readied: string | null;
  deathSaves: { successes: number; failures: number } | null;
};

export type EncounterView = {
  id: string;
  name: string;
  state: string;
  round: number;
  activeIndex: number;
  gridWidth: number;
  gridHeight: number;
  environment: { underwater?: boolean };
  combatants: CombatantView[];
  isDm: boolean;
};

/**
 * What a viewer is allowed to see. Players never receive monster hit points, armor class, hidden creatures or their
 * attack lists; the DM sees everything. This filtering happens on the server, before anything is sent.
 */
export function buildEncounterView(
  enc: Encounter & { combatants: Combatant[] },
  viewer: { userId: string; isDm: boolean },
  ownedCharacterIds: ReadonlySet<string>,
): EncounterView {
  const visible = enc.combatants.filter((r) => viewer.isDm || !r.hidden);
  const combatants = visible.map((r, i) => {
    const c = rowToCmb(r);
    const mine = !!r.characterId && ownedCharacterIds.has(r.characterId);
    const isParty = sideOf(r) === "party";
    const exact = viewer.isDm || isParty;
    const canAct = viewer.isDm || mine;
    return {
      id: r.id,
      kind: r.kind,
      name: r.name,
      initiative: r.initiative,
      active: enc.state === "ACTIVE" && enc.combatants[enc.activeIndex]?.id === r.id,
      hp: exact ? r.hp : null,
      maxHp: exact ? r.maxHp : null,
      tempHp: exact ? r.tempHp : 0,
      health: healthWord(r.hp, r.maxHp, r.defeated),
      ac: viewer.isDm || mine ? effectiveAc(c) : null,
      conditions: c.conditions.map((x) => ({ condition: x.condition, rounds: x.rounds })),
      buffs: (c.buffs ?? []).map((b) => ({ label: b.label, rounds: b.rounds })),
      concentrating: c.concentrating ?? null,
      defeated: r.defeated,
      hidden: r.hidden,
      surprised: r.surprised,
      x: r.x,
      y: r.y,
      mine,
      turn: canAct
        ? { action: c.turn.action, bonusAction: c.turn.bonusAction, reaction: c.turn.reaction, movement: c.turn.movement, dodging: c.turn.dodging, disengaged: c.turn.disengaged, attacksRemaining: c.turn.attacksRemaining ?? 0 }
        : null,
      attacks: canAct ? profilesOf(r).map((a) => ({ name: a.name, melee: a.melee, light: a.light })) : [],
      readied: canAct ? r.readied : null,
      deathSaves: exact && r.kind === "character" ? c.deathSaves : null,
      _order: i,
    };
  });
  return {
    id: enc.id,
    name: enc.name,
    state: enc.state,
    round: enc.round,
    activeIndex: enc.activeIndex,
    gridWidth: enc.gridWidth,
    gridHeight: enc.gridHeight,
    environment: (enc.environment ?? {}) as { underwater?: boolean },
    combatants: combatants.map(({ _order, ...rest }) => (void _order, rest)),
    isDm: viewer.isDm,
  };
}
