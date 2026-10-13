import { prisma } from "@/lib/prisma";

export const getAlignments = () => prisma.alignment.findMany({ orderBy: { name: "asc" } });
