import type { Prisma } from "@prisma/client";
import { BLUEPRINTS } from "@/engine/bots/blueprints";
import { SUBCLASS_LEVEL } from "@/engine/classes/subclasses";
import { buildEncounter, partyLevel, THEME_POOLS } from "@/engine/solo/encounters";
import { foeList, lootTable, narrate, placeFor, SCENES, titleFor, type SceneKind } from "@/engine/solo/story";
import { asiLevels } from "@/engine/progression";
import { runAs } from "@/lib/actAs";
import { levelUpCharacter } from "@/lib/characters/actions";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { takeShortRest } from "@/lib/characters/playActions";
import { addMonster, addParty, createEncounter, endEncounter, startEncounter } from "@/lib/combat/actions";
import { prisma } from "@/lib/prisma";
import { awardMilestone, splitCoin } from "@/lib/world/playActions";
import { readSolo, type SoloConfig } from "./config";
import { chooseSpells } from "./party";
import { CASTING_ABILITY } from "@/engine/spells";
import { CASTER_KIND } from "@/engine/classes/spellcasting";
import { saveSpellSelection } from "@/lib/characters/playActions";
import type { ClassLevel } from "@/engine/progression";

/** Where the adventure stands, stored in the campaign's `world.solo`. */
export type AdventureState = {
  chapter: number;
  sceneIndex: number;
  title: string;
  place: string;
  encounterId: string | null;
  /** times the party was beaten in this scene; each one makes the next try gentler */
  setbacks: number;
  complete: boolean;
};

const rand = () => Math.random();

export const readAdventure = (world: unknown): AdventureState | null => {
  const w = world && typeof world === "object" ? (world as { solo?: unknown }) : {};
  const s = w.solo && typeof w.solo === "object" ? (w.solo as Partial<AdventureState>) : null;
  if (!s || typeof s.chapter !== "number") return null;
  return { chapter: s.chapter, sceneIndex: s.sceneIndex ?? 0, title: s.title ?? "", place: s.place ?? "", encounterId: s.encounterId ?? null, setbacks: s.setbacks ?? 0, complete: !!s.complete };
};

async function save(campaignId: string, state: AdventureState) {
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { world: true } });
  const world = camp.world && typeof camp.world === "object" ? (camp.world as object) : {};
  await prisma.campaign.update({ where: { id: campaignId }, data: { world: { ...world, solo: state } as unknown as Prisma.InputJsonValue } });
}

const tell = (campaignId: string, text: string) =>
  prisma.campaignEvent.create({ data: { campaignId, actorId: null, type: "system", audience: "ALL", payload: { text, narration: true } } });

/** Run `fn` as the Dungeon Master: the computer's account in player mode, the person in DM mode. */
async function asDm<T>(campaignId: string, solo: SoloConfig, fn: () => Promise<T>): Promise<T> {
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { dmId: true } });
  const dm = await prisma.user.findUniqueOrThrow({ where: { id: solo.botDmId ?? camp.dmId }, select: { id: true, displayName: true } });
  return runAs({ id: dm.id, name: dm.displayName }, fn);
}

async function party(campaignId: string) {
  const links = await prisma.campaignCharacter.findMany({ where: { campaignId }, include: { character: true } });
  return links.map((l) => l.character);
}

const levelOf = (c: { classes: unknown }) => (c.classes as ClassLevel[]).reduce((s, k) => s + k.level, 0);

/** Pick and start a fight that suits the party. Used by the computer DM, and by a human DM's "generate an encounter" button. */
export async function makeEncounter(campaignId: string, theme: string, target: "easy" | "medium" | "hard", boss: boolean, name: string): Promise<{ id: string; foes: string } | null> {
  const heroes = (await party(campaignId)).filter((c) => !((c.conditions as string[]) ?? []).includes("dead"));
  if (!heroes.length) return null;
  const wanted = THEME_POOLS[theme] ?? THEME_POOLS.crypt;
  const rows = await prisma.creature.findMany({ where: { index: { in: wanted }, campaignId: null }, select: { index: true, name: true, challenge: true } });
  const found = buildEncounter({ pool: rows.map((r) => ({ index: r.index, challenge: r.challenge ?? "0" })), partyLevels: heroes.map(levelOf), target, boss, rand });
  if (!found) return null;
  const made = await createEncounter(campaignId, name);
  if (!made.ok || !made.id) return null;
  await addParty(made.id);
  const names: { name: string; count: number }[] = [];
  for (const p of found.picks) {
    const added = await addMonster(made.id, p.index, p.count);
    if (!added.ok) return null;
    names.push({ name: rows.find((r) => r.index === p.index)!.name, count: p.count });
  }
  return { id: made.id, foes: foeList(names) };
}

const TARGETS: Record<string, "easy" | "medium" | "hard"> = { "fight-1": "easy", "fight-2": "medium", boss: "hard" };

/** Hit dice are spent for the hurt, up to two each, so the party is ready for the next fight. */
async function shortRestParty(campaignId: string) {
  for (const c of await party(campaignId)) {
    const maxHp = deriveStored(c as unknown as StoredCharacter).maxHp;
    if (c.currentHp >= maxHp || ((c.conditions as string[]) ?? []).includes("dead")) continue;
    const dice = Object.entries((c.hitDiceSpent ?? {}) as Record<string, { total: number; spent: number }>)
      .map(([die, v]) => ({ die: Number(die), count: Math.min(2, Math.max(0, v.total - v.spent)) }))
      .filter((d) => d.count > 0);
    if (dice.length) await takeShortRest(c.id, dice);
  }
}

/** Raise every computer hero a level when the milestone is reached, choosing like a sensible player. */
export async function levelUpBots(campaignId: string, solo: SoloConfig) {
  for (const c of await party(campaignId)) {
    if (c.ownerId === solo.humanId) continue;
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: c.ownerId }, select: { id: true, displayName: true } });
    const classes = c.classes as ClassLevel[];
    const main = classes[0];
    const bp = BLUEPRINTS.find((b) => b.classIndex === main.classIndex);
    if (!bp || levelOf(c) >= 20) continue;
    await runAs({ id: owner.id, name: owner.displayName }, async () => {
      const next = main.level + 1;
      const r = await levelUpCharacter(c.id, {
        classIndex: main.classIndex,
        ...(SUBCLASS_LEVEL[main.classIndex] === next && !main.subclassIndex ? { subclassIndex: bp.subclassIndex } : {}),
        ...(asiLevels(main.classIndex).includes(next) ? { improvement: { kind: "asi" as const, abilities: [bp.primary] } } : {}),
      });
      if (!r.ok) return;
      if (CASTER_KIND[main.classIndex]) {
        const row = await prisma.character.findUniqueOrThrow({ where: { id: c.id } });
        const score = deriveStored(row as unknown as StoredCharacter).abilities[CASTING_ABILITY[main.classIndex]].score;
        const sel = await chooseSpells(main.classIndex, next, score, { cantrips: bp.cantrips, spells: bp.spells });
        if (sel) await saveSpellSelection(c.id, main.classIndex, sel);
      }
    });
  }
}

/** One step forward in the story. Starts the next scene; fights are then played turn by turn. */
export async function advanceAdventure(campaignId: string): Promise<{ ok: true; message: string; encounterId?: string } | { ok: false; error: string }> {
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { settings: true, world: true, name: true } });
  const solo = readSolo(camp.settings);
  if (!solo || solo.mode !== "player") return { ok: false, error: "The computer Dungeon Master is only in games where you play a hero" };
  let state = readAdventure(camp.world);
  if (!state) return { ok: false, error: "This game has no adventure yet" };

  if (state.encounterId) {
    const enc = await prisma.encounter.findUnique({ where: { id: state.encounterId } });
    if (enc && enc.state !== "DONE") return { ok: false, error: "A fight is still under way" };
    state = { ...state, encounterId: null };
  }
  if (state.complete) {
    const theme = solo.theme;
    state = { ...state, chapter: state.chapter + 1, sceneIndex: 0, complete: false, setbacks: 0, place: placeFor(theme, rand), title: titleFor(theme, state.chapter + 1, rand) };
  }

  const kind: SceneKind = SCENES[state.sceneIndex];
  return asDm(campaignId, solo, async () => {
    if (kind === "intro") {
      await tell(campaignId, narrate("intro", solo.theme, rand, { place: state!.place }));
      await save(campaignId, { ...state!, sceneIndex: state!.sceneIndex + 1 });
      return { ok: true as const, message: "The story begins." };
    }
    if (kind === "fight-1" || kind === "fight-2" || kind === "boss") {
      const order = ["easy", "medium", "hard"] as const;
      const level = Math.max(0, order.indexOf(TARGETS[kind]) - Math.min(2, state!.setbacks));
      const made = await makeEncounter(campaignId, solo.theme, order[level], kind === "boss", `${state!.title.replace(/^Chapter \d+: /, "")}: ${kind === "boss" ? "the final chamber" : kind === "fight-1" ? "first blood" : "deeper in"}`);
      if (!made) return { ok: false as const, error: "No suitable foes could be found for this party" };
      await tell(campaignId, narrate(kind, solo.theme, rand, { foes: made.foes }));
      const started = await startEncounter(made.id);
      if (!started.ok) return { ok: false as const, error: started.errors[0] };
      await save(campaignId, { ...state!, encounterId: made.id });
      return { ok: true as const, message: `Combat begins against ${made.foes}.`, encounterId: made.id };
    }
    if (kind === "rest-1" || kind === "rest-2") {
      const loot = lootTable[Math.floor(rand() * lootTable.length)];
      const gold = Math.max(1, Math.round(partyLevel((await party(campaignId)).map(levelOf)) * (3 + Math.floor(rand() * 8))));
      await shortRestParty(campaignId);
      await splitCoin(campaignId, { gp: gold });
      await tell(campaignId, `${narrate(kind, solo.theme, rand, { loot })} The party's share comes to ${gold} gp.`);
      await save(campaignId, { ...state!, sceneIndex: state!.sceneIndex + 1 });
      return { ok: true as const, message: "The party rests and counts what they found." };
    }
    // epilogue
    await awardMilestone(campaignId);
    await levelUpBots(campaignId, solo);
    await tell(campaignId, `${narrate("epilogue", solo.theme, rand)} The heroes have grown: level up on your sheet when you are ready.`);
    await save(campaignId, { ...state!, complete: true });
    return { ok: true as const, message: "Chapter complete." };
  });
}

/**
 * Called after each turn: when a fight has been won or lost, close it and move the story on. Returns a line for the log, or null
 * when the fight goes on.
 */
export async function settleEncounter(encounterId: string): Promise<{ outcome: "victory" | "defeat"; text: string } | null> {
  const enc = await prisma.encounter.findUnique({ where: { id: encounterId }, include: { combatants: true } });
  if (!enc || enc.state !== "ACTIVE") return null;
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: enc.campaignId }, select: { settings: true, world: true } });
  const solo = readSolo(camp.settings);
  if (!solo || solo.mode !== "player") return null;
  const foesLeft = enc.combatants.some((c) => c.kind !== "character" && !(c.extra as { ally?: boolean } | null)?.ally && !c.defeated && c.hp > 0);
  const heroesLeft = enc.combatants.some((c) => c.kind === "character" && !c.defeated && c.hp > 0);
  if (foesLeft && heroesLeft) return null;

  const state = readAdventure(camp.world)!;
  return asDm(enc.campaignId, solo, async () => {
    await endEncounter(encounterId);
    if (!heroesLeft) {
      const text = narrate("defeat", solo.theme, rand);
      await tell(enc.campaignId, text);
      for (const c of await party(enc.campaignId)) {
        const maxHp = deriveStored(c as unknown as StoredCharacter).maxHp;
        await prisma.character.update({ where: { id: c.id }, data: { currentHp: maxHp, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 } } });
      }
      await save(enc.campaignId, { ...state, encounterId: null, setbacks: state.setbacks + 1 });
      return { outcome: "defeat" as const, text };
    }
    const text = narrate("victory", solo.theme, rand);
    await tell(enc.campaignId, text);
    await save(enc.campaignId, { ...state, encounterId: null, sceneIndex: state.sceneIndex + 1, setbacks: 0 });
    return { outcome: "victory" as const, text };
  });
}
