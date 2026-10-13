import { prisma } from "@/lib/prisma";
import { canSee, type Viewer } from "./visibility";

/** The viewer's membership of a campaign, or null when they are not in it. */
export async function getMembership(campaignId: string, userId: string) {
  return prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } } });
}

export const listMyCampaigns = (userId: string) =>
  prisma.campaign.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { members: true } }, members: { where: { userId }, select: { role: true } } },
    orderBy: { createdAt: "desc" },
  });

export const getCampaignForMember = (campaignId: string, userId: string) =>
  prisma.campaign.findFirst({
    where: { id: campaignId, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, displayName: true, username: true } } }, orderBy: { joinedAt: "asc" } },
      characters: {
        include: { character: { select: { id: true, name: true, ownerId: true, raceIndex: true, subraceIndex: true, classes: true } } },
      },
    },
  });

export type EventRow = {
  id: number;
  type: string;
  actorId: string | null;
  audience: string;
  payload: unknown;
  createdAt: Date;
};

/**
 * Scan events after `afterId`. Returns the ones the viewer may see (oldest first) and `lastId`, the id of the last row
 * examined, so a stream can advance past hidden events without ever skipping unexamined ones.
 */
export async function scanEvents(campaignId: string, viewer: Viewer, afterId = 0, limit = 200): Promise<{ events: EventRow[]; lastId: number }> {
  const rows = await prisma.campaignEvent.findMany({
    where: { campaignId, id: { gt: afterId } },
    orderBy: { id: "asc" },
    take: limit,
  });
  return { events: rows.filter((e) => canSee(e, viewer)), lastId: rows.length ? rows[rows.length - 1].id : afterId };
}

/** Latest events for the first load (the last `limit` visible ones), oldest first. */
export async function getRecentVisibleEvents(campaignId: string, viewer: Viewer, limit = 100): Promise<EventRow[]> {
  const rows = await prisma.campaignEvent.findMany({ where: { campaignId }, orderBy: { id: "desc" }, take: limit * 3 });
  return rows.filter((e) => canSee(e, viewer)).slice(0, limit).reverse();
}
