import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign } from "@/lib/campaigns/actions";
import { addExperience, createCharacter, levelUpCharacter } from "@/lib/characters/actions";
import { saveSpellSelection } from "@/lib/characters/playActions";
import { addMonster, addParty, createEncounter, endTurn, moveCombatant, setFog, setInitiative, setWalls, startEncounter } from "@/lib/combat/actions";
import { castCounterspell, castInCombat, endCombatConcentration, summonCreature } from "@/lib/combat/spellActions";
import { loadEncounter } from "@/lib/combat/store";
import { buildEncounterView } from "@/lib/combat/view";
import { prisma } from "@/lib/prisma";

const wizard = {
  name: "Itest Evoker",
  raceIndex: "human",
  classIndex: "wizard",
  backgroundIndex: "sage",
  abilityMethod: "standard" as const,
  scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  classSkills: ["investigation", "medicine"] as ("investigation" | "medicine")[],
};

describe.skipIf(!RUN_DB)("spells in combat (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let encId = "";
  let heroId = "";
  const rows = async () => (await loadEncounter(encId))!;
  const byName = async (n: string) => (await rows()).combatants.find((c) => c.name === n)!;

  beforeAll(async () => {
    dm = await makeUser("dm");
    owner = await makeUser("owner");
    signInAs(dm);
    const camp = await createCampaign("Itest Spells");
    if (!camp.ok) throw new Error("setup");
    signInAs(owner);
    const c = await createCharacter(wizard, "kit");
    if (!c.ok) throw new Error(c.errors.join());
    heroId = c.id;
    await addExperience(heroId, 300);
    await levelUpCharacter(heroId, { classIndex: "wizard", subclassIndex: "school-of-evocation" });
    await saveSpellSelection(heroId, "wizard", {
      known: [],
      spellbook: ["magic-missile", "shield", "sleep", "burning-hands", "mage-armor", "identify"],
      prepared: ["fire-bolt", "light", "magic-missile", "shield", "burning-hands", "sleep"],
    });
    // the DM must be able to join the table to attach; the owner joins by code
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: camp.id } })).inviteCode;
    const { joinCampaign } = await import("@/lib/campaigns/actions");
    await joinCampaign(code);
    await attachCharacter(camp.id, heroId);
    signInAs(dm);
    const e = await createEncounter(camp.id, "Wolves");
    if (!e.ok || !e.id) throw new Error("setup");
    encId = e.id;
    await prisma.encounter.update({ where: { id: encId }, data: { gridWidth: 40, gridHeight: 40 } });
    await addParty(encId);
    await addMonster(encId, "wolf", 3);
    const hero = await byName("Itest Evoker");
    await setInitiative(hero.id, 20);
    for (const w of ["Wolf 1", "Wolf 2", "Wolf 3"]) await setInitiative((await byName(w)).id, 5);
    // line the pack up in front of the wizard
    await moveCombatant(hero.id, 2, 10);
    await moveCombatant((await byName("Wolf 1")).id, 5, 10);
    await moveCombatant((await byName("Wolf 2")).id, 5, 11);
    await moveCombatant((await byName("Wolf 3")).id, 35, 35);
    await startEncounter(encId);
  });
  afterAll(cleanup);

  it("a cantrip attack spends the action and no slot", async () => {
    signInAs(owner);
    const hero = await byName("Itest Evoker");
    const w = await byName("Wolf 1");
    const r = await castInCombat({ casterId: hero.id, spell: "fire-bolt", targetIds: [w.id] });
    expect(r).toEqual({ ok: true });
    expect(((await byName("Itest Evoker")).turn as { action: boolean }).action).toBe(false);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).spellSlotsUsed).toEqual([]);
    expect((await castInCombat({ casterId: hero.id, spell: "fire-bolt", targetIds: [w.id] })).ok).toBe(false); // no action left
  });

  it("rejects out-of-range targets and targets beyond the limit", async () => {
    signInAs(dm);
    await endTurn(encId); // hero
    for (let i = 0; i < 3; i++) await endTurn(encId); // wolves, back to the hero in round 2
    signInAs(owner);
    const hero = await byName("Itest Evoker");
    const far = await byName("Wolf 3");
    const farTry = await castInCombat({ casterId: hero.id, spell: "magic-missile", targetIds: [far.id] });
    expect(farTry.ok).toBe(false);
    const w1 = await byName("Wolf 1");
    const w2 = await byName("Wolf 2");
    const w3 = await byName("Wolf 3");
    expect((await castInCombat({ casterId: hero.id, spell: "magic-missile", targetIds: [w1.id, w2.id, w3.id, hero.id] })).ok).toBe(false);
  });

  it("an area spell hits whoever stands in the cone and spends a slot", async () => {
    signInAs(owner);
    const hero = await byName("Itest Evoker");
    const before1 = (await byName("Wolf 1")).hp;
    const before3 = (await byName("Wolf 3")).hp;
    // burning hands: 15-foot cone toward (5,10); Wolf 1 at distance 3 squares is in it, Wolf 3 is far away
    const r = await castInCombat({ casterId: hero.id, spell: "burning-hands", point: { x: 5, y: 10 } });
    expect(r).toEqual({ ok: true });
    expect((await byName("Wolf 1")).hp).toBeLessThanOrEqual(before1);
    expect((await byName("Wolf 3")).hp).toBe(before3);
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).spellSlotsUsed).toEqual([1]);
  });

  it("Shield is a reaction that raises AC, and bonus-action rules are enforced", async () => {
    signInAs(owner);
    const hero = await byName("Itest Evoker");
    const r = await castInCombat({ casterId: hero.id, spell: "shield" });
    expect(r).toEqual({ ok: true });
    const after = await byName("Itest Evoker");
    expect((after.extra as { buffs: { acBonus?: number }[] }).buffs[0].acBonus).toBe(5);
    expect((after.turn as { reaction: boolean }).reaction).toBe(false);
    expect((await castInCombat({ casterId: hero.id, spell: "shield" })).ok).toBe(false); // reaction spent
  });

  it("counterspell needs a prepared spell and a high enough slot; summons join the party's side", async () => {
    signInAs(owner);
    const hero = await byName("Itest Evoker");
    expect((await castCounterspell(hero.id, 3, 3)).ok).toBe(false);
    expect((await summonCreature(encId, hero.id, "wolf", 1)).ok).toBe(true);
    const ally = (await rows()).combatants.find((c) => c.name.includes("summon"))!;
    expect((ally.extra as { ally?: boolean }).ally).toBe(true);
    signInAs(dm);
    expect((await endCombatConcentration(hero.id)).ok).toBe(false); // not concentrating
  });

  it("conjures allies within the spell's limits and they vanish when concentration ends", async () => {
    await prisma.character.update({
      where: { id: heroId },
      data: {
        classes: [{ classIndex: "druid", level: 5 }],
        spellSlotsUsed: [],
        spells: { byClass: { druid: { known: [], spellbook: [], prepared: ["conjure-animals"] } }, concentration: null },
      },
    });
    signInAs(dm);
    const e = await createEncounter((await rows()).campaignId, "Grove");
    if (!e.ok || !e.id) throw new Error("setup");
    const enc2 = e.id;
    await prisma.encounter.update({ where: { id: enc2 }, data: { gridWidth: 20, gridHeight: 20 } });
    await addParty(enc2);
    await addMonster(enc2, "wolf", 1);
    const hero2 = (await loadEncounter(enc2))!.combatants.find((c) => c.name === "Itest Evoker")!;
    await moveCombatant(hero2.id, 5, 5);
    await setInitiative(hero2.id, 20);
    await startEncounter(enc2);

    signInAs(owner);
    // the rules are checked before anything is spent
    expect((await castInCombat({ casterId: hero2.id, spell: "conjure-animals", slotLevel: 3 })).ok).toBe(false); // no choice made
    expect((await castInCombat({ casterId: hero2.id, spell: "conjure-animals", slotLevel: 3, summon: { creatureIndex: "skeleton", count: 1 } })).ok).toBe(false); // not a beast
    expect((await castInCombat({ casterId: hero2.id, spell: "conjure-animals", slotLevel: 3, summon: { creatureIndex: "wolf", count: 9 } })).ok).toBe(false); // eight at most
    expect((await prisma.character.findUniqueOrThrow({ where: { id: heroId } })).spellSlotsUsed).toEqual([]);

    expect(await castInCombat({ casterId: hero2.id, spell: "conjure-animals", slotLevel: 3, summon: { creatureIndex: "wolf", count: 4 } })).toEqual({ ok: true });
    const after = (await loadEncounter(enc2))!;
    const pack = after.combatants.filter((c) => (c.extra as { summonedBy?: string }).summonedBy === hero2.id);
    expect(pack).toHaveLength(4);
    expect(new Set(pack.map((c) => `${c.x},${c.y}`)).size).toBe(4); // each on its own square
    expect(pack.every((c) => (c.extra as { ally?: boolean }).ally)).toBe(true);

    // the pack is gone when the druid stops concentrating
    expect((await endCombatConcentration(hero2.id)).ok).toBe(true);
    const gone = (await loadEncounter(enc2))!.combatants.filter((c) => (c.extra as { summonedBy?: string }).summonedBy === hero2.id);
    expect(gone.every((c) => c.defeated)).toBe(true);
  });

  it("walls block movement, sight and spells; fog hides foes from players only", async () => {
    await prisma.character.update({
      where: { id: heroId },
      data: { classes: [{ classIndex: "wizard", level: 2, subclassIndex: "school-of-evocation" }], spellSlotsUsed: [], spells: { byClass: { wizard: { known: [], spellbook: ["magic-missile"], prepared: ["fire-bolt", "magic-missile"] } }, concentration: null } },
    });
    signInAs(dm);
    const e = await createEncounter((await rows()).campaignId, "Walled hall");
    if (!e.ok || !e.id) throw new Error("setup");
    const enc3 = e.id;
    await prisma.encounter.update({ where: { id: enc3 }, data: { gridWidth: 20, gridHeight: 20 } });
    await addParty(enc3);
    await addMonster(enc3, "wolf", 1);
    const load = async () => (await loadEncounter(enc3))!;
    const named = async (n: string) => (await load()).combatants.find((c) => c.name === n)!;
    const hero3 = await named("Itest Evoker");
    const wolf = await named("Wolf");
    await moveCombatant(hero3.id, 2, 5);
    await moveCombatant(wolf.id, 8, 5);

    // a wall across the room: three squares at x=5
    expect((await setWalls(enc3, [{ x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }], true)).ok).toBe(true);
    signInAs(owner);
    expect((await setWalls(enc3, [{ x: 1, y: 1 }], true)).ok).toBe(false); // players do not draw walls
    signInAs(dm);
    expect((await setWalls(enc3, [{ x: 2, y: 5 }], true)).ok).toBe(false); // a creature stands there
    expect((await moveCombatant(wolf.id, 5, 5)).ok).toBe(false); // cannot be placed on a wall
    await setInitiative(hero3.id, 20);
    await startEncounter(enc3);

    signInAs(owner);
    const blocked = await castInCombat({ casterId: hero3.id, spell: "fire-bolt", targetIds: [wolf.id] });
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.errors[0]).toContain("wall");

    // fog: the players' view drops a foe the party cannot see, the DM's does not
    signInAs(dm);
    await setFog(enc3, true);
    const view = async (isDm: boolean) => buildEncounterView(await load(), { userId: isDm ? dm.id : owner.id, isDm }, new Set([heroId]));
    expect((await view(false)).combatants.some((c) => c.name === "Wolf")).toBe(false);
    expect((await view(false)).visible).not.toBeNull();
    expect((await view(true)).combatants.some((c) => c.name === "Wolf")).toBe(true);
    expect((await view(true)).visible).toBeNull();
    expect((await view(true)).walls).toContain("5,5");
    await setFog(enc3, false);

    // the hero has to walk around the wall, which costs more than the straight line
    signInAs(owner);
    const before = ((await named("Itest Evoker")).turn as { movement: number }).movement;
    expect((await moveCombatant(hero3.id, 8, 4)).ok).toBe(true);
    const spent = before - ((await named("Itest Evoker")).turn as { movement: number }).movement;
    expect(spent).toBeGreaterThanOrEqual(30);
  });
});
