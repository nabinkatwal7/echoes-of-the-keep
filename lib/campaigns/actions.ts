"use server";

import { revalidatePath } from "next/cache";
import { rollExpression } from "@/engine/dice";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseMessage } from "./commands";
import { getMembership } from "./queries";
import { newInviteCode } from "./visibility";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };

export async function createCampaign(name: string, description = ""): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return { ok: false, errors: ["Campaign name must be 2-80 characters"] };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          name: trimmed,
          description: description.trim().slice(0, 500),
          dmId: user.id,
          inviteCode: newInviteCode(),
          members: { create: { userId: user.id, role: "DM" } },
        },
      });
      revalidatePath("/campaigns");
      return { ok: true, id: campaign.id };
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e; // retry only on invite code collision
    }
  }
  return { ok: false, errors: ["Could not generate an invite code, try again"] };
}

export async function joinCampaign(code: string): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
  if (!campaign) return { ok: false, errors: ["No campaign with that invite code"] };
  const existing = await getMembership(campaign.id, user.id);
  if (!existing) {
    await prisma.campaignMember.create({ data: { campaignId: campaign.id, userId: user.id, role: "PLAYER" } });
    await prisma.campaignEvent.create({
      data: { campaignId: campaign.id, actorId: user.id, type: "system", payload: { text: `${user.name ?? "A player"} joined the party` } },
    });
  }
  revalidatePath("/campaigns");
  return { ok: true, id: campaign.id };
}

export async function attachCharacter(campaignId: string, characterId: string): Promise<Result> {
  const user = await requireUser();
  if (!(await getMembership(campaignId, user.id))) return { ok: false, errors: ["You are not in this campaign"] };
  const character = await prisma.character.findFirst({ where: { id: characterId, ownerId: user.id } });
  if (!character) return { ok: false, errors: ["Character not found"] };
  await prisma.campaignCharacter.upsert({
    where: { campaignId_characterId: { campaignId, characterId } },
    update: {},
    create: { campaignId, characterId },
  });
  await prisma.campaignEvent.create({
    data: { campaignId, actorId: user.id, type: "system", payload: { text: `${character.name} joined the party` } },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function detachCharacter(campaignId: string, characterId: string): Promise<Result> {
  const user = await requireUser();
  const membership = await getMembership(campaignId, user.id);
  if (!membership) return { ok: false, errors: ["You are not in this campaign"] };
  const character = await prisma.character.findFirst({ where: { id: characterId } });
  if (!character || (character.ownerId !== user.id && membership.role !== "DM")) return { ok: false, errors: ["Not allowed"] };
  await prisma.campaignCharacter.deleteMany({ where: { campaignId, characterId } });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

/** Chat, emotes, rolls and whispers all go through here so permissions and dice are decided on the server. */
export async function postMessage(campaignId: string, input: string): Promise<Result> {
  const user = await requireUser();
  const membership = await getMembership(campaignId, user.id);
  if (!membership) return { ok: false, errors: ["You are not in this campaign"] };
  const isDm = membership.role === "DM";
  const actorName = user.name ?? "Someone";
  const msg = parseMessage(input);

  const create = (type: string, payload: object, audience = "ALL") =>
    prisma.campaignEvent.create({ data: { campaignId, actorId: user.id, type, payload: { actorName, isDm, ...payload }, audience } });

  switch (msg.kind) {
    case "error":
      return { ok: false, errors: [msg.message] };
    case "chat":
      await create("chat", { text: msg.text });
      break;
    case "emote":
      await create("chat", { text: msg.text, emote: true });
      break;
    case "whisper-dm":
      await create("chat", { text: msg.text, whisper: true }, "DM");
      break;
    case "whisper-player": {
      const members = await prisma.campaignMember.findMany({ where: { campaignId }, include: { user: { select: { id: true, username: true, displayName: true } } } });
      const want = msg.to.toLowerCase();
      const target = members.find((m) => m.user.username.toLowerCase() === want || m.user.displayName.toLowerCase().replace(/\s+/g, "") === want);
      if (!target) return { ok: false, errors: [`No one named "${msg.to}" is at this table`] };
      if (target.userId === user.id) return { ok: false, errors: ["You cannot whisper to yourself"] };
      await create("chat", { text: msg.text, whisper: true, to: target.user.displayName }, `USER:${target.userId}`);
      break;
    }
    case "roll": {
      if (msg.secret && !isDm) return { ok: false, errors: ["Only the DM can make secret rolls"] };
      const result = rollExpression(msg.expression);
      await create(
        "roll",
        { expression: msg.expression, reason: msg.reason, total: result.total, rolls: result.terms.map((t) => t.rolls), secret: msg.secret },
        msg.secret ? "DM" : "ALL",
      );
      break;
    }
  }
  return { ok: true };
}
