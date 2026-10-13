import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign, joinCampaign } from "@/lib/campaigns/actions";
import { createCharacter } from "@/lib/characters/actions";
import { addStashItem, advanceTime, awardMilestone, awardPartyXp, callForCheck, lightSource, partyRest, raiseHero, setInspiration, socialCheck, splitCoin, takeFromStash, travel } from "@/lib/world/playActions";
import { deleteWorldItem, saveLocation, saveNpc, saveQuest, setQuestStatus, setRevealed, setScene, spendDowntime } from "@/lib/world/worldActions";
import { purseValueCp, type Purse } from "@/engine/economy";
import { prisma } from "@/lib/prisma";

const rogue = {
  name: "Itest Scout",
  raceIndex: "halfling",
  subraceIndex: "lightfoot",
  classIndex: "rogue",
  backgroundIndex: "criminal",
  abilityMethod: "standard" as const,
  scores: { str: 8, dex: 15, con: 13, int: 12, wis: 10, cha: 14 },
  classSkills: ["acrobatics", "perception", "persuasion", "sleight-of-hand"] as ("acrobatics" | "perception" | "persuasion" | "sleight-of-hand")[],
};

describe.skipIf(!RUN_DB)("the world around the party (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let cid = "";
  let heroId = "";

  beforeAll(async () => {
    dm = await makeUser("dm");
    alice = await makeUser("alice");
    signInAs(dm);
    const c = await createCampaign("Itest World");
    if (!c.ok) throw new Error("setup");
    cid = c.id;
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).inviteCode;
    signInAs(alice);
    await joinCampaign(code);
    const h = await createCharacter(rogue, "kit");
    if (!h.ok) throw new Error(h.errors.join());
    heroId = h.id;
    await attachCharacter(cid, heroId);
    signInAs(dm);
  });
  afterAll(cleanup);

  it("only the DM runs the clock; time burns lights and shows at the table", async () => {
    signInAs(alice);
    expect((await advanceTime(cid, 10)).ok).toBe(false);
    signInAs(dm);
    expect((await advanceTime(cid, 0)).ok).toBe(false);
    expect(await lightSource(cid, "torch")).toEqual({ ok: true });
    const r = await advanceTime(cid, 90, "The party explores the crypt");
    expect(r).toMatchObject({ ok: true, now: "Day 1, 09:30" });
    const world = (await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).world as { lights: { lit: boolean }[] };
    expect(world.lights[0].lit).toBe(false);
    const last = await prisma.campaignEvent.findFirst({ where: { campaignId: cid, type: "system" }, orderBy: { id: "desc" } });
    expect((last!.payload as { text: string }).text).toContain("goes out");
  });

  it("travels at the party's pace and a party rest passes the time", async () => {
    const t = await travel(cid, 24, "normal", "forest");
    expect(t.ok).toBe(true);
    expect(t.ok && t.summary).toContain("forest");
    expect((await travel(cid, -5, "normal", "road")).ok).toBe(false);
    const before = (await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).clockMinutes;
    expect(await partyRest(cid, "long")).toMatchObject({ ok: true, rested: 1 });
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).clockMinutes).toBe(before + 480);
  });

  it("calls for checks with a group result, and keeps secret ones to the DM", async () => {
    const r = await callForCheck(cid, { characterIds: [heroId], skill: "stealth", dc: 1, group: true });
    expect(r.ok).toBe(true);
    const last = await prisma.campaignEvent.findFirst({ where: { campaignId: cid, type: "system" }, orderBy: { id: "desc" } });
    expect((last!.payload as { text: string }).text).toContain("the group succeeds");
    await callForCheck(cid, { characterIds: [heroId], ability: "wis", dc: 12, secret: true });
    const secret = await prisma.campaignEvent.findFirst({ where: { campaignId: cid, type: "system" }, orderBy: { id: "desc" } });
    expect(secret!.audience).toBe("DM");
    expect((await callForCheck(cid, { characterIds: [heroId] })).ok).toBe(false);
    expect((await callForCheck(cid, { characterIds: [heroId], skill: "stealth", dc: 99 })).ok).toBe(false);
  });

  it("moves NPC attitude on a social check and hides unrevealed NPCs", async () => {
    const npc = await saveNpc(cid, { name: "Garrick the Gatekeeper", role: "Guard", attitude: "hostile" });
    if (!npc.ok) throw new Error("setup");
    const r = await socialCheck(cid, npc.id, heroId, "persuasion");
    expect(r.ok).toBe(true);
    expect((await prisma.npc.findUniqueOrThrow({ where: { id: npc.id } })).revealed).toBe(false);
    expect((await saveNpc(cid, { name: "" })).ok).toBe(false);
    expect((await setRevealed(cid, "npc", npc.id, true)).ok).toBe(true);
    expect((await prisma.npc.findUniqueOrThrow({ where: { id: npc.id } })).revealed).toBe(true);
    signInAs(alice);
    expect((await saveNpc(cid, { name: "Nope" })).ok).toBe(false);
    signInAs(dm);
  });

  it("scenes accept only https image links and one is current at a time", async () => {
    expect((await saveLocation(cid, { name: "Bad", imageUrl: "http://example.com/a.png" })).ok).toBe(false);
    expect((await saveLocation(cid, { name: "Bad", imageUrl: "javascript:alert(1)" })).ok).toBe(false);
    const a = await saveLocation(cid, { name: "The Inn", imageUrl: "https://example.com/inn.png" });
    const b = await saveLocation(cid, { name: "The Crypt" });
    if (!a.ok || !b.ok) throw new Error("setup");
    await setScene(cid, a.id);
    await setScene(cid, b.id);
    const current = await prisma.location.findMany({ where: { campaignId: cid, current: true } });
    expect(current.map((l) => l.name)).toEqual(["The Crypt"]);
    await setScene(cid, null);
    expect(await prisma.location.count({ where: { campaignId: cid, current: true } })).toBe(0);
  });

  it("quests are announced when revealed and completed", async () => {
    const q = await saveQuest(cid, { title: "Find the missing caravan", reward: "100 gp" });
    if (!q.ok) throw new Error("setup");
    await setRevealed(cid, "quest", q.id, true);
    await setQuestStatus(cid, q.id, "DONE");
    const texts = (await prisma.campaignEvent.findMany({ where: { campaignId: cid, type: "system" }, orderBy: { id: "desc" }, take: 3 })).map((e) => (e.payload as { text: string }).text);
    expect(texts.some((t) => t.includes("Quest completed") && t.includes("100 gp"))).toBe(true);
    expect((await deleteWorldItem(cid, "quest", q.id)).ok).toBe(true);
  });

  it("splits coin and XP, hands out stash items, and grants milestone and inspiration", async () => {
    expect((await splitCoin(cid, { gp: 50 })).ok).toBe(true);
    expect(purseValueCp((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).currency as Purse)).toBeGreaterThanOrEqual(5000); // a lone hero keeps all 50 gp
    expect((await splitCoin(cid, { gp: -1 })).ok).toBe(false);
    expect(await awardPartyXp(cid, 300)).toMatchObject({ ok: true, each: 300 });
    expect((await awardMilestone(cid)).ok).toBe(true);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).xp).toBe(300);
    expect((await setInspiration(cid, heroId, true)).ok).toBe(true);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).inspiration).toBe(true);

    expect((await addStashItem(cid, "Silver idol", 2, "from the crypt", 25)).ok).toBe(true);
    const item = await prisma.stashItem.findFirstOrThrow({ where: { campaignId: cid } });
    signInAs(alice);
    expect((await takeFromStash(cid, item.id, heroId, 3)).ok).toBe(false); // only two
    expect((await takeFromStash(cid, item.id, heroId, 1)).ok).toBe(true);
    expect((await prisma.stashItem.findUniqueOrThrow({ where: { id: item.id } })).quantity).toBe(1);
    expect((await addStashItem(cid, "Cheat", 1)).ok).toBe(false); // players do not add treasure
    signInAs(dm);
  });

  it("raises the dead within the time limit and the penalty fades per long rest", async () => {
    expect((await raiseHero(cid, heroId, "raise-dead", 1)).ok).toBe(false); // not dead
    await prisma.character.update({ where: { id: heroId }, data: { currentHp: 0, conditions: ["dead"] } });
    expect((await raiseHero(cid, heroId, "revivify", 3)).ok).toBe(false); // too long
    expect((await raiseHero(cid, heroId, "raise-dead", 3)).ok).toBe(true);
    const back = await prisma.character.findUniqueOrThrow({ where: { id: heroId } });
    expect(back).toMatchObject({ currentHp: 1, rezPenalty: 4 });
    expect(back.conditions).not.toContain("dead");
    await partyRest(cid, "long");
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).rezPenalty).toBe(3);
  });

  it("downtime charges the purse", async () => {
    signInAs(alice);
    await prisma.character.update({ where: { id: heroId }, data: { currency: { cp: 0, sp: 0, ep: 0, gp: 20, pp: 0 } } });
    expect((await spendDowntime(heroId, "research", 5)).ok).toBe(true);
    expect(purseValueCp((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).currency as Purse)).toBe(1500);
    expect((await spendDowntime(heroId, "research", 100)).ok).toBe(false); // 100 gp
    expect((await spendDowntime(heroId, "craft", 5, { itemValueGp: 50 })).ok).toBe(false); // no tools
    signInAs(dm);
  });
});
