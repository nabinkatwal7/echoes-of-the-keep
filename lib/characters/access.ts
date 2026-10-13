import { prisma } from "@/lib/prisma";

/** A character may be edited by its owner, or by the DM of any campaign it belongs to. */
export async function editable(characterId: string, userId: string) {
  return prisma.character.findFirst({
    where: {
      id: characterId,
      OR: [{ ownerId: userId }, { campaigns: { some: { campaign: { dmId: userId } } } }],
    },
  });
}

/** Record a sheet change in every campaign the character is part of, so the table sees it and the DM can audit it. */
export async function audit(characterId: string, characterName: string, actorId: string, actorName: string, text: string) {
  const links = await prisma.campaignCharacter.findMany({ where: { characterId }, select: { campaignId: true } });
  if (!links.length) return;
  await prisma.campaignEvent.createMany({
    data: links.map((l) => ({
      campaignId: l.campaignId,
      actorId,
      type: "sheet",
      payload: { actorName, characterId, characterName, text },
      audience: "ALL",
    })),
  });
}
