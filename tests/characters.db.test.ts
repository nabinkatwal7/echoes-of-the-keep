import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { createCharacter, levelUpCharacter, addExperience } from "@/lib/characters/actions";
import { addCatalogItem, changeHitPoints, setCurrency, setItemEquipped, addCustomItem, sellItem } from "@/lib/characters/sheetActions";
import { deriveStored } from "@/lib/characters/derive";
import type { InventoryItem } from "@/lib/characters/inventory";
import { prisma } from "@/lib/prisma";

const cleric = {
  name: "Itest Cleric",
  raceIndex: "dwarf",
  subraceIndex: "hill-dwarf",
  classIndex: "cleric",
  subclassIndex: "life-domain",
  backgroundIndex: "acolyte",
  abilityMethod: "standard" as const,
  scores: { str: 13, dex: 8, con: 14, int: 10, wis: 15, cha: 12 },
  classSkills: ["history", "medicine"] as ("history" | "medicine")[],
};

describe.skipIf(!RUN_DB)("characters (database)", () => {
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let id = "";

  beforeAll(async () => {
    owner = await makeUser("owner");
    signInAs(owner);
  });
  afterAll(cleanup);

  it("creates a hero with the class kit and a correct AC", async () => {
    const r = await createCharacter(cleric, "kit");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    id = r.id;
    const c = (await prisma.character.findUnique({ where: { id } }))!;
    const items = c.equipment as unknown as InventoryItem[];
    expect(items.filter((i) => i.equipped).map((i) => i.name).sort()).toEqual(["Mace", "Scale mail", "Shield"]);
    const d = deriveStored(c);
    expect(d.armorClass.total).toBe(15); // scale mail 14 + Dex(-1, medium cap 2) = 13, shield +2
    expect(d.attacks[0]).toMatchObject({ name: "Mace" });
    expect(c.currentHp).toBe(11);
  });

  it("can roll starting gold instead of a kit", async () => {
    const r = await createCharacter({ ...cleric, name: "Itest Gold" }, "gold");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = (await prisma.character.findUnique({ where: { id: r.id } }))!;
    const gp = (c.currency as { gp: number }).gp;
    expect(gp).toBeGreaterThanOrEqual(50); // 5d4 x 10
    expect(gp).toBeLessThanOrEqual(200);
    expect(c.equipment).toEqual([]);
  });

  it("rejects an illegal creation (cleric without a subclass)", async () => {
    const r = await createCharacter({ ...cleric, subclassIndex: undefined }, "kit");
    expect(r).toMatchObject({ ok: false });
  });

  it("applies damage, healing and death saves with the rules", async () => {
    expect((await changeHitPoints(id, { kind: "damage", amount: 4 })).ok).toBe(true);
    expect((await prisma.character.findUnique({ where: { id } }))!.currentHp).toBe(7);
    await changeHitPoints(id, { kind: "heal", amount: 100 });
    expect((await prisma.character.findUnique({ where: { id } }))!.currentHp).toBe(11);

    await changeHitPoints(id, { kind: "damage", amount: 11 }); // down to 0, not instant death (overflow 0 < max 11)
    let c = (await prisma.character.findUnique({ where: { id } }))!;
    expect(c.currentHp).toBe(0);
    await changeHitPoints(id, { kind: "death-save", natural: 5 });
    c = (await prisma.character.findUnique({ where: { id } }))!;
    expect(c.deathSaves).toEqual({ successes: 0, failures: 1 });
    await changeHitPoints(id, { kind: "death-save", natural: 20 }); // nat 20: back up with 1 HP
    c = (await prisma.character.findUnique({ where: { id } }))!;
    expect(c).toMatchObject({ currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
    expect((await changeHitPoints(id, { kind: "damage", amount: 0 })).ok).toBe(false);
  });

  it("makes massive damage fatal", async () => {
    await changeHitPoints(id, { kind: "damage", amount: 50 });
    const c = (await prisma.character.findUnique({ where: { id } }))!;
    expect(c.conditions).toContain("dead");
  });

  it("buys items with change, refuses when poor, sells for half", async () => {
    // fresh hero for money tests
    const made = await createCharacter({ ...cleric, name: "Itest Shopper" }, "none");
    if (!made.ok) throw new Error("setup");
    const sid = made.id;
    expect((await addCatalogItem(sid, "longsword", 1, "buy")).ok).toBe(false); // no money
    await setCurrency(sid, { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 });
    expect((await addCatalogItem(sid, "longsword", 1, "buy")).ok).toBe(true); // 15 gp
    let c = (await prisma.character.findUnique({ where: { id: sid } }))!;
    expect(c.currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 5, pp: 0 });
    const sword = (c.equipment as unknown as InventoryItem[])[0];
    expect((await setItemEquipped(sid, sword.id, true)).ok).toBe(true);
    expect(deriveStored(await prisma.character.findUniqueOrThrow({ where: { id: sid } })).attacks[0].name).toBe("Longsword");
    await sellItem(sid, sword.id); // half of 15 gp = 7.5 gp = 750 cp
    c = (await prisma.character.findUniqueOrThrow({ where: { id: sid } }));
    expect(c.currency).toEqual({ cp: 0, sp: 5, ep: 0, gp: 2, pp: 1 }); // 5 gp + 7.5 gp = 12.5 gp, as 1 pp 2 gp 5 sp
    expect(c.equipment).toEqual([]);
    expect((await addCustomItem(sid, "A brass key", 1)).ok).toBe(true);
  });

  it("levels up with the XP rule and a subclass choice for a fighter", async () => {
    const f = await createCharacter({ ...cleric, name: "Itest Fighter", classIndex: "fighter", subclassIndex: undefined, classSkills: ["athletics", "perception"] }, "kit");
    if (!f.ok) throw new Error("setup");
    expect((await levelUpCharacter(f.id, { classIndex: "fighter" })).ok).toBe(false); // no XP
    await addExperience(f.id, 900);
    expect((await levelUpCharacter(f.id, { classIndex: "fighter" })).ok).toBe(true); // level 2
    expect((await levelUpCharacter(f.id, { classIndex: "fighter" })).ok).toBe(false); // level 3 needs subclass
    expect((await levelUpCharacter(f.id, { classIndex: "fighter", subclassIndex: "champion" })).ok).toBe(true);
    const c = await prisma.character.findUniqueOrThrow({ where: { id: f.id } });
    expect(c.classes).toEqual([{ classIndex: "fighter", level: 3, subclassIndex: "champion" }]);
  });

  it("only the owner (or a campaign DM) can edit a hero", async () => {
    const stranger = await makeUser("stranger");
    signInAs(stranger);
    expect((await changeHitPoints(id, { kind: "heal", amount: 1 })).ok).toBe(false);
    expect((await addCatalogItem(id, "dagger", 1, "free")).ok).toBe(false);
    signInAs(owner);
  });

  it("a campaign DM can edit party heroes and the change is logged to the table", async () => {
    const dm = await makeUser("dm");
    const campaign = await prisma.campaign.create({
      data: { name: "Itest Campaign", dmId: dm.id, inviteCode: `IT${Math.random().toString(36).slice(2, 8).toUpperCase()}`, members: { create: [{ userId: dm.id, role: "DM" }, { userId: owner.id, role: "PLAYER" }] } },
    });
    await prisma.campaignCharacter.create({ data: { campaignId: campaign.id, characterId: id } });
    await prisma.character.update({ where: { id }, data: { currentHp: 5, conditions: [] } });

    signInAs(dm);
    expect((await changeHitPoints(id, { kind: "damage", amount: 2 })).ok).toBe(true);
    const events = await prisma.campaignEvent.findMany({ where: { campaignId: campaign.id, type: "sheet" } });
    expect(events).toHaveLength(1);
    expect((events[0].payload as { text: string }).text).toMatch(/takes 2 damage \(5 → 3 HP\)/);
    signInAs(owner);
  });
});
