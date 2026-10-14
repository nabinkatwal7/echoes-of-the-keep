"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { pay, purseValueCp, type Purse } from "@/engine/economy";
import { parseDice } from "@/engine/dice";
import { XP_BY_CR } from "@/engine/xp";
import { ATTITUDES, downtime, type Attitude, type DowntimeKind } from "@/engine/world";
import { requireUser } from "@/lib/auth";
import { audit, editable } from "@/lib/characters/access";
import { prisma } from "@/lib/prisma";
import { homebrewSpellFields, type HomebrewSpellInput } from "./homebrewSpell";
import { safeImageUrl } from "@/lib/safeUrl";
import { dm, fail, say, touchWorld, type Result } from "./guard";

const text = (s: string, max: number) => s.trim().slice(0, max);

// ---------------------------------------------------------------- NPCs

export async function saveNpc(campaignId: string, input: { id?: string; name: string; role?: string; attitude?: Attitude; notes?: string; creatureIndex?: string }): Promise<Result<{ id: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (input.name.trim().length < 1 || input.name.length > 80) return fail("Give the NPC a name");
  if (input.attitude && !ATTITUDES.includes(input.attitude)) return fail("Attitude must be friendly, indifferent or hostile");
  const data = { name: input.name.trim(), role: text(input.role ?? "", 80), notes: text(input.notes ?? "", 4000), ...(input.attitude ? { attitude: input.attitude } : {}), creatureIndex: input.creatureIndex || null };
  if (input.id) {
    const n = await prisma.npc.updateMany({ where: { id: input.id, campaignId }, data });
    if (!n.count) return fail("NPC not found");
    touchWorld(campaignId);
    return { ok: true, id: input.id };
  }
  const n = await prisma.npc.create({ data: { ...data, campaignId } });
  touchWorld(campaignId);
  return { ok: true, id: n.id };
}

export async function setRevealed(campaignId: string, kind: "npc" | "location" | "quest", id: string, revealed: boolean): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const where = { id, campaignId };
  const n = kind === "npc" ? await prisma.npc.updateMany({ where, data: { revealed } }) : kind === "location" ? await prisma.location.updateMany({ where, data: { revealed } }) : await prisma.quest.updateMany({ where, data: { revealed } });
  if (!n.count) return fail("Not found");
  if (revealed) {
    const name = kind === "npc" ? (await prisma.npc.findUnique({ where: { id } }))?.name : kind === "location" ? (await prisma.location.findUnique({ where: { id } }))?.name : (await prisma.quest.findUnique({ where: { id } }))?.title;
    await say(campaignId, d.user.id, kind === "quest" ? `New quest: ${name}` : kind === "location" ? `The party learns of ${name}.` : `The party meets ${name}.`);
  }
  touchWorld(campaignId);
  return { ok: true };
}

export async function deleteWorldItem(campaignId: string, kind: "npc" | "location" | "quest", id: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (kind === "npc") await prisma.npc.deleteMany({ where: { id, campaignId } });
  else if (kind === "location") await prisma.location.deleteMany({ where: { id, campaignId } });
  else await prisma.quest.deleteMany({ where: { id, campaignId } });
  touchWorld(campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------- locations and scenes

export async function saveLocation(campaignId: string, input: { id?: string; name: string; description?: string; imageUrl?: string }): Promise<Result<{ id: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (input.name.trim().length < 1 || input.name.length > 80) return fail("Give the place a name");
  if (!safeImageUrl(input.imageUrl ?? "")) return fail("The map image must be an https link to a png, jpg, webp, gif or avif file");
  const data = { name: input.name.trim(), description: text(input.description ?? "", 4000), imageUrl: input.imageUrl ?? "" };
  if (input.id) {
    const n = await prisma.location.updateMany({ where: { id: input.id, campaignId }, data });
    if (!n.count) return fail("Location not found");
    touchWorld(campaignId);
    return { ok: true, id: input.id };
  }
  const l = await prisma.location.create({ data: { ...data, campaignId } });
  touchWorld(campaignId);
  return { ok: true, id: l.id };
}

/** Show one location to the whole table as the current scene (or clear it). */
export async function setScene(campaignId: string, locationId: string | null): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  await prisma.$transaction(async (tx) => {
    await tx.location.updateMany({ where: { campaignId }, data: { current: false } });
    if (locationId) await tx.location.updateMany({ where: { id: locationId, campaignId }, data: { current: true, revealed: true } });
  });
  if (locationId) {
    const l = await prisma.location.findUnique({ where: { id: locationId } });
    if (l) await say(campaignId, d.user.id, `Scene: ${l.name}`);
  }
  touchWorld(campaignId);
  revalidatePath(`/campaigns/${campaignId}/table`);
  return { ok: true };
}

// ---------------------------------------------------------------- quests

export async function saveQuest(campaignId: string, input: { id?: string; title: string; description?: string; reward?: string }): Promise<Result<{ id: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (input.title.trim().length < 1 || input.title.length > 120) return fail("Give the quest a title");
  const data = { title: input.title.trim(), description: text(input.description ?? "", 4000), reward: text(input.reward ?? "", 300) };
  if (input.id) {
    const n = await prisma.quest.updateMany({ where: { id: input.id, campaignId }, data });
    if (!n.count) return fail("Quest not found");
    touchWorld(campaignId);
    return { ok: true, id: input.id };
  }
  const q = await prisma.quest.create({ data: { ...data, campaignId } });
  touchWorld(campaignId);
  return { ok: true, id: q.id };
}

export async function setQuestStatus(campaignId: string, id: string, status: "ACTIVE" | "DONE" | "FAILED"): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const q = await prisma.quest.findFirst({ where: { id, campaignId } });
  if (!q) return fail("Quest not found");
  await prisma.quest.update({ where: { id }, data: { status } });
  if (q.revealed && status !== "ACTIVE") await say(campaignId, d.user.id, `Quest ${status === "DONE" ? "completed" : "failed"}: ${q.title}${status === "DONE" && q.reward ? `. Reward: ${q.reward}` : ""}`);
  touchWorld(campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------- downtime

/** Spend downtime days on an activity. Costs come out of the hero's purse. */
export async function spendDowntime(characterId: string, kind: DowntimeKind, days: number, opts: { itemName?: string; itemValueGp?: number; hasTools?: boolean } = {}): Promise<Result<{ summary: string }>> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const r = downtime(kind, days, { itemValueCp: Math.round((opts.itemValueGp ?? 0) * 100), proficientToolOrSkill: opts.hasTools });
  if (!r.ok) return fail(r.reason);
  const purse = c.currency as Purse;
  if (purseValueCp(purse) < r.costCp) return fail(`That costs ${(r.costCp / 100).toFixed(2)} gp and you only have ${(purseValueCp(purse) / 100).toFixed(2)} gp`);
  if (r.costCp > 0) await prisma.character.update({ where: { id: characterId }, data: { currency: pay(purse, r.costCp) as unknown as Prisma.InputJsonValue } });
  const summary = `${c.name} spends ${r.days} days on ${kind === "craft" && opts.itemName ? `crafting ${opts.itemName}` : kind}: ${r.summary}${r.costCp ? ` (-${(r.costCp / 100).toFixed(2)} gp)` : ""}`;
  await audit(characterId, c.name, user.id, user.name ?? "Someone", summary);
  return { ok: true, summary };
}

// ---------------------------------------------------------------- homebrew monsters

export type HomebrewAttack = { name: string; melee: boolean; toHit: number; dice: string; bonus: number; damageType: string; reach?: number; range?: { normal: number; long: number } };
export type HomebrewMonster = {
  name: string;
  size: string;
  type: string;
  armorClass: number;
  hitPoints: number;
  speed: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  challenge: string;
  attacks: HomebrewAttack[];
  /** how many attacks one Attack action makes */
  attacksPerAction?: number;
  resistances?: string;
};

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const DAMAGE_WORDS = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

/** One attack in the handbook's stat block wording, so the combat parser reads it back exactly. */
function attackLine(a: HomebrewAttack): string {
  const p = parseDice(a.dice);
  const avg = p.terms.reduce((s, t) => s + Math.floor((t.count * (t.sides + 1)) / 2), 0) + a.bonus;
  const how = a.melee ? `reach ${a.reach ?? 5} ft.` : `range ${a.range?.normal ?? 30}/${a.range?.long ?? 120} ft.`;
  const sign = a.bonus >= 0 ? `+ ${a.bonus}` : `- ${Math.abs(a.bonus)}`;
  return `${a.name}. ${a.melee ? "Melee" : "Ranged"} Weapon Attack: +${a.toHit} to hit, ${how}, one target. Hit: ${avg} (${a.dice}${a.bonus ? ` ${sign}` : ""}) ${a.damageType} damage.`;
}

export async function saveHomebrewMonster(campaignId: string, input: HomebrewMonster): Promise<Result<{ index: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) return fail("Give the monster a name (2-60 characters)");
  if (!SIZES.includes(input.size)) return fail("Choose a size");
  if (!(input.armorClass >= 1 && input.armorClass <= 30)) return fail("Armor class must be 1-30");
  if (!(input.hitPoints >= 1 && input.hitPoints <= 1000)) return fail("Hit points must be 1-1000");
  if (!(input.speed >= 0 && input.speed <= 200)) return fail("Speed must be 0-200 ft");
  if (!(input.challenge in XP_BY_CR)) return fail("Challenge rating must be 0, 1/8, 1/4, 1/2 or a whole number up to 30");
  for (const k of Object.values(input.abilities)) if (!Number.isInteger(k) || k < 1 || k > 30) return fail("Ability scores must be 1-30");
  if (input.attacks.length > 8) return fail("Give at most 8 attacks");
  const lines: string[] = [];
  for (const a of input.attacks) {
    if (a.name.trim().length < 2 || !/^[A-Z]/.test(a.name.trim())) return fail("Attack names start with a capital letter");
    if (!DAMAGE_WORDS.includes(a.damageType)) return fail(`Unknown damage type: ${a.damageType}`);
    if (!Number.isInteger(a.toHit) || a.toHit < -5 || a.toHit > 20 || !Number.isInteger(a.bonus) || a.bonus < -5 || a.bonus > 30) return fail("Attack bonuses are out of range");
    try {
      parseDice(a.dice);
    } catch {
      return fail(`"${a.dice}" is not a dice expression`);
    }
    lines.push(attackLine({ ...a, name: a.name.trim() }));
  }
  const per = input.attacksPerAction ?? 1;
  if (per > 1 && input.attacks.length) lines.unshift(`Multiattack. The ${name} makes ${["", "", "two", "three", "four"][Math.min(4, per)]} attacks.`);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const index = `hb-${campaignId.slice(-6).toLowerCase()}-${slug}`;
  const data = {
    name, size: input.size, type: text(input.type || "monster", 40), alignment: "unaligned", armorClass: String(input.armorClass), hitPoints: String(input.hitPoints),
    speed: `${input.speed} ft.`, abilities: input.abilities as unknown as Prisma.InputJsonValue, challenge: `${input.challenge} (${XP_BY_CR[input.challenge]} XP)`,
    damageResistances: text(input.resistances ?? "", 120) || null, text: lines.join("\n"), source: "HOMEBREW", pdfPages: [] as number[], campaignId,
  };
  await prisma.creature.upsert({ where: { index }, update: data, create: { index, ...data } });
  touchWorld(campaignId);
  return { ok: true, index };
}

export async function saveHomebrewSpell(campaignId: string, input: HomebrewSpellInput): Promise<Result<{ index: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const built = homebrewSpellFields(input);
  if (!built.ok) return fail(built.error);
  const slug = built.fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const index = `hb-${campaignId.slice(-6).toLowerCase()}-${slug}`;
  await prisma.spell.upsert({ where: { index }, update: { ...built.fields, campaignId }, create: { index, ...built.fields, campaignId } });
  touchWorld(campaignId);
  return { ok: true, index };
}

export async function deleteHomebrewSpell(campaignId: string, index: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  await prisma.spell.deleteMany({ where: { index, campaignId } });
  touchWorld(campaignId);
  return { ok: true };
}

export async function deleteHomebrewMonster(campaignId: string, index: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  await prisma.creature.deleteMany({ where: { index, campaignId } });
  touchWorld(campaignId);
  return { ok: true };
}
