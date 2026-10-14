import { describe, expect, it } from "vitest";
import { HAS_HANDBOOK } from "../../content/build/handbook";
import { importers } from "../../content/build/importers";
import { customItem, equipmentForEngine, itemFromCatalog, parseWeight, setEquipped, totalWeight, type CatalogRow } from "./inventory";
import { deriveStored } from "./derive";

const catalog = HAS_HANDBOOK ? (importers.find((i) => i.name === "equipment")!.load() as (CatalogRow & { index: string })[]) : [];
const row = (index: string) => catalog.find((r) => r.index === index)!;

describe("parseWeight", () => {
  it.each([["5 lb.", 5], ["1/4 lb.", 0.25], ["1 1/2 lb.", 1.5], ["", undefined], ["a lot", undefined]])("%j", (text, expected) => {
    expect(parseWeight(text)).toBe(expected);
  });
});

describe.skipIf(!HAS_HANDBOOK)("itemFromCatalog", () => {
  it("reads weapons", () => {
    const sword = itemFromCatalog(row("longsword"));
    expect(sword).toMatchObject({ kind: "weapon", damage: "1d8", melee: true, finesse: false, category: "Martial Melee Weapons", weight: 3 });
    expect(itemFromCatalog(row("rapier")).finesse).toBe(true);
    expect(itemFromCatalog(row("longbow"))).toMatchObject({ melee: false, twoHanded: true });
  });
  it("reads armor and shields", () => {
    expect(itemFromCatalog(row("chainmail"))).toMatchObject({ kind: "armor", armorCategory: "heavy", baseAc: 16, strengthRequired: 13 });
    expect(itemFromCatalog(row("studded-leather"))).toMatchObject({ armorCategory: "light", baseAc: 12 });
    expect(itemFromCatalog(row("half-plate"))).toMatchObject({ armorCategory: "medium", baseAc: 15 });
    expect(itemFromCatalog(row("shield"))).toMatchObject({ kind: "shield", baseAc: 2 });
  });
  it("treats everything else as gear", () => {
    expect(itemFromCatalog(row("backpack")).kind).toBe("gear");
  });
});

describe.skipIf(!HAS_HANDBOOK)("equipping", () => {
  it("only one armor and one shield at a time", () => {
    let items = [itemFromCatalog(row("chainmail")), itemFromCatalog(row("leather")), itemFromCatalog(row("shield"))];
    items = setEquipped(items, items[0].id, true);
    items = setEquipped(items, items[1].id, true);
    expect(items.map((i) => i.equipped)).toEqual([false, true, false]);
    items = setEquipped(items, items[2].id, true);
    expect(items.filter((i) => i.equipped)).toHaveLength(2);
  });
  it("rejects gear and unknown ids", () => {
    const gear = customItem("Rope");
    expect(() => setEquipped([gear], gear.id, true)).toThrow();
    expect(() => setEquipped([], "nope", true)).toThrow();
  });
  it("totals weight by quantity", () => {
    expect(totalWeight([itemFromCatalog(row("dagger"), 3), customItem("Rock", 2, 5)])).toBe(13);
  });
});

describe.skipIf(!HAS_HANDBOOK)("equipment feeds the sheet", () => {
  const stored = (items: ReturnType<typeof itemFromCatalog>[]) => ({
    classes: [{ classIndex: "fighter", level: 1 }],
    baseScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    scoreBonuses: {},
    skillProficiencies: [],
    skillExpertise: [],
    speed: 30,
    equipment: items,
  });

  it("chain mail and shield give AC 18", () => {
    const items = [itemFromCatalog(row("chainmail"), 1, true), itemFromCatalog(row("shield"), 1, true)];
    expect(deriveStored(stored(items)).armorClass.total).toBe(18);
  });
  it("an equipped longsword gives the right attack and damage for a proficient fighter", () => {
    const d = deriveStored(stored([itemFromCatalog(row("longsword"), 1, true)]));
    expect(d.attacks[0]).toMatchObject({ name: "Longsword", damage: "1d8+3" });
    expect(d.attacks[0].attackBonus.total).toBe(5); // +3 Str, +2 proficiency
  });
  it("a wizard is not proficient with a longsword", () => {
    const eq = equipmentForEngine([itemFromCatalog(row("longsword"), 1, true)], ["wizard"]);
    expect(eq.weapons[0].proficient).toBe(false);
  });
  it("unequipped items do not count", () => {
    expect(deriveStored(stored([itemFromCatalog(row("chainmail"))])).armorClass.total).toBe(11);
  });
  it("magic armor adds to AC and magic weapons to attack", () => {
    const mail = { ...itemFromCatalog(row("chainmail"), 1, true), magicBonus: 1 };
    expect(deriveStored(stored([mail])).armorClass.total).toBe(17);
    const sword = { ...itemFromCatalog(row("longsword"), 1, true), magicBonus: 1 };
    expect(deriveStored(stored([sword])).attacks[0].attackBonus.total).toBe(6);
  });
});
