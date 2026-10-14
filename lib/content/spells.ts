import { prisma } from "@/lib/prisma";
import { showSpell } from "@/lib/srd";

export type SpellFilters = { level?: number; className?: string; q?: string; ritual?: boolean; concentration?: boolean };

export async function getSpells(f: SpellFilters = {}) {
  const rows = await prisma.spell.findMany({
    where: {
      ...(f.level !== undefined && { level: f.level }),
      ...(f.className && { classes: { has: f.className } }),
      ...(f.q && { name: { contains: f.q, mode: "insensitive" } }),
      ...(f.ritual && { ritual: true }),
      ...(f.concentration && { concentration: true }),
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  return rows.filter((s) => showSpell(s.name, s.source));
}

export async function getSpell(index: string) {
  const spell = await prisma.spell.findUnique({ where: { index } });
  if (!spell || !showSpell(spell.name, spell.source)) return null;
  return spell;
}

export const spellLevelLabel = (level: number, school: string) =>
  level === 0 ? `${school} cantrip` : `${level}${["st", "nd", "rd"][level - 1] ?? "th"}-level ${school}`;
