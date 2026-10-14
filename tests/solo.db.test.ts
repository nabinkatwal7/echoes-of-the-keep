import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { autoRun } from "@/lib/combat/autoActions";
import { attack, endEncounter, endTurn, runMonsterTurn } from "@/lib/combat/actions";
import { loadEncounter } from "@/lib/combat/store";
import { readAdventure } from "@/lib/solo/director";
import { readSolo } from "@/lib/solo/config";
import { continueStory, deleteSoloGame, generateEncounter, setAutoMonsters, startSoloGame } from "@/lib/solo/actions";
import { deleteSoloGamesOf } from "@/lib/solo/cleanup";
import { soloGamesOf } from "@/lib/solo/games";
import { prisma } from "@/lib/prisma";

describe.skipIf(!RUN_DB)("solo play (database)", () => {
  let human: Awaited<ReturnType<typeof makeUser>>;
  const games: string[] = [];
  beforeAll(async () => {
    human = await makeUser("solo");
    signInAs(human);
  });
  afterAll(async () => {
    for (const id of games) await prisma.campaign.deleteMany({ where: { id } });
    await prisma.user.deleteMany({ where: { isBot: true, id: { in: (await prisma.user.findMany({ where: { isBot: true, username: { startsWith: "bot_" } }, select: { id: true } })).map((u) => u.id) } } });
    await cleanup();
  });

  /** The person's own turn, played simply: hit the nearest living foe, then end the turn. */
  async function humanTurn(encId: string) {
    const enc = (await loadEncounter(encId))!;
    const me = enc.combatants[enc.activeIndex];
    const foe = enc.combatants.find((c) => c.kind !== "character" && !c.defeated && !(c.extra as { ally?: boolean }).ally);
    if (foe && me.hp > 0) {
      const ch = await prisma.character.findUniqueOrThrow({ where: { id: me.characterId! } });
      const weapon = (ch.equipment as { kind: string; equipped?: boolean; name: string }[]).find((i) => i.kind === "weapon" && i.equipped)?.name ?? "Unarmed strike";
      // walk next to the foe when too far (the DM-less shortcut: place by the rules, spending movement)
      await attack({ attackerId: me.id, targetId: foe.id, attack: weapon });
    }
    await endTurn(encId);
  }

  it("a player-mode game: the computer plays the DM and the companions through a whole chapter", async () => {
    const created = await startSoloGame({ mode: "player", bots: 3, level: 2, theme: "wilds", heroKey: "fighter" });
    if (!created.ok) throw new Error(created.errors.join());
    const id = created.id;
    games.push(id);

    const camp = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { members: { include: { user: true } }, characters: { include: { character: true } } } });
    const solo = readSolo(camp.settings)!;
    expect(solo).toMatchObject({ humanId: human.id, mode: "player" });
    expect(camp.members.find((m) => m.role === "DM")!.user.isBot).toBe(true); // the computer runs the world
    expect(camp.members.find((m) => m.userId === human.id)!.role).toBe("PLAYER");
    expect(camp.characters).toHaveLength(4); // you and three companions
    expect(camp.members.filter((m) => m.user.isBot)).toHaveLength(4);

    // play the story: intro, then each fight and rest, until the chapter ends
    let guard = 0;
    while (guard++ < 40) {
      const adv = readAdventure((await prisma.campaign.findUniqueOrThrow({ where: { id } })).world)!;
      if (adv.complete) break;
      const step = await continueStory(id);
      if (!step.ok) throw new Error(step.errors.join());
      if (step.encounterId) {
        for (let turns = 0; turns < 120; turns++) {
          const r = await autoRun(step.encounterId);
          if (!r.ok) throw new Error(r.errors.join());
          if (r.waiting === "done") break;
          await humanTurn(step.encounterId);
        }
        expect((await prisma.encounter.findUniqueOrThrow({ where: { id: step.encounterId } })).state).toBe("DONE");
      }
    }
    const end = readAdventure((await prisma.campaign.findUniqueOrThrow({ where: { id } })).world)!;
    expect(end.complete).toBe(true);
    if (process.env.DEBUG_SOLO) (await import("node:fs")).writeFileSync(process.env.DEBUG_SOLO, (await prisma.campaignEvent.findMany({ where: { campaignId: id }, orderBy: { id: "asc" } })).map((e) => `[${e.type}] ${(e.payload as { text?: string }).text}`).join("\n"));
    const narration = await prisma.campaignEvent.findMany({ where: { campaignId: id, type: "system" } });
    expect(narration.length).toBeGreaterThanOrEqual(5);
    // the party earned experience, and every hero is on their feet for the next chapter
    for (const c of (await prisma.campaignCharacter.findMany({ where: { campaignId: id }, include: { character: true } })).map((x) => x.character)) {
      expect(c.xp).toBeGreaterThan(0);
    }
  }, 180_000);

  it("the story cannot be pushed along while a fight is on, and only the player can run it", async () => {
    const created = await startSoloGame({ mode: "player", bots: 2, level: 1, theme: "crypt", heroKey: "cleric" });
    if (!created.ok) throw new Error(created.errors.join());
    games.push(created.id);
    await continueStory(created.id); // intro
    const fight = await continueStory(created.id);
    expect(fight.ok && fight.encounterId).toBeTruthy();
    expect((await continueStory(created.id)).ok).toBe(false); // still fighting
    const stranger = await makeUser("stranger");
    signInAs(stranger);
    expect((await continueStory(created.id)).ok).toBe(false);
    if (fight.ok && fight.encounterId) expect((await autoRun(fight.encounterId)).ok).toBe(false);
    signInAs(human);
  }, 60_000);

  it("a DM-mode game: you run the world while computer heroes play the party", async () => {
    const created = await startSoloGame({ mode: "dm", bots: 3, level: 2, theme: "caves" });
    if (!created.ok) throw new Error(created.errors.join());
    const id = created.id;
    games.push(id);
    const camp = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { members: true } });
    expect(camp.dmId).toBe(human.id);
    expect(readSolo(camp.settings)!.botDmId).toBeNull();

    expect((await generateEncounter(id, "medium", false)).ok).toBe(true);
    const fight = await generateEncounter(id, "easy", true);
    if (!fight.ok) throw new Error(fight.errors.join());
    expect(fight.foes.length).toBeGreaterThan(3);

    // monsters are the DM's to play unless they ask the computer
    const first = await autoRun(fight.id);
    expect(first.ok).toBe(true);
    expect((await setAutoMonsters(id, true)).ok).toBe(true);
    for (let i = 0; i < 6; i++) {
      const r = await autoRun(fight.id);
      if (!r.ok || r.waiting === "done") break;
      const enc = (await loadEncounter(fight.id))!;
      if (enc.combatants.every((c) => c.kind === "character" || c.defeated)) break;
      await runMonsterTurn(fight.id, { endAfter: true });
    }
    const after = (await loadEncounter(fight.id))!;
    expect(after.combatants.some((c) => c.kind === "character" && c.hp < c.maxHp) || after.round > 1).toBe(true);
    expect((await endEncounter(fight.id)).ok).toBe(true);
  }, 120_000);

  it("limits how many games a person keeps, and deleting one removes its computer players", async () => {
    const mine = await soloGamesOf(human.id);
    expect(mine.length).toBe(games.length);
    const bots = [...(readSolo(mine[0].settings)?.botIds ?? []), ...(readSolo(mine[0].settings)?.botDmId ? [readSolo(mine[0].settings)!.botDmId!] : [])];
    expect(bots.length).toBeGreaterThan(0);
    expect((await deleteSoloGame(mine[0].id)).ok).toBe(true);
    expect(await prisma.user.count({ where: { id: { in: bots } } })).toBe(0);
    expect((await startSoloGame({ mode: "dm", bots: 1, level: 1, theme: "crypt" })).ok).toBe(false); // too few computer heroes
    expect((await startSoloGame({ mode: "player", bots: 2, level: 9, theme: "crypt", heroKey: "fighter" })).ok).toBe(false); // level too high
  }, 60_000);

  it("deleting an account takes the person's solo games and computer players with it", async () => {
    const person = await makeUser("leaver");
    signInAs(person);
    const g = await startSoloGame({ mode: "player", bots: 2, level: 1, theme: "bandits", heroKey: "rogue" });
    if (!g.ok) throw new Error(g.errors.join());
    const before = await prisma.user.count({ where: { isBot: true } });
    expect(await deleteSoloGamesOf(person.id)).toBe(1);
    expect(await prisma.campaign.count({ where: { id: g.id } })).toBe(0);
    expect(await prisma.user.count({ where: { isBot: true } })).toBe(before - 3); // the DM and two companions
    signInAs(human);
  }, 60_000);
});
