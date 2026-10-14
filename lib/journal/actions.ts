"use server";

import type { JournalEntry } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";
import { safeImageUrl } from "@/lib/safeUrl";

type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };
const fail = (m: string): { ok: false; errors: string[] } => ({ ok: false, errors: [m] });

export type EntryKind = "NOTE" | "HANDOUT" | "RECAP";
const KINDS: EntryKind[] = ["NOTE", "HANDOUT", "RECAP"];
const refresh = (id: string) => revalidatePath(`/campaigns/${id}/journal`);

function check(title: string, body: string) {
  if (title.trim().length < 1 || title.length > 120) return "Give the entry a title (up to 120 characters)";
  if (body.length > 20000) return "That entry is too long (20,000 characters at most)";
  return null;
}

/** Notes are private to their author; handouts and recaps are written by the DM and published to the party on purpose. */
export async function createEntry(campaignId: string, input: { kind: EntryKind; title: string; body: string; imageUrl?: string }): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const m = await getMembership(campaignId, user.id);
  if (!m) return fail("You are not in this campaign");
  if (!KINDS.includes(input.kind)) return fail("Unknown entry type");
  if (input.kind !== "NOTE" && m.role !== "DM") return fail("Only the DM can write handouts and recaps");
  const bad = check(input.title, input.body);
  if (bad) return fail(bad);
  const image = (input.imageUrl ?? "").trim();
  if (!safeImageUrl(image)) return fail("Use an https link to a png, jpg, webp, gif or avif image");
  const e = await prisma.journalEntry.create({ data: { campaignId, authorId: user.id, kind: input.kind, title: input.title.trim(), body: input.body, imageUrl: image } });
  refresh(campaignId);
  return { ok: true, id: e.id };
}

type Own =
  | { error: { ok: false; errors: string[] }; e?: undefined; user?: undefined; isDm?: undefined }
  | { error?: undefined; e: JournalEntry; user: { id: string; name?: string | null }; isDm: boolean };

async function ownEntry(id: string): Promise<Own> {
  const user = await requireUser();
  const e = await prisma.journalEntry.findUnique({ where: { id } });
  if (!e) return { error: fail("Entry not found") };
  const m = await getMembership(e.campaignId, user.id);
  if (!m) return { error: fail("You are not in this campaign") };
  return { e, user, isDm: m.role === "DM" };
}

export async function updateEntry(id: string, input: { title: string; body: string; imageUrl?: string }): Promise<Result> {
  const r = await ownEntry(id);
  if (r.error) return r.error;
  if (r.e.authorId !== r.user.id) return fail("Only the author can edit this");
  const bad = check(input.title, input.body);
  if (bad) return fail(bad);
  const image = input.imageUrl === undefined ? r.e.imageUrl : input.imageUrl.trim();
  if (!safeImageUrl(image)) return fail("Use an https link to a png, jpg, webp, gif or avif image");
  await prisma.journalEntry.update({ where: { id }, data: { title: input.title.trim(), body: input.body, imageUrl: image } });
  refresh(r.e.campaignId);
  return { ok: true };
}

/** Publish an entry to the whole party, or pull it back. Sharing a handout announces it at the table. */
export async function setVisibility(id: string, visibility: "PRIVATE" | "PARTY"): Promise<Result> {
  const r = await ownEntry(id);
  if (r.error) return r.error;
  if (r.e.authorId !== r.user.id) return fail("Only the author can change who sees this");
  if (r.e.kind === "NOTE" && !r.isDm && visibility === "PARTY") return fail("Notes are private; ask the DM to share a handout instead");
  await prisma.journalEntry.update({ where: { id }, data: { visibility } });
  if (visibility === "PARTY" && r.e.kind !== "NOTE") {
    await prisma.campaignEvent.create({
      data: {
        campaignId: r.e.campaignId,
        actorId: r.user.id,
        type: "system",
        audience: "ALL",
        payload: { text: `${r.user.name ?? "The DM"} shared ${r.e.kind === "RECAP" ? "a recap" : "a handout"}: ${r.e.title}` },
      },
    });
  }
  refresh(r.e.campaignId);
  return { ok: true };
}

export async function togglePinned(id: string): Promise<Result> {
  const r = await ownEntry(id);
  if (r.error) return r.error;
  if (r.e.authorId !== r.user.id && !r.isDm) return fail("Not allowed");
  await prisma.journalEntry.update({ where: { id }, data: { pinned: !r.e.pinned } });
  refresh(r.e.campaignId);
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<Result> {
  const r = await ownEntry(id);
  if (r.error) return r.error;
  if (r.e.authorId !== r.user.id && !(r.isDm && r.e.visibility === "PARTY")) return fail("Not allowed");
  await prisma.journalEntry.delete({ where: { id } });
  refresh(r.e.campaignId);
  return { ok: true };
}
