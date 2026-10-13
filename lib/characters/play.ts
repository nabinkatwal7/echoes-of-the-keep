import { deriveCharacter } from "@/engine/character";
import { classResources, type ClassResource } from "@/engine/classes/resources";
import type { AbilityScores } from "@/engine/abilities";
import { pactMagic, spellSlots, type ClassLevel } from "@/engine/progression";
import type { RestState } from "@/engine/rest";
import { toEngineInput, type StoredCharacter } from "./derive";

/** Stored fields that change during play (a subset of the Prisma Character row). */
export type StoredPlay = StoredCharacter & {
  currentHp: number;
  tempHp: number;
  hitDiceSpent: unknown;
  /** { [resourceKey]: usesSpent, _lastLongRest?: ISO date } */
  resources: unknown;
  /** expended slots by spell level, index 0 = 1st */
  spellSlotsUsed: unknown;
  exhaustion: number;
};

export const PACT_KEY = "pact-slots";

const usedMap = (c: StoredPlay): Record<string, number | string> =>
  c.resources && typeof c.resources === "object" && !Array.isArray(c.resources) ? (c.resources as Record<string, number | string>) : {};

const finalScores = (c: StoredPlay): AbilityScores => {
  const input = toEngineInput(c);
  const out = { ...input.baseScores };
  for (const k of Object.keys(out) as (keyof AbilityScores)[]) out[k] += input.scoreBonuses?.[k] ?? 0;
  return out;
};

export type ResourceView = ClassResource & { used: number };

/** Class features with limited uses, with how many are spent. */
export function resourceViews(c: StoredPlay): ResourceView[] {
  const used = usedMap(c);
  return classResources(c.classes as ClassLevel[], finalScores(c)).map((r) => ({ ...r, used: Math.min(r.max, Number(used[r.key] ?? 0)) }));
}

export type SlotView = { level: number; total: number; used: number };

export function slotViews(c: StoredPlay): { slots: SlotView[]; pact: { slots: number; slotLevel: number; used: number } | null } {
  const classes = c.classes as ClassLevel[];
  const total = spellSlots(classes);
  const spent = (Array.isArray(c.spellSlotsUsed) ? c.spellSlotsUsed : []) as number[];
  const warlock = classes.find((k) => k.classIndex === "warlock");
  const pact = warlock ? pactMagic(warlock.level) : null;
  return {
    slots: total.map((t, i) => ({ level: i + 1, total: t, used: Math.min(t, spent[i] ?? 0) })),
    pact: pact ? { ...pact, used: Math.min(pact.slots, Number(usedMap(c)[PACT_KEY] ?? 0)) } : null,
  };
}

export function toRestState(c: StoredPlay): RestState {
  const resources = resourceViews(c).map((r) => ({ key: r.key, max: r.max, used: r.used, recharge: r.recharge }));
  const { pact } = slotViews(c);
  if (pact) resources.push({ key: PACT_KEY, max: pact.slots, used: pact.used, recharge: "short" });
  const slots = slotViews(c).slots;
  return {
    hp: c.currentHp,
    maxHp: deriveCharacter(toEngineInput(c)).maxHp,
    tempHp: c.tempHp,
    hitDice: (c.hitDiceSpent ?? {}) as RestState["hitDice"],
    resources,
    spellSlotsUsed: slots.map((s) => s.used),
    pactSlotsUsed: pact?.used ?? 0,
    exhaustion: c.exhaustion,
  };
}

/** Database fields to write back after a rest or resource change. */
export function fromRestState(rs: RestState, prev: StoredPlay) {
  const map: Record<string, number | string> = { ...usedMap(prev) };
  for (const r of rs.resources) map[r.key] = r.used;
  return {
    currentHp: rs.hp,
    hitDiceSpent: rs.hitDice as unknown as object,
    resources: map as unknown as object,
    spellSlotsUsed: rs.spellSlotsUsed,
    exhaustion: rs.exhaustion,
  };
}

export const lastLongRest = (c: StoredPlay): Date | undefined => {
  const v = usedMap(c)._lastLongRest;
  return typeof v === "string" ? new Date(v) : undefined;
};
