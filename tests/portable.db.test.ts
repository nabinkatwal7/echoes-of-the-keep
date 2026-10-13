import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { createCharacter } from "@/lib/characters/actions";
import { importCharacter, runAudit } from "@/lib/characters/portableActions";
import { exportCharacter } from "@/lib/characters/portable";
import { prisma } from "@/lib/prisma";

describe.skipIf(!RUN_DB)("export, import and audit (database)", () => {
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let other: Awaited<ReturnType<typeof makeUser>>;
  let id = "";

  beforeAll(async () => {
    owner = await makeUser("owner");
    other = await makeUser("importer");
    signInAs(owner);
    const r = await createCharacter(
      {
        name: "Itest Portable", raceIndex: "elf", subraceIndex: "high-elf", classIndex: "wizard", backgroundIndex: "sage",
        abilityMethod: "standard", scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, classSkills: ["investigation", "medicine"],
      },
      "kit",
    );
    if (!r.ok) throw new Error(r.errors.join());
    id = r.id;
  });
  afterAll(cleanup);

  it("a legal hero passes the audit", async () => {
    const r = await runAudit(id);
    expect(r).toMatchObject({ ok: true, issues: [] });
  });

  it("exports, then imports as a new hero for another user", async () => {
    const row = await prisma.character.findUniqueOrThrow({ where: { id } });
    const text = JSON.stringify(exportCharacter(row as unknown as Record<string, unknown>));
    signInAs(other);
    const r = await importCharacter(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const copy = await prisma.character.findUniqueOrThrow({ where: { id: r.id } });
    expect(copy.ownerId).toBe(other.id);
    expect(copy.id).not.toBe(id);
    expect(copy).toMatchObject({ name: "Itest Portable", raceIndex: "elf", subraceIndex: "high-elf", currentHp: row.currentHp });
    expect(copy.equipment).toEqual(row.equipment);
  });

  it("refuses files that reference missing content or break rules", async () => {
    const row = await prisma.character.findUniqueOrThrow({ where: { id } });
    const doc = exportCharacter(row as unknown as Record<string, unknown>);
    expect((await importCharacter(JSON.stringify({ ...doc, character: { ...doc.character, raceIndex: "martian" } }))).ok).toBe(false);
    expect((await importCharacter(JSON.stringify({ ...doc, character: { ...doc.character, feats: ["no-such-feat"] } }))).ok).toBe(false);
    expect((await importCharacter("{}")).ok).toBe(false);
  });

  it("the audit catches an illegal spell selection and an unmet feat prerequisite", async () => {
    signInAs(owner);
    await prisma.character.update({
      where: { id },
      data: {
        spells: { byClass: { wizard: { known: [], spellbook: ["cure-wounds"], prepared: [] } } },
        feats: ["heavy-armor-master"],
      },
    });
    const r = await runAudit(id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const messages = r.issues.map((i) => i.message).join(" | ");
    expect(messages).toMatch(/not a Wizard spell/);
    expect(messages).toMatch(/Heavy Armor Master requires heavy armor proficiency/);
  });

  it("only the owner can audit through a non-campaign path", async () => {
    signInAs(other);
    expect((await runAudit(id)).ok).toBe(false);
  });
});
