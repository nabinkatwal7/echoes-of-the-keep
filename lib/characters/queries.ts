import { prisma } from "@/lib/prisma";

export const listCharacters = (ownerId: string) =>
  prisma.character.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } });

/** Owner-scoped lookup: other users' characters are invisible. */
export const getOwnedCharacter = (id: string, ownerId: string) =>
  prisma.character.findFirst({ where: { id, ownerId } });
