"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { blueprintFor, pickBlueprints, pickName } from "@/engine/bots/blueprints";
import { placeFor, titleFor } from "@/engine/solo/story";
import type { ClassLevel } from "@/engine/progression";
import { requireUser } from "@/lib/auth";
import { newInviteCode } from "@/lib/campaigns/visibility";
import { prisma } from "@/lib/prisma";
import { MAX_SOLO_GAMES, soloGamesOf } from "./games";
import { THEMES, readSolo, type SoloConfig, type Theme } from "./config";
import { advanceAdventure, makeEncounter, type AdventureState } from "./director";
import { buildBotHero, createBotUser } from "./party";
import { startEncounter } from "@/lib/combat/actions";

type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };
const fail = (m: string): { ok: false; errors: string[] } => ({ ok: false, errors: [m] });

export type NewSoloGame = {
  mode: "player" | "dm";
  /** computer heroes in the party (1-4 in player mode alongside yours, 2-5 in DM mode) */
  bots: number;
  /** level of the computer heroes and of a premade hero (1-5) */
  level: number;
  theme: Theme;
  /** player mode: play this hero of yours... */
  heroId?: string;
  /** ...or a premade one of this class */
  heroKey?: string;
};

/** Start a solo game: a computer Dungeon Master or computer heroes (or both) fill the table around you. */
export async function startSoloGame(input: NewSoloGame): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  if (input.mode !== "player" && input.mode !== "dm") return fail("Choose whether you play a hero or run the game");
  if (!THEMES.includes(input.theme)) return fail("Choose an adventure");
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return fail("Start at level 1 to 5");
  const maxBots = input.mode === "player" ? 4 : 5;
  const minBots = input.mode === "player" ? 1 : 2;
  if (!Number.isInteger(input.bots) || input.bots < minBots || input.bots > maxBots) return fail(`Choose ${minBots} to ${maxBots} computer heroes`);
  if ((await soloGamesOf(user.id)).length >= MAX_SOLO_GAMES) return fail(`You can keep ${MAX_SOLO_GAMES} solo games at once. Remove one first.`);

  const me = { id: user.id, name: user.name ?? "Adventurer" };
  let humanHeroId: string | null = null;
  let humanClass: string | null = null;
  let level = input.level;
  if (input.mode === "player") {
    if (input.heroId) {
      const hero = await prisma.character.findFirst({ where: { id: input.heroId, ownerId: user.id } });
      if (!hero) return fail("That hero is not yours");
      humanHeroId = hero.id;
      const classes = hero.classes as ClassLevel[];
      humanClass = classes[0]?.classIndex ?? null;
      level = Math.min(5, Math.max(1, classes.reduce((s, k) => s + k.level, 0)));
    } else {
      const key = input.heroKey ?? "fighter";
      const bp = blueprintFor(key);
      if (!bp) return fail("Unknown hero type");
      humanClass = bp.classIndex;
    }
  }

  const created: string[] = [];
  try {
    const bpList = pickBlueprints(input.bots, humanClass ? [humanClass] : []);
    const dmBot = input.mode === "player" ? await createBotUser("The Dungeon Master") : null;
    if (dmBot) created.push(dmBot.id);

    if (input.mode === "player" && !humanHeroId) {
      const bp = blueprintFor(input.heroKey ?? "fighter")!;
      humanHeroId = await buildBotHero(me, bp, level, pickName(bp, []));
    }

    const used: string[] = [];
    const botHeroes: { ownerId: string; heroId: string }[] = [];
    for (const bp of bpList) {
      const name = pickName(bp, used);
      used.push(name);
      const owner = await createBotUser(name);
      created.push(owner.id);
      const heroId = await buildBotHero({ id: owner.id, name }, bp, level, name);
      botHeroes.push({ ownerId: owner.id, heroId });
    }

    const place = placeFor(input.theme, Math.random);
    const state: AdventureState = { chapter: 1, sceneIndex: 0, title: titleFor(input.theme, 1, Math.random), place, encounterId: null, setbacks: 0, complete: false };
    const solo: SoloConfig = { humanId: user.id, mode: input.mode, autoMonsters: false, botDmId: dmBot?.id ?? null, botIds: botHeroes.map((b) => b.ownerId), theme: input.theme };
    const campaign = await prisma.campaign.create({
      data: {
        name: `Solo: ${state.title.replace(/^Chapter \d+: /, "")}`,
        description: input.mode === "player" ? "A solo game with a computer Dungeon Master and companions." : "A solo game: you run it, computer heroes play the party.",
        dmId: dmBot?.id ?? user.id,
        inviteCode: newInviteCode(),
        settings: { solo, flanking: false } as unknown as Prisma.InputJsonValue,
        world: { solo: state } as unknown as Prisma.InputJsonValue,
        members: {
          create: [
            { userId: dmBot?.id ?? user.id, role: "DM" },
            ...(dmBot ? [{ userId: user.id, role: "PLAYER" }] : []),
            ...botHeroes.map((b) => ({ userId: b.ownerId, role: "PLAYER" })),
          ],
        },
      },
    });
    await prisma.campaignCharacter.createMany({ data: [...(humanHeroId ? [humanHeroId] : []), ...botHeroes.map((b) => b.heroId)].map((characterId) => ({ campaignId: campaign.id, characterId })) });
    await prisma.campaignEvent.create({ data: { campaignId: campaign.id, actorId: null, type: "system", audience: "ALL", payload: { text: input.mode === "player" ? `A new tale begins. ${botHeroes.length} companions join you.` : `The party is ready. ${botHeroes.length} computer heroes await your direction.` } } });
    revalidatePath("/solo");
    return { ok: true, id: campaign.id };
  } catch (e) {
    // do not leave orphaned bot accounts behind
    await prisma.user.deleteMany({ where: { id: { in: created }, isBot: true } });
    return fail(e instanceof Error ? e.message : "The game could not be created");
  }
}

async function mySolo(campaignId: string) {
  const user = await requireUser();
  const camp = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { settings: true } });
  const solo = camp ? readSolo(camp.settings) : null;
  if (!solo || solo.humanId !== user.id) return null;
  return { user, solo };
}

/** Move the story on: the next scene, fight or rest. */
export async function continueStory(campaignId: string): Promise<Result<{ message: string; encounterId?: string }>> {
  if (!(await mySolo(campaignId))) return fail("This is not your solo game");
  const r = await advanceAdventure(campaignId);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/solo`);
  revalidatePath(`/campaigns/${campaignId}/combat`);
  return r.ok ? { ok: true, message: r.message, encounterId: r.encounterId } : fail(r.error);
}

/** DM mode: let the computer play the monsters' turns too. */
export async function setAutoMonsters(campaignId: string, on: boolean): Promise<Result> {
  const mine = await mySolo(campaignId);
  if (!mine) return fail("This is not your solo game");
  if (mine.solo.mode !== "dm") return fail("The computer already plays the monsters in this game");
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { settings: true } });
  const settings = (camp.settings ?? {}) as Record<string, unknown>;
  await prisma.campaign.update({ where: { id: campaignId }, data: { settings: { ...settings, solo: { ...mine.solo, autoMonsters: on } } as unknown as Prisma.InputJsonValue } });
  revalidatePath(`/campaigns/${campaignId}/combat`);
  return { ok: true };
}

/** DM mode: have the computer set up a fight suited to the party, ready to start. */
export async function generateEncounter(campaignId: string, difficulty: "easy" | "medium" | "hard", start = false): Promise<Result<{ id: string; foes: string }>> {
  const mine = await mySolo(campaignId);
  if (!mine) return fail("This is not your solo game");
  if (mine.solo.mode !== "dm") return fail("In this game the computer Dungeon Master chooses the fights");
  const made = await makeEncounter(campaignId, mine.solo.theme, difficulty, false, `${difficulty[0].toUpperCase()}${difficulty.slice(1)} fight`);
  if (!made) return fail("No suitable foes could be found for this party");
  if (start) {
    const r = await startEncounter(made.id);
    if (!r.ok) return r;
  }
  revalidatePath(`/campaigns/${campaignId}/combat`);
  return { ok: true, id: made.id, foes: made.foes };
}

/** End and delete a solo game and the computer players that were in it. */
export async function deleteSoloGame(campaignId: string): Promise<Result> {
  const mine = await mySolo(campaignId);
  if (!mine) return fail("This is not your solo game");
  const bots = [...mine.solo.botIds, ...(mine.solo.botDmId ? [mine.solo.botDmId] : [])];
  await prisma.campaign.delete({ where: { id: campaignId } });
  await prisma.user.deleteMany({ where: { id: { in: bots }, isBot: true } });
  revalidatePath("/solo");
  return { ok: true };
}

