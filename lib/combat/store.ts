import type { Combatant, Prisma } from "@prisma/client";
import type { ActiveCondition } from "@/engine/conditions/timers";
import { prisma } from "@/lib/prisma";
import type { LegendaryState, RechargeAbility } from "@/engine/combat/special";
import { emptyTurn, type AttackProfile, type Buff, type Cmb, type CombatDefenses, type SavedForm, type Turn } from "./rules";

export type Extra = {
  stable?: boolean;
  attacksPerAction?: number;
  concentrating?: string | null;
  exhaustion?: number;
  size?: string;
  /** challenge rating, for XP when defeated */
  cr?: number;
  buffs?: Buff[];
  /** fights on the party's side (summons, companions) */
  ally?: boolean;
  /** original stats while polymorphed, restored when the new form drops to 0 HP or the spell ends */
  polymorph?: SavedForm | null;
  recharge?: RechargeAbility[];
  legendary?: LegendaryState;
  mounted?: boolean;
  mountSpeed?: number;
};

const obj = <T,>(v: unknown, fallback: T): T => (v && typeof v === "object" ? (v as T) : fallback);

export function rowToCmb(r: Combatant): Cmb {
  const extra = obj<Extra>(r.extra, {});
  const turn = obj<Partial<Turn>>(r.turn, {});
  return {
    id: r.id,
    kind: r.kind as Cmb["kind"],
    name: r.name,
    ac: r.ac,
    hp: r.hp,
    maxHp: r.maxHp,
    tempHp: r.tempHp,
    speed: r.speed,
    initiative: r.initiative,
    dexMod: r.dexMod,
    conditions: Array.isArray(r.conditions) ? (r.conditions as unknown as ActiveCondition[]) : [],
    hidden: r.hidden,
    surprised: r.surprised,
    defeated: r.defeated,
    deathSaves: obj(r.deathSaves, { successes: 0, failures: 0 }),
    turn: { ...emptyTurn(r.speed), ...turn } as Turn,
    x: r.x,
    y: r.y,
    defenses: obj<CombatDefenses>(r.defenses, {}),
    exhaustion: extra.exhaustion,
    attacksPerAction: extra.attacksPerAction,
    stable: extra.stable,
    concentrating: extra.concentrating ?? null,
    buffs: extra.buffs ?? [],
    ally: extra.ally ?? false,
    polymorph: extra.polymorph ?? null,
    recharge: extra.recharge,
    legendary: extra.legendary,
    mounted: extra.mounted,
    mountSpeed: extra.mountSpeed,
  };
}

export const profilesOf = (r: Combatant): AttackProfile[] => (Array.isArray(r.attacks) ? (r.attacks as unknown as AttackProfile[]) : []);

/** Fields to write back for a combatant after the rules have run. */
export function cmbToData(c: Cmb, prev: Combatant): Prisma.CombatantUpdateInput {
  const extra = obj<Extra>(prev.extra, {});
  return {
    name: c.name,
    ac: c.ac,
    hp: c.hp,
    maxHp: c.maxHp,
    tempHp: c.tempHp,
    speed: c.speed,
    initiative: c.initiative,
    conditions: c.conditions as unknown as Prisma.InputJsonValue,
    hidden: c.hidden,
    surprised: c.surprised,
    defeated: c.defeated,
    deathSaves: c.deathSaves,
    turn: c.turn as unknown as Prisma.InputJsonValue,
    x: c.x,
    y: c.y,
    ...(extra.polymorph && !c.polymorph
      ? { attacks: (extra.polymorph.attacks ?? []) as Prisma.InputJsonValue, defenses: (extra.polymorph.defenses ?? {}) as Prisma.InputJsonValue }
      : {}),
    extra: {
      ...extra,
      stable: !!c.stable,
      concentrating: c.concentrating ?? null,
      buffs: c.buffs ?? [],
      polymorph: c.polymorph ?? null,
      recharge: c.recharge,
      legendary: c.legendary,
      mounted: !!c.mounted,
      mountSpeed: c.mountSpeed,
    } as unknown as Prisma.InputJsonValue,
  };
}

/** Plain-object copy of rows, stored with the event so a DM can undo it. */
export const snapshotRows = (rows: Combatant[]) => JSON.parse(JSON.stringify(rows)) as unknown[];

export async function loadEncounter(id: string) {
  return prisma.encounter.findUnique({ where: { id }, include: { combatants: { orderBy: [{ turnOrder: "asc" }, { createdAt: "asc" }] } } });
}

/** The user's role in the encounter's campaign, or null if they are not a member. */
export async function roleIn(campaignId: string, userId: string): Promise<"DM" | "PLAYER" | null> {
  const m = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } } });
  return (m?.role as "DM" | "PLAYER" | undefined) ?? null;
}

/** Which side a combatant fights on. Heroes and summoned allies are the party; everything else is a foe. */
export const sideOf = (r: Combatant): "party" | "foes" => (r.kind === "character" || obj<Extra>(r.extra, {}).ally ? "party" : "foes");
