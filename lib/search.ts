import { prisma } from "@/lib/prisma";
import { showCreature, showGear, showSpell, srdOnly, srdWhere } from "@/lib/srd";

export type SearchHit = { type: string; title: string; subtitle: string; href: string };

const MAX_PER_TYPE = 6;

/** Rank: exact name, then prefix, then substring; shorter names first within a tier. */
export function rank<T extends { title: string }>(hits: T[], q: string): T[] {
  const needle = q.toLowerCase();
  const tier = (t: string) => {
    const s = t.toLowerCase();
    return s === needle ? 0 : s.startsWith(needle) ? 1 : s.split(/\s+/).some((w) => w.startsWith(needle)) ? 2 : 3;
  };
  return [...hits].sort((a, b) => tier(a.title) - tier(b.title) || a.title.length - b.title.length);
}

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Search every content type by name (and rule text). Returns at most a few hits per type, best first. */
export async function searchAll(raw: string): Promise<SearchHit[]> {
  const q = raw.trim();
  if (q.length < 2) return [];
  const name = { contains: q, mode: "insensitive" as const };
  const take = MAX_PER_TYPE * 2;

  const [spells, classes, races, feats, backgrounds, creatures, equipment, conditions, rules] = await Promise.all([
    prisma.spell.findMany({ where: { name, campaignId: null }, select: { index: true, name: true, level: true, school: true, source: true }, take }),
    prisma.class.findMany({ where: { name }, select: { index: true, name: true }, take }),
    prisma.race.findMany({ where: { name, ...srdWhere("race") }, select: { index: true, name: true }, take }),
    prisma.feat.findMany({ where: { name, ...srdWhere("feat") }, select: { index: true, name: true }, take }),
    prisma.background.findMany({ where: { name, ...srdWhere("background") }, select: { index: true, name: true }, take }),
    prisma.creature.findMany({ where: { name, campaignId: null }, select: { index: true, name: true, size: true, type: true }, take }),
    prisma.equipmentItem.findMany({ where: { name }, select: { index: true, name: true, cost: true }, take }),
    prisma.condition.findMany({ where: { name }, select: { index: true, name: true }, take }),
    prisma.ruleSection.findMany({
      where: { OR: [{ title: name }, { body: name }] },
      select: { chapter: true, slug: true, title: true, chapterTitle: true },
      take,
    }),
  ]);

  const groups: SearchHit[][] = [
    spells.filter((s) => showSpell(s.name, s.source)).map((s) => ({ type: "Spell", title: s.name, subtitle: s.level === 0 ? `${titleCase(s.school)} cantrip` : `Level ${s.level} ${s.school}`, href: `/wiki/spells/${s.index}` })),
    classes.map((c) => ({ type: "Class", title: c.name, subtitle: "Class", href: `/wiki/classes/${c.index}` })),
    races.map((r) => ({ type: "Race", title: r.name, subtitle: "Race", href: `/wiki/races/${r.index}` })),
    feats.map((f) => ({ type: "Feat", title: f.name, subtitle: "Feat", href: `/wiki/feats#${f.index}` })),
    backgrounds.map((b) => ({ type: "Background", title: b.name, subtitle: "Background", href: `/wiki/backgrounds/${b.index}` })),
    creatures.filter((c) => showCreature(c.name)).map((c) => ({ type: "Creature", title: c.name, subtitle: `${c.size} ${c.type}`, href: `/wiki/creatures/${c.index}` })),
    equipment.filter((e) => showGear(e.name)).map((e) => ({ type: "Equipment", title: e.name, subtitle: e.cost, href: "/wiki/equipment" })),
    conditions.map((c) => ({ type: "Condition", title: c.name, subtitle: "Condition", href: `/wiki/conditions#${c.index}` })),
    (srdOnly() ? [] : rules).map((r) => ({ type: "Rule", title: r.title, subtitle: r.chapterTitle, href: `/wiki/rules/${r.chapter}#${r.slug}` })),
  ];
  return groups.flatMap((g) => rank(g, q).slice(0, MAX_PER_TYPE));
}
