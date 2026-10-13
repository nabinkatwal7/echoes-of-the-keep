"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";

type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };
const fail = (m: string): { ok: false; errors: string[] } => ({ ok: false, errors: [m] });

type Dm = { error: { ok: false; errors: string[] }; user?: undefined } | { error?: undefined; user: { id: string; name?: string | null } };

async function dmOf(campaignId: string): Promise<Dm> {
  const user = await requireUser();
  const m = await getMembership(campaignId, user.id);
  if (!m) return { error: fail("You are not in this campaign") };
  if (m.role !== "DM") return { error: fail("Only the DM can do that") };
  return { user };
}

const announce = (campaignId: string, actorId: string, text: string) =>
  prisma.campaignEvent.create({ data: { campaignId, actorId, type: "system", audience: "ALL", payload: { text } } });

export async function startSession(campaignId: string, title = ""): Promise<Result<{ number: number }>> {
  const d = await dmOf(campaignId);
  if (d.error) return d.error;
  if (title.length > 120) return fail("Keep the title under 120 characters");
  if (await prisma.gameSession.findFirst({ where: { campaignId, status: "ACTIVE" } })) return fail("A session is already running");
  const last = await prisma.gameSession.findFirst({ where: { campaignId }, orderBy: { number: "desc" } });
  const number = (last?.number ?? 0) + 1;
  await prisma.gameSession.create({ data: { campaignId, number, title: title.trim() } });
  const recap = last?.summary ? ` Previously: ${last.summary}` : "";
  const next = last?.nextUp ? ` Next up: ${last.nextUp}` : "";
  await announce(campaignId, d.user.id, `Session ${number} begins${title.trim() ? `: ${title.trim()}` : ""}.${recap}${next}`);
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, number };
}

/** Save the session: the summary becomes a recap shared with the party and the hook is remembered for next time. */
export async function endSession(campaignId: string, summary: string, nextUp = ""): Promise<Result> {
  const d = await dmOf(campaignId);
  if (d.error) return d.error;
  if (summary.trim().length < 1) return fail("Write a short summary so the next session can pick up where you left off");
  if (summary.length > 5000 || nextUp.length > 1000) return fail("That is too long");
  const s = await prisma.gameSession.findFirst({ where: { campaignId, status: "ACTIVE" } });
  if (!s) return fail("No session is running");
  await prisma.$transaction([
    prisma.gameSession.update({ where: { id: s.id }, data: { status: "ENDED", summary: summary.trim(), nextUp: nextUp.trim(), endedAt: new Date() } }),
    prisma.journalEntry.create({
      data: { campaignId, authorId: d.user.id, kind: "RECAP", title: `Session ${s.number}${s.title ? `: ${s.title}` : ""}`, body: summary.trim(), visibility: "PARTY" },
    }),
    prisma.campaignEvent.create({ data: { campaignId, actorId: d.user.id, type: "system", audience: "ALL", payload: { text: `Session ${s.number} ends. Progress is saved.` } } }),
  ]);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/journal`);
  return { ok: true };
}

/** Jot where the story stands without ending the session. */
export async function setNextUp(campaignId: string, nextUp: string): Promise<Result> {
  const d = await dmOf(campaignId);
  if (d.error) return d.error;
  if (nextUp.length > 1000) return fail("That is too long");
  const s = await prisma.gameSession.findFirst({ where: { campaignId, status: "ACTIVE" } });
  if (!s) return fail("No session is running");
  await prisma.gameSession.update({ where: { id: s.id }, data: { nextUp: nextUp.trim() } });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}
