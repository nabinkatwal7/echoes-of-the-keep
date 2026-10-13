import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { addExperience, createCharacter, levelUpCharacter } from "@/lib/characters/actions";
import { convertSorcery } from "@/lib/characters/playActions";
import { prisma } from "@/lib/prisma";

const sorcerer = {
  name: "Itest Sorcerer",
  raceIndex: "human",
  classIndex: "sorcerer",
  subclassIndex: "draconic-bloodline",
  backgroundIndex: "hermit",
  abilityMethod: "standard" as const,
  scores: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
  classSkills: ["arcana", "persuasion"] as ("arcana" | "persuasion")[],
};

describe.skipIf(!RUN_DB)("Flexible Casting (database)", () => {
  let id = "";
  beforeAll(async () => {
    signInAs(await makeUser("sorc"));
    const r = await createCharacter(sorcerer, "none");
    if (!r.ok) throw new Error(r.errors.join());
    id = r.id;
    await addExperience(id, 900);
    await levelUpCharacter(id, { classIndex: "sorcerer" });
    await levelUpCharacter(id, { classIndex: "sorcerer" }); // level 3: 4 first-level and 2 second-level slots
  });
  afterAll(cleanup);
  const row = () => prisma.character.findUniqueOrThrow({ where: { id } });

  it("turns slots into points up to the maximum, and points into a spent slot", async () => {
    expect((await convertSorcery(id, "slot-to-points", 2)).ok).toBe(false); // already at full points
    // spend two points first
    await prisma.character.update({ where: { id }, data: { resources: { "sorcery-points": 2 } } });
    expect(await convertSorcery(id, "slot-to-points", 2)).toEqual({ ok: true }); // +2 points, uses a 2nd-level slot
    const after = await row();
    expect(after.spellSlotsUsed).toEqual([0, 1]);
    expect((after.resources as Record<string, number>)["sorcery-points"]).toBe(0);
    expect((await convertSorcery(id, "points-to-slot", 2)).ok).toBe(true); // costs 3 points, restores the slot
    expect((await row()).spellSlotsUsed).toEqual([0, 0]);
    expect(((await row()).resources as Record<string, number>)["sorcery-points"]).toBe(3);
    expect((await convertSorcery(id, "points-to-slot", 2)).ok).toBe(false); // nothing spent to restore
    expect((await convertSorcery(id, "points-to-slot", 9)).ok).toBe(false);
  });
});
