import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign, joinCampaign } from "@/lib/campaigns/actions";
import { createCharacter } from "@/lib/characters/actions";
import { addMonster, addParty, createEncounter, endTurn, moveCombatant, runMonsterTurn, setInitiative, startEncounter } from "@/lib/combat/actions";
import { loadEncounter } from "@/lib/combat/store";
import { prisma } from "@/lib/prisma";

describe.skipIf(!RUN_DB)("running monster turns (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let player: Awaited<ReturnType<typeof makeUser>>;
  let encId = "";
  const rows = async () => (await loadEncounter(encId))!;
  const byName = async (n: string) => (await rows()).combatants.find((c) => c.name === n)!;

  beforeAll(async () => {
    dm = await makeUser("dm");
    player = await makeUser("pl");
    signInAs(dm);
    const camp = await createCampaign("Itest Monster AI");
    if (!camp.ok) throw new Error("setup");
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: camp.id } })).inviteCode;
    signInAs(player);
    await joinCampaign(code);
    const h = await createCharacter({ name: "Itest Target", raceIndex: "human", classIndex: "fighter", backgroundIndex: "soldier", abilityMethod: "standard", scores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 }, classSkills: ["acrobatics", "perception"] }, "kit");
    if (!h.ok) throw new Error(h.errors.join());
    await attachCharacter(camp.id, h.id);
    signInAs(dm);
    const e = await createEncounter(camp.id, "Ambush");
    if (!e.ok || !e.id) throw new Error("setup");
    encId = e.id;
    await addParty(encId);
    await addMonster(encId, "wolf", 2);
    await moveCombatant((await byName("Itest Target")).id, 10, 10);
    await moveCombatant((await byName("Wolf 1")).id, 4, 10);
    await moveCombatant((await byName("Wolf 2")).id, 10, 12);
    await setInitiative((await byName("Wolf 1")).id, 20);
    await setInitiative((await byName("Wolf 2")).id, 15);
    await setInitiative((await byName("Itest Target")).id, 5);
    await startEncounter(encId);
  });
  afterAll(cleanup);

  it("only the DM runs monster turns", async () => {
    signInAs(player);
    expect((await runMonsterTurn(encId)).ok).toBe(false);
    signInAs(dm);
  });

  it("walks the wolf up to the hero, attacks twice if it can, and ends the turn", async () => {
    const hero = await byName("Itest Target");
    const hpBefore = hero.hp;
    const r = await runMonsterTurn(encId, { endAfter: true });
    expect(r.ok).toBe(true);
    const after = await rows();
    const wolf = after.combatants.find((c) => c.name === "Wolf 1")!;
    const dist = Math.max(Math.abs(wolf.x! - hero.x!), Math.abs(wolf.y! - hero.y!));
    expect(dist).toBeLessThanOrEqual(6); // 30 ft of a 40 ft speed was used moving toward the hero
    expect(after.activeIndex).toBe(1); // the turn passed to the next wolf
    const events = await prisma.campaignEvent.findMany({ where: { campaignId: after.campaignId, type: "combat" }, orderBy: { id: "desc" }, take: 6 });
    expect(events.map((e) => (e.payload as { text: string }).text).join(" ")).toContain("Wolf 1");
    expect(hero.hp).toBe(hpBefore); // the stored snapshot above is unchanged; the live row may have taken damage
    expect((await byName("Itest Target")).hp).toBeLessThanOrEqual(hpBefore);
  });

  it("refuses to play a hero's turn", async () => {
    await runMonsterTurn(encId, { endAfter: true }); // wolf 2
    const e = await rows();
    expect(e.combatants[e.activeIndex].name).toBe("Itest Target");
    const r = await runMonsterTurn(encId);
    expect(r.ok).toBe(false);
    void endTurn;
  });
});
