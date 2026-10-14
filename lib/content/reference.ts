import { prisma } from "@/lib/prisma";
import { allowed, srdWhere } from "@/lib/srd";

export const getClasses = () => prisma.class.findMany({ orderBy: { name: "asc" } });
export const getClass = (index: string) => prisma.class.findUnique({ where: { index } });
export const getRaces = () => prisma.race.findMany({ where: srdWhere("race"), orderBy: { name: "asc" } });
export const getRace = async (index: string) => (allowed("race", index) ? prisma.race.findUnique({ where: { index } }) : null);
export const getBackgrounds = () => prisma.background.findMany({ where: srdWhere("background"), orderBy: { name: "asc" } });
export const getBackground = async (index: string) => (allowed("background", index) ? prisma.background.findUnique({ where: { index } }) : null);
export const getFeats = () => prisma.feat.findMany({ where: srdWhere("feat"), orderBy: { name: "asc" } });
export const getConditions = () => prisma.condition.findMany({ orderBy: { name: "asc" } });
