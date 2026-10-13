"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { pay, purseValueCp, type Purse } from "@/engine/economy";
import { ATTITUDES, downtime, type Attitude, type DowntimeKind } from "@/engine/world";
import { requireUser } from "@/lib/auth";
import { audit, editable } from "@/lib/characters/access";
import { prisma } from "@/lib/prisma";
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

/** Backdrops must be plain https images so a scene cannot point at anything else. */
const safeImageUrl = (u: string) => {
  if (!u) return true;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && /\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

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
