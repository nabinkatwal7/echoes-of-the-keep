import { prisma } from "@/lib/prisma";

export const getClasses = () => prisma.class.findMany({ orderBy: { name: "asc" } });
export const getClass = (index: string) => prisma.class.findUnique({ where: { index } });
export const getRaces = () => prisma.race.findMany({ orderBy: { name: "asc" } });
export const getRace = (index: string) => prisma.race.findUnique({ where: { index } });
export const getBackgrounds = () => prisma.background.findMany({ orderBy: { name: "asc" } });
export const getBackground = (index: string) => prisma.background.findUnique({ where: { index } });
export const getFeats = () => prisma.feat.findMany({ orderBy: { name: "asc" } });
export const getConditions = () => prisma.condition.findMany({ orderBy: { name: "asc" } });
