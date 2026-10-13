import type { Combatant, Prisma } from "@prisma/client";
import { rollD20 } from "@/engine/dice";
import { prisma } from "@/lib/prisma";
import type { Cmb } from "./rules";
import { dropConcentration } from "./spellRules";

/** Roll a Constitution save for each concentrating creature that was hurt; failures drop their spell everywhere. */
export function concentrationRolls(all: Cmb[], checks: { id: string; dc: number }[], lines: string[]): Cmb[] {
  let state = all;
  for (const { id, dc } of checks) {
    const c = state.find((x) => x.id === id);
    if (!c || !c.concentrating) continue;
    const roll = rollD20(c.defenses.saves?.con ?? 0, "normal");
    const kept = roll.total >= dc;
    lines.push(`${c.name} makes a Constitution save (DC ${dc}): ${roll.total} - ${kept ? "keeps concentrating" : "concentration is lost"}`);
    if (!kept) {
      const dropped = dropConcentration(state, id);
      state = dropped.all;
      lines.push(...dropped.lines);
    }
  }
  return state;
}

/** Creatures that fell to 0 HP stop concentrating. */
export function dropForDowned(all: Cmb[], lines: string[]): Cmb[] {
  let state = all;
  for (const c of all) {
    if (c.concentrating && (c.hp === 0 || c.defeated)) {
      const dropped = dropConcentration(state, c.id);
      state = dropped.all;
      lines.push(...dropped.lines);
    }
  }
  return state;
}

/** Heroes who lost concentration in combat also lose it on their sheet. */
export async function clearSheetConcentration(rows: Combatant[], before: Cmb[], after: Cmb[]) {
  for (const c of after) {
    const was = before.find((b) => b.id === c.id)?.concentrating;
    const row = rows.find((r) => r.id === c.id);
    if (!was || c.concentrating || !row?.characterId) continue;
    const ch = await prisma.character.findUnique({ where: { id: row.characterId }, select: { spells: true } });
    const sp = (ch?.spells && typeof ch.spells === "object" ? ch.spells : {}) as Record<string, unknown>;
    await prisma.character.update({ where: { id: row.characterId }, data: { spells: { ...sp, concentration: null } as Prisma.InputJsonValue } });
  }
}

export const changed = (before: Cmb[], after: Cmb[]) => after.filter((c) => JSON.stringify(c) !== JSON.stringify(before.find((b) => b.id === c.id)));
