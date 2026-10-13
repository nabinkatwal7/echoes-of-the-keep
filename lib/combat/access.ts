import type { Combatant, Encounter } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Actor } from "./commit";
import { loadEncounter, roleIn } from "./store";

export type Result = { ok: true; id?: string } | { ok: false; errors: string[] };
export const fail = (m: string): Result => ({ ok: false, errors: [m] });
export const refresh = (campaignId: string) => {
  revalidatePath(`/campaigns/${campaignId}/combat`);
};

export type Ctx = { user: Actor; enc: Encounter & { combatants: Combatant[] }; isDm: boolean };

export async function context(encounterId: string): Promise<Ctx | Result> {
  const u = await requireUser();
  const enc = await loadEncounter(encounterId);
  if (!enc) return fail("Encounter not found");
  const role = await roleIn(enc.campaignId, u.id);
  if (!role) return fail("You are not in this campaign");
  return { user: { id: u.id, name: u.name ?? "Someone" }, enc, isDm: role === "DM" };
}
export const isCtx = (c: Ctx | Result): c is Ctx => "enc" in c;

async function ownsCharacter(userId: string, characterId: string | null) {
  if (!characterId) return false;
  return !!(await prisma.character.findFirst({ where: { id: characterId, ownerId: userId }, select: { id: true } }));
}

export async function canControl(ctx: Ctx, row: Combatant) {
  return ctx.isDm || (await ownsCharacter(ctx.user.id, row.characterId));
}


export type Acting = { error: Result; row?: undefined; ctx?: undefined } | { error?: undefined; row: Combatant; ctx: Ctx };

export async function loadActing(combatantId: string): Promise<Acting> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return { error: fail("Combatant not found") };
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return { error: ctx };
  if (!(await canControl(ctx, row))) return { error: fail("Not allowed") };
  return { row, ctx };
}

