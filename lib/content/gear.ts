import { prisma } from "@/lib/prisma";

export const getEquipment = () =>
  prisma.equipmentItem.findMany({ orderBy: [{ pdfPage: "asc" }, { name: "asc" }] });

export const getCreatures = () => prisma.creature.findMany({ orderBy: { name: "asc" } });
export const getCreature = (index: string) => prisma.creature.findUnique({ where: { index } });
