import { prisma } from "@/lib/prisma";

export type SpellFilters = { level?: number; className?: string; q?: string; ritual?: boolean; concentration?: boolean };

export function getSpells(f: SpellFilters = {}) {
  return prisma.spell.findMany({
    where: {
      ...(f.level !== undefined && { level: f.level }),
      ...(f.className && { classes: { has: f.className } }),
      ...(f.q && { name: { contains: f.q, mode: "insensitive" } }),
      ...(f.ritual && { ritual: true }),
      ...(f.concentration && { concentration: true }),
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
}

export const getSpell = (index: string) => prisma.spell.findUnique({ where: { index } });

export const spellLevelLabel = (level: number, school: string) =>
  level === 0 ? `${school} cantrip` : `${level}${["st", "nd", "rd"][level - 1] ?? "th"}-level ${school}`;
