import type { Combatant, Encounter, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Cmb } from "./rules";
import { cmbToData, snapshotRows } from "./store";

export type Actor = { id: string; name: string };

export type Change = {
  /** updated combatants (by id) */
  update?: Cmb[];
  /** combatant rows to insert */
  create?: Prisma.CombatantUncheckedCreateInput[];
  /** combatant ids to delete */
  remove?: string[];
  encounter?: Partial<Pick<Encounter, "state" | "round" | "activeIndex">> & { environment?: Prisma.InputJsonValue };
  lines: string[];
  /** hide the log line from players (hidden creatures involved) */
  dmOnly?: boolean;
};

const flags = (c: Cmb) => [...c.conditions.map((x) => x.condition), ...(c.defeated ? ["dead"] : []), ...(c.stable ? ["stable"] : [])];

/** Mirror a character combatant's hit points and conditions back onto the character sheet. */
async function syncCharacter(tx: Prisma.TransactionClient, c: Cmb, row: Combatant) {
  if (c.kind !== "character" || !row.characterId) return;
  await tx.character.update({
    where: { id: row.characterId },
    data: { currentHp: c.hp, tempHp: c.tempHp, deathSaves: c.deathSaves, conditions: flags(c) },
  });
}

/**
 * Apply a change atomically: write combatants, mirror characters, and append a "combat" event carrying an undo snapshot
 * of everything this change touched.
 */
export async function commit(enc: Encounter & { combatants: Combatant[] }, actor: Actor, change: Change) {
  const byId = new Map(enc.combatants.map((r) => [r.id, r]));
  const touched = (change.update ?? []).map((c) => byId.get(c.id)!).filter(Boolean);
  const removed = (change.remove ?? []).map((id) => byId.get(id)!).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    for (const c of change.update ?? []) {
      const row = byId.get(c.id);
      if (!row) continue;
      await tx.combatant.update({ where: { id: c.id }, data: cmbToData(c, row) });
      await syncCharacter(tx, c, row);
    }
    let createdIds: string[] = [];
    if (change.create?.length) {
      const made = await Promise.all(change.create.map((data) => tx.combatant.create({ data })));
      createdIds = made.map((m) => m.id);
    }
    if (change.remove?.length) await tx.combatant.deleteMany({ where: { id: { in: change.remove } } });
    if (change.encounter) await tx.encounter.update({ where: { id: enc.id }, data: change.encounter });

    await tx.campaignEvent.create({
      data: {
        campaignId: enc.campaignId,
        actorId: actor.id,
        type: "combat",
        audience: change.dmOnly ? "DM" : "ALL",
        payload: {
          actorName: actor.name,
          encounterId: enc.id,
          text: change.lines.join(" · "),
          lines: change.lines,
          undo: {
            rows: snapshotRows(touched),
            removedRows: snapshotRows(removed),
            createdIds,
            encounter: { state: enc.state, round: enc.round, activeIndex: enc.activeIndex, environment: enc.environment },
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  });
}
