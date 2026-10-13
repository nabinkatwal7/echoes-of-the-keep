import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { addExperience, createCharacter, levelUpCharacter } from "@/lib/characters/actions";
import { castSpell, endConcentration, saveSpellSelection, takeLongRest, takeShortRest, useClassResource } from "@/lib/characters/playActions";
import { prisma } from "@/lib/prisma";

const wizard = {
  name: "Itest Wizard",
  raceIndex: "human",
  classIndex: "wizard",
  backgroundIndex: "sage",
  abilityMethod: "standard" as const,
  scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  classSkills: ["investigation", "medicine"] as ("investigation" | "medicine")[],
};

describe.skipIf(!RUN_DB)("spells, resources and rests (database)", () => {
  let id = "";
  beforeAll(async () => {
    signInAs(await makeUser("caster"));
    const r = await createCharacter(wizard, "kit");
    if (!r.ok) throw new Error(r.errors.join());
    id = r.id;
    await addExperience(id, 300);
    await levelUpCharacter(id, { classIndex: "wizard" }); // level 2 needs a school
  });
  afterAll(cleanup);

  const row = () => prisma.character.findUniqueOrThrow({ where: { id } });

  it("requires a school at 2nd level then levels up", async () => {
    expect((await row()).classes).toEqual([{ classIndex: "wizard", level: 1 }]); // the first attempt lacked a subclass
    expect((await levelUpCharacter(id, { classIndex: "wizard", subclassIndex: "school-of-evocation" })).ok).toBe(true);
    expect((await row()).classes).toEqual([{ classIndex: "wizard", level: 2, subclassIndex: "school-of-evocation" }]);
  });

  it("validates spell selection against class lists and limits", async () => {
    const bad = await saveSpellSelection(id, "wizard", { known: [], spellbook: ["cure-wounds"], prepared: [] });
    expect(bad.ok).toBe(false); // a cleric spell
    const tooHigh = await saveSpellSelection(id, "wizard", { known: [], spellbook: ["fireball"], prepared: [] });
    expect(tooHigh.ok).toBe(false); // 3rd level at wizard 2
    const notInBook = await saveSpellSelection(id, "wizard", { known: [], spellbook: ["magic-missile"], prepared: ["magic-missile", "shield"] });
    expect(notInBook.ok).toBe(false);

    const ok = await saveSpellSelection(id, "wizard", {
      known: [],
      spellbook: ["magic-missile", "shield", "find-familiar", "detect-magic", "sleep", "mage-armor", "identify", "burning-hands"],
      prepared: ["fire-bolt", "light", "mage-hand", "magic-missile", "shield", "sleep", "identify"],
    });
    expect(ok).toMatchObject({ ok: true });
  });

  it("casts a cantrip free and a leveled spell from the lowest slot", async () => {
    expect(await castSpell(id, "fire-bolt")).toMatchObject({ ok: true });
    expect((await row()).spellSlotsUsed).toEqual([]); // nothing spent yet, no slot state stored

    const r = await castSpell(id, "magic-missile");
    expect(r).toMatchObject({ ok: true, message: expect.stringContaining("level 1 slot") });
    expect((await row()).spellSlotsUsed).toEqual([1]); // wizard 2 has three 1st-level slots and no 2nd-level ones

    expect((await castSpell(id, "magic-missile", { slotLevel: 2 })).ok).toBe(false); // no 2nd-level slots yet
  });

  it("refuses spells you have not prepared and slots you do not have", async () => {
    expect((await castSpell(id, "fireball")).ok).toBe(false); // not prepared
    expect((await castSpell(id, "shield")).ok).toBe(true); // second 1st-level slot
    expect((await castSpell(id, "sleep")).ok).toBe(true);
    expect((await castSpell(id, "magic-missile")).ok).toBe(false); // all three 1st-level slots are spent
  });

  it("tracks concentration, ending the old spell when a new one starts", async () => {
    await takeLongRest(id, true);
    expect((await castSpell(id, "sleep")).ok).toBe(true);
    let state = (await row()).spells as { concentration?: { name: string } | null };
    expect(state.concentration).toBeNull(); // Sleep is not concentration
    // use detect magic as a ritual from the spellbook: concentration spell, no slot
    expect((await castSpell(id, "detect-magic", { ritual: true })).ok).toBe(true);
    state = (await row()).spells as { concentration?: { name: string } | null };
    expect(state.concentration).toMatchObject({ name: "Detect Magic" });
    expect((await endConcentration(id)).ok).toBe(true);
    expect(((await row()).spells as { concentration: unknown }).concentration).toBeNull();
    expect((await endConcentration(id)).ok).toBe(false);
  });

  it("tracks class resources and refreshes them on rest", async () => {
    expect((await useClassResource(id, "arcane-recovery")).ok).toBe(true);
    expect((await useClassResource(id, "arcane-recovery")).ok).toBe(false); // only one
    expect((await useClassResource(id, "nonsense")).ok).toBe(false);
    await takeShortRest(id, []);
    expect(((await row()).resources as Record<string, number>)["arcane-recovery"]).toBe(1); // long-rest feature stays spent
    await takeLongRest(id, true);
    expect(((await row()).resources as Record<string, number>)["arcane-recovery"]).toBe(0);
  });

  it("limits long rests to one per 24 hours", async () => {
    await takeLongRest(id, true);
    expect((await takeLongRest(id)).ok).toBe(false);
  });

  it("spends hit dice on a short rest", async () => {
    await prisma.character.update({ where: { id }, data: { currentHp: 1 } });
    const r = await takeShortRest(id, [{ die: 6, count: 1 }]);
    expect(r.ok).toBe(true);
    expect((await row()).currentHp).toBeGreaterThan(1);
    expect((await takeShortRest(id, [{ die: 6, count: 9 }])).ok).toBe(false);
  });
});
