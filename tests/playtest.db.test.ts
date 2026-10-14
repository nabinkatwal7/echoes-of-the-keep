import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign, joinCampaign, postMessage } from "@/lib/campaigns/actions";
import { addExperience, createCharacter, levelUpCharacter } from "@/lib/characters/actions";
import { saveSpellSelection } from "@/lib/characters/playActions";
import { addMonster, addParty, adjustHitPoints, attack, createEncounter, endEncounter, endTurn, moveCombatant, startEncounter } from "@/lib/combat/actions";
import { castInCombat } from "@/lib/combat/spellActions";
import { loadEncounter } from "@/lib/combat/store";
import { createEntry } from "@/lib/journal/actions";
import { endSession, startSession } from "@/lib/journal/sessionActions";
import { prisma } from "@/lib/prisma";
import { advanceTime, awardMilestone, partyRest } from "@/lib/world/playActions";

/**
 * A scripted play session from first roll to saved recap. Dice are real, so the test checks rules that must hold on any roll:
 * who can act, that resources are spent, that the fight ends, that rewards arrive and that the table log tells the story.
 */
describe.skipIf(!RUN_DB)("scripted playtest: one evening at the table (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let ann: Awaited<ReturnType<typeof makeUser>>;
  let bo: Awaited<ReturnType<typeof makeUser>>;
  let cid = "";
  let fighterId = "";
  let wizardId = "";
  let encId = "";

  beforeAll(async () => {
    dm = await makeUser("dm");
    ann = await makeUser("ann");
    bo = await makeUser("bo");
    signInAs(dm);
    const camp = await createCampaign("Itest Playtest", "An evening at the table");
    if (!camp.ok) throw new Error("setup");
    cid = camp.id;
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).inviteCode;

    signInAs(ann);
    await joinCampaign(code);
    const f = await createCharacter({ name: "Itest Ironhide", raceIndex: "human", classIndex: "fighter", backgroundIndex: "soldier", abilityMethod: "standard", scores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 }, classSkills: ["acrobatics", "perception"] }, "kit");
    if (!f.ok) throw new Error(f.errors.join());
    fighterId = f.id;
    await attachCharacter(cid, fighterId);

    signInAs(bo);
    await joinCampaign(code);
    const w = await createCharacter({ name: "Itest Mirela", raceIndex: "human", classIndex: "wizard", backgroundIndex: "sage", abilityMethod: "standard", scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, classSkills: ["investigation", "medicine"] }, "kit");
    if (!w.ok) throw new Error(w.errors.join());
    wizardId = w.id;
    await saveSpellSelection(wizardId, "wizard", { known: [], spellbook: ["magic-missile", "shield", "burning-hands", "sleep", "mage-armor", "identify"], prepared: ["fire-bolt", "light", "magic-missile", "shield", "burning-hands", "sleep"] });
    await attachCharacter(cid, wizardId);
    signInAs(dm);
  });
  afterAll(cleanup);

  it("opens the session and the players chat and roll", async () => {
    expect(await startSession(cid, "Wolves on the road")).toEqual({ ok: true, number: 1 });
    signInAs(ann);
    expect((await postMessage(cid, "I check the tracks")).ok).toBe(true);
    expect((await postMessage(cid, "/roll 1d20+4 survival")).ok).toBe(true);
    signInAs(bo);
    expect((await postMessage(cid, "/gmroll 1d20")).ok).toBe(false); // players cannot roll in secret
    signInAs(dm);
    expect((await advanceTime(cid, 60, "The party walks until dusk")).ok).toBe(true);
  });

  it("runs a fight to the end", async () => {
    signInAs(dm);
    const e = await createEncounter(cid, "Wolves on the road");
    if (!e.ok || !e.id) throw new Error("setup");
    encId = e.id;
    await prisma.encounter.update({ where: { id: encId }, data: { gridWidth: 30, gridHeight: 20 } });
    expect((await addParty(encId)).ok).toBe(true);
    expect((await addMonster(encId, "wolf", 2)).ok).toBe(true);
    const rows = (await loadEncounter(encId))!.combatants;
    const by = (n: string) => rows.find((r) => r.name === n)!;
    await moveCombatant(by("Itest Ironhide").id, 5, 5);
    await moveCombatant(by("Itest Mirela").id, 3, 5);
    await moveCombatant(by("Wolf 1").id, 6, 5);
    await moveCombatant(by("Wolf 2").id, 7, 5);
    expect((await startEncounter(encId)).ok).toBe(true);

    const fighter = by("Itest Ironhide");
    const wizard = by("Itest Mirela");
    const weapon = (await prisma.character.findUniqueOrThrow({ where: { id: fighterId } })).equipment as { kind: string; equipped?: boolean; name: string }[];
    const weaponName = weapon.find((i) => i.kind === "weapon" && i.equipped)?.name ?? "Unarmed strike";

    // up to 12 rounds; whoever's turn it is acts, the DM finishes any wolf left standing so the test always ends
    for (let guard = 0; guard < 60; guard++) {
      const now = (await loadEncounter(encId))!;
      const foes = now.combatants.filter((c) => c.kind === "monster" && !c.defeated);
      if (!foes.length) break;
      const active = now.combatants[now.activeIndex];
      if (now.round > 12) {
        for (const f of foes) await adjustHitPoints(f.id, "damage", 999);
        break;
      }
      if (active.id === fighter.id) {
        signInAs(ann);
        for (let swing = 0; swing < 2; swing++) {
          const live = (await loadEncounter(encId))!.combatants.find((c) => c.kind === "monster" && !c.defeated);
          if (live) await attack({ attackerId: fighter.id, targetId: live.id, attack: weaponName });
        }
      } else if (active.id === wizard.id) {
        signInAs(bo);
        const live = (await loadEncounter(encId))!.combatants.find((c) => c.kind === "monster" && !c.defeated);
        if (live) {
          const cast = await castInCombat({ casterId: wizard.id, spell: "fire-bolt", targetIds: [live.id] });
          expect(cast.ok).toBe(true);
        }
      }
      signInAs(dm);
      expect((await endTurn(encId)).ok).toBe(true);
    }

    const end = (await loadEncounter(encId))!;
    expect(end.combatants.filter((c) => c.kind === "monster").every((c) => c.defeated)).toBe(true);
    // nobody ended with impossible hit points, and the sheets match the encounter
    for (const hero of [fighter, wizard]) {
      const row = end.combatants.find((c) => c.id === hero.id)!;
      expect(row.hp).toBeGreaterThanOrEqual(0);
      expect(row.hp).toBeLessThanOrEqual(row.maxHp);
      expect((await prisma.character.findUniqueOrThrow({ where: { id: row.characterId! } })).currentHp).toBe(row.hp);
    }
    expect(await prisma.campaignEvent.count({ where: { campaignId: cid, type: "combat" } })).toBeGreaterThan(5);
  });

  it("awards XP, rests, levels up and saves the evening", async () => {
    signInAs(dm);
    const xpBefore = (await prisma.character.findUniqueOrThrow({ where: { id: fighterId } })).xp;
    expect((await endEncounter(encId)).ok).toBe(true);
    const xpAfter = (await prisma.character.findUniqueOrThrow({ where: { id: fighterId } })).xp;
    expect(xpAfter - xpBefore).toBe(50); // two wolves, 100 XP split between two heroes

    expect((await partyRest(cid, "long")).ok).toBe(true);
    for (const id of [fighterId, wizardId]) {
      const c = await prisma.character.findUniqueOrThrow({ where: { id } });
      expect(c.currentHp).toBeGreaterThan(0);
    }
    expect((await awardMilestone(cid)).ok).toBe(true);
    await addExperience(fighterId, 0);
    signInAs(ann);
    expect((await levelUpCharacter(fighterId, { classIndex: "fighter" })).ok).toBe(true);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: fighterId } })).classes).toEqual([{ classIndex: "fighter", level: 2 }]);

    signInAs(dm);
    await createEntry(cid, { kind: "NOTE", title: "Next time", body: "Find where the wolves came from" });
    expect((await endSession(cid, "The party drove off a wolf pack on the north road.", "Follow the tracks")).ok).toBe(true);
    const events = await prisma.campaignEvent.findMany({ where: { campaignId: cid }, orderBy: { id: "asc" } });
    const text = events.map((e) => JSON.stringify(e.payload)).join(" ");
    expect(text).toContain("Session 1 begins");
    expect(text).toContain("Session 1 ends");
    expect(text).toContain("Wolves on the road is over");
  });
});
