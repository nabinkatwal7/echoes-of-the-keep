import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };
export const fail = (m: string): { ok: false; errors: string[] } => ({ ok: false, errors: [m] });

export type Who = { error: { ok: false; errors: string[] }; user?: undefined; isDm?: undefined } | { error?: undefined; user: { id: string; name: string }; isDm: boolean };

/** The signed-in member of a campaign, and whether they are its DM. */
export async function member(campaignId: string): Promise<Who> {
  const u = await requireUser();
  const m = await getMembership(campaignId, u.id);
  if (!m) return { error: fail("You are not in this campaign") };
  return { user: { id: u.id, name: u.name ?? "Someone" }, isDm: m.role === "DM" };
}

export async function dm(campaignId: string): Promise<Who> {
  const w = await member(campaignId);
  if (w.error) return w;
  if (!w.isDm) return { error: fail("Only the DM can do that") };
  return w;
}

/** A note on the table log. `dmOnly` keeps it to the DM (secret rolls). */
export const say = (campaignId: string, actorId: string, text: string, dmOnly = false) =>
  prisma.campaignEvent.create({ data: { campaignId, actorId, type: "system", audience: dmOnly ? "DM" : "ALL", payload: { text } } });

export const touchWorld = (campaignId: string) => {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/dm`);
  revalidatePath(`/campaigns/${campaignId}/world`);
};

/** Heroes attached to a campaign. */
export const partyOf = (campaignId: string) =>
  prisma.campaignCharacter.findMany({ where: { campaignId }, include: { character: true } }).then((l) => l.map((x) => x.character));
