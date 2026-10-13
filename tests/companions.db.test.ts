import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { createCharacter } from "@/lib/characters/actions";
import { addCompanion, removeCompanion, setCompanionHp, type Companion } from "@/lib/characters/companionActions";
import { prisma } from "@/lib/prisma";

const druid = {
  name: "Itest Druid",
  raceIndex: "human",
  classIndex: "druid",
  backgroundIndex: "hermit",
  abilityMethod: "standard" as const,
  scores: { str: 8, dex: 14, con: 13, int: 10, wis: 15, cha: 12 },
  classSkills: ["nature", "survival"] as ("nature" | "survival")[],
};

describe.skipIf(!RUN_DB)("companions and wild shape (database)", () => {
  let id = "";
  beforeAll(async () => {
    signInAs(await makeUser("druid"));
    const r = await createCharacter(druid, "none");
    if (!r.ok) throw new Error(r.errors.join());
    id = r.id;
  });
  afterAll(cleanup);

  const setLevel = (level: number, subclassIndex?: string) =>
    prisma.character.update({ where: { id }, data: { classes: [{ classIndex: "druid", level, ...(subclassIndex ? { subclassIndex } : {}) }] } });
  const companions = async () => (await prisma.character.findUniqueOrThrow({ where: { id } })).companions as unknown as Companion[];

  it("cannot Wild Shape before level 2", async () => {
    expect((await addCompanion(id, "wolf", "wild-shape")).ok).toBe(false);
  });

  it("level 2: a wolf, but no flying or swimming forms and no stacking", async () => {
    await setLevel(2, "circle-of-the-land");
    expect((await addCompanion(id, "giant-eagle", "wild-shape")).ok).toBe(false); // CR 1, flying
    expect((await addCompanion(id, "crocodile", "wild-shape")).ok).toBe(false); // swimming
    expect((await addCompanion(id, "imp", "wild-shape")).ok).toBe(false); // not a beast
    expect((await addCompanion(id, "wolf", "wild-shape")).ok).toBe(true);
    expect((await addCompanion(id, "cat", "wild-shape")).ok).toBe(false); // already transformed
    const [form] = await companions();
    expect(form).toMatchObject({ creatureIndex: "wolf", kind: "wild-shape", hp: 11, maxHp: 11 });
  });

  it("tracks form HP within bounds and reverts", async () => {
    const [form] = await companions();
    await setCompanionHp(id, form.id, 4);
    expect((await companions())[0].hp).toBe(4);
    await setCompanionHp(id, form.id, 99);
    expect((await companions())[0].hp).toBe(11);
    expect((await removeCompanion(id, form.id)).ok).toBe(true);
    expect(await companions()).toEqual([]);
  });

  it("level 4 allows swimming, level 8 allows flying and CR 1", async () => {
    await setLevel(4, "circle-of-the-land");
    expect((await addCompanion(id, "crocodile", "wild-shape")).ok).toBe(true);
    await removeCompanion(id, (await companions())[0].id);
    expect((await addCompanion(id, "giant-eagle", "wild-shape")).ok).toBe(false);
    await setLevel(8, "circle-of-the-land");
    expect((await addCompanion(id, "giant-eagle", "wild-shape")).ok).toBe(true);
  });

  it("familiars must be spell-legal forms; beast companions need a Beast Master", async () => {
    expect((await addCompanion(id, "brown-bear", "familiar")).ok).toBe(false);
    expect((await addCompanion(id, "owl", "familiar")).ok).toBe(true);
    expect((await addCompanion(id, "wolf", "beast-companion")).ok).toBe(false); // not a ranger
    expect((await addCompanion(id, "no-such-beast", "summon")).ok).toBe(false);
    expect((await addCompanion(id, "skeleton", "summon", "Bony")).ok).toBe(true);
    const names = (await companions()).map((c) => c.name);
    expect(names).toContain("Bony");
  });
});
