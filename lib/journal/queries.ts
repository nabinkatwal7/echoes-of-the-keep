import { prisma } from "@/lib/prisma";

/** What a member may read: everything shared with the party plus their own entries. */
export function visibleEntries(campaignId: string, userId: string) {
  return prisma.journalEntry.findMany({
    where: { campaignId, OR: [{ visibility: "PARTY" }, { authorId: userId }] },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: { author: { select: { displayName: true } } },
  });
}

export const sessionState = async (campaignId: string) => {
  const [active, last] = await Promise.all([
    prisma.gameSession.findFirst({ where: { campaignId, status: "ACTIVE" } }),
    prisma.gameSession.findFirst({ where: { campaignId, status: "ENDED" }, orderBy: { number: "desc" } }),
  ]);
  return { active, last };
};
