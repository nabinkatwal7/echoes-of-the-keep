import { prisma } from "@/lib/prisma";
import { readSolo } from "./config";

/** Remove a person's solo games and the computer players in them, so deleting an account leaves nothing behind. */
export async function deleteSoloGamesOf(userId: string): Promise<number> {
  const games = await prisma.campaign.findMany({ where: { settings: { path: ["solo", "humanId"], equals: userId } }, select: { id: true, settings: true } });
  const bots = games.flatMap((g) => {
    const s = readSolo(g.settings);
    return s ? [...s.botIds, ...(s.botDmId ? [s.botDmId] : [])] : [];
  });
  if (games.length) await prisma.campaign.deleteMany({ where: { id: { in: games.map((g) => g.id) } } });
  if (bots.length) await prisma.user.deleteMany({ where: { id: { in: bots }, isBot: true } });
  return games.length;
}
