import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign, joinCampaign } from "@/lib/campaigns/actions";
import { createCharacter } from "@/lib/characters/actions";
import {
  addConditionTo, addMonster, addParty, adjustHitPoints, attack, createEncounter, endEncounter, endTurn, moveCombatant,
  setInitiative, startEncounter, takeAction, undoLast,
} from "@/lib/combat/actions";
import { buildEncounterView } from "@/lib/combat/view";
import { loadEncounter } from "@/lib/combat/store";
import { prisma } from "@/lib/prisma";

const fighter = {
  name: "Itest Brawler",
  raceIndex: "human",
  classIndex: "fighter",
  backgroundIndex: "soldier",
  abilityMethod: "standard" as const,
  scores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
  classSkills: ["acrobatics", "perception"] as ("acrobatics" | "perception")[],
};

describe.skipIf(!RUN_DB)("combat (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;
  let encId = "";
  let heroId = "";
  const rows = async () => (await loadEncounter(encId))!;
  const byName = async (n: string) => (await rows()).combatants.find((c) => c.name === n)!;

  beforeAll(async () => {
    dm = await makeUser("dm");
    alice = await makeUser("alice");
    bob = await makeUser("bob");
    signInAs(dm);
    const camp = await createCampaign("Itest Combat");
    if (!camp.ok) throw new Error("setup");
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: camp.id } })).inviteCode;
    signInAs(alice);
    await joinCampaign(code);
    signInAs(bob);
    await joinCampaign(code);
    signInAs(alice);
    const c = await createCharacter(fighter, "kit");
    if (!c.ok) throw new Error(c.errors.join());
    heroId = c.id;
    await attachCharacter(camp.id, heroId);
    signInAs(dm);
    const e = await createEncounter(camp.id, "Wolf ambush");
    if (!e.ok || !e.id) throw new Error("setup");
    encId = e.id;
  });
  afterAll(cleanup);

  it("only the DM can set up the fight", async () => {
    signInAs(alice);
    expect((await addParty(encId)).ok).toBe(false);
    expect((await addMonster(encId, "wolf")).ok).toBe(false);
    signInAs(dm);
    expect((await addParty(encId)).ok).toBe(true);
    expect((await addParty(encId)).ok).toBe(false); // already there
    expect((await addMonster(encId, "wolf", 2)).ok).toBe(true);
    expect((await addMonster(encId, "no-such-thing")).ok).toBe(false);
    expect((await rows()).combatants.map((c) => c.name).sort()).toEqual(["Itest Brawler", "Wolf 1", "Wolf 2"]);
  });

  it("starts with the chosen initiative order", async () => {
    const hero = await byName("Itest Brawler");
    const g1 = await byName("Wolf 1");
    const g2 = await byName("Wolf 2");
    signInAs(dm);
    await setInitiative(hero.id, 20);
    await setInitiative(g1.id, 15);
    await setInitiative(g2.id, 5);
    expect((await startEncounter(encId)).ok).toBe(true);
    const e = await rows();
    expect(e).toMatchObject({ state: "ACTIVE", round: 1, activeIndex: 0 });
    expect(e.combatants.map((c) => c.name)).toEqual(["Itest Brawler", "Wolf 1", "Wolf 2"]);
    expect((await startEncounter(encId)).ok).toBe(false);
  });

  it("hides monster numbers and secrets from players but not from the DM", async () => {
    const e = await rows();
    const player = buildEncounterView(e, { userId: alice.id, isDm: false }, new Set([heroId]));
    const wolf = player.combatants.find((c) => c.name === "Wolf 1")!;
    expect(wolf).toMatchObject({ hp: null, maxHp: null, ac: null, attacks: [], turn: null });
    expect(player.combatants.find((c) => c.name === "Itest Brawler")).toMatchObject({ mine: true, ac: expect.any(Number) });
    const dmView = buildEncounterView(e, { userId: dm.id, isDm: true }, new Set());
    expect(dmView.combatants.find((c) => c.name === "Wolf 1")!.hp).toBeGreaterThan(0);
  });

  it("only the controlling player acts, and only on their turn", async () => {
    const hero = await byName("Itest Brawler");
    const g1 = await byName("Wolf 1");
    signInAs(bob);
    expect((await takeAction(hero.id, "dodge")).ok).toBe(false);
    signInAs(alice);
    expect((await takeAction(g1.id, "dodge")).ok).toBe(false); // not hers
    expect((await endTurn(encId)).ok).toBe(true); // her own turn, so she can end it
    signInAs(dm);
    await endTurn(encId); // wolf 1
    await endTurn(encId); // wolf 2 -> round 2
    const e = await rows();
    expect(e).toMatchObject({ round: 2, activeIndex: 0 });
  });

  it("resolves an attack, spends the action, and undo restores everything", async () => {
    signInAs(alice);
    const hero = await byName("Itest Brawler");
    const g1 = await byName("Wolf 1");
    const profile = (hero.attacks as { name: string }[])?.[0];
    void profile;
    const ch = await prisma.character.findUniqueOrThrow({ where: { id: heroId } });
    const weapon = (ch.equipment as { kind: string; equipped?: boolean; name: string }[]).find((i) => i.kind === "weapon" && i.equipped)?.name ?? "Unarmed strike";
    // put the wolf in reach regardless of the default layout
    signInAs(dm);
    await moveCombatant(g1.id, hero.x! + 1, hero.y!);
    signInAs(alice);
    const before = await byName("Wolf 1");
    const r = await attack({ attackerId: hero.id, targetId: g1.id, attack: weapon });
    expect(r).toEqual({ ok: true });
    const mid = await byName("Itest Brawler");
    expect((mid.turn as { action: boolean }).action).toBe(false);
    const ev = await prisma.campaignEvent.findFirst({ where: { campaignId: (await rows()).campaignId, type: "combat" }, orderBy: { id: "desc" } });
    expect((ev!.payload as { text: string }).text).toContain("Wolf 1");
    // after an attack the player cannot take a second Dodge action
    expect((await takeAction(hero.id, "dodge")).ok).toBe(false);

    signInAs(alice);
    expect((await undoLast(encId)).ok).toBe(false); // players cannot undo
    signInAs(dm);
    expect((await undoLast(encId)).ok).toBe(true);
    const after = await byName("Wolf 1");
    expect(after.hp).toBe(before.hp);
    expect(((await byName("Itest Brawler")).turn as { action: boolean }).action).toBe(true);
  });

  it("DM hit point changes mirror onto the character and conditions apply", async () => {
    signInAs(dm);
    const hero = await byName("Itest Brawler");
    expect((await adjustHitPoints(hero.id, "damage", 3)).ok).toBe(true);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).currentHp).toBe(hero.hp - 3);
    expect((await addConditionTo(hero.id, "prone")).ok).toBe(true);
    expect((await addConditionTo(hero.id, "not-a-condition")).ok).toBe(false);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).conditions).toContain("prone");
    expect((await adjustHitPoints(hero.id, "damage", 0)).ok).toBe(false);
  });

  it("awards XP for defeated monsters when the encounter ends", async () => {
    signInAs(dm);
    const g1 = await byName("Wolf 1");
    await adjustHitPoints(g1.id, "damage", 999);
    expect((await byName("Wolf 1")).defeated).toBe(true);
    const xpBefore = (await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).xp;
    signInAs(alice);
    expect((await endEncounter(encId)).ok).toBe(false);
    signInAs(dm);
    expect((await endEncounter(encId)).ok).toBe(true);
    expect((await rows()).state).toBe("DONE");
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).xp).toBe(xpBefore + 50); // wolf CR 1/4 = 50 XP
    expect((await endEncounter(encId)).ok).toBe(false);
  });
});
