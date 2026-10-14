import { prisma } from "@/lib/prisma";

export const MAX_SOLO_GAMES = 5;

/** Games where this person is the one human. */
export const soloGamesOf = (userId: string) => prisma.campaign.findMany({ where: { settings: { path: ["solo", "humanId"], equals: userId } }, orderBy: { createdAt: "desc" } });
