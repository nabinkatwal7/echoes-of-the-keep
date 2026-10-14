import type { Character, Spell } from "@prisma/client";
import { CASTER_KIND, type SpellSelection } from "@/engine/classes/spellcasting";
import { castingTimeKind } from "@/engine/spells";
import { parseSpellEffect } from "@/engine/spells/effects";
import { preparedSpellNames } from "@/engine/classes/features";
import type { ClassLevel } from "@/engine/progression";
import { slotViews, type StoredPlay } from "@/lib/characters/play";
import { prisma } from "@/lib/prisma";

export type CastableSpell = {
  index: string;
  name: string;
  level: number;
  time: "action" | "bonus" | "reaction" | "long";
  concentration: boolean;
  delivery: string;
  /** what the player needs to choose: nothing, targets, or a point/direction */
  aim: "none" | "targets" | "point";
  /** a short mechanical summary, e.g. "8d6 fire, Dex save for half, 20 ft sphere" */
  summary: string;
  maxTargets: number;
};

export type Spellbook = { characterId: string; slots: { level: number; left: number }[]; pact: { slotLevel: number; left: number } | null; spells: CastableSpell[] };

const summarize = (s: Spell): { summary: string; aim: CastableSpell["aim"]; delivery: string; maxTargets: number } => {
  const e = parseSpellEffect(s);
  const bits: string[] = [];
  if (e.damage) bits.push(`${e.damage.dice}${e.damage.flat ? `+${e.damage.flat}` : ""} ${e.damage.type}`);
  if (e.healing) bits.push(`heals ${e.healing.dice}`);
  if (e.save) bits.push(`${e.save.toUpperCase()} save${e.halfOnSave ? " for half" : ""}`);
  if (e.attack) bits.push(`${e.attack} spell attack`);
  if (e.condition) bits.push(e.condition);
  if (e.area) bits.push(`${e.area.size} ft ${e.area.shape}`);
  if (e.projectiles) bits.push(`${e.projectiles.count} darts or rays`);
  if (e.durationRounds) bits.push(`${e.durationRounds} rounds`);
  const aim: CastableSpell["aim"] = e.area ? "point" : e.delivery !== "none" && e.range.kind !== "self" ? "targets" : "none";
  const maxTargets = e.projectiles ? e.projectiles.count + 6 : 1 + (e.extraTargetsPerLevel ? 6 : 0) + (/up to (three|three creatures)/i.test(s.description) ? 2 : 0);
  return { summary: bits.join(", ") || "Narrated by the DM", aim, delivery: e.delivery, maxTargets };
};

/** Known or prepared spells a character can cast now, with slot counts and a plain summary of what each does. */
export async function spellbookFor(c: Character): Promise<Spellbook | null> {
  const state = (c.spells && typeof c.spells === "object" ? c.spells : {}) as { byClass?: Record<string, SpellSelection> };
  const indexes = new Set<string>();
  for (const k of c.classes as ClassLevel[]) {
    const sel = state.byClass?.[k.classIndex];
    const kind = CASTER_KIND[k.classIndex];
    if (!sel || !kind) continue;
    for (const i of kind === "known" ? sel.known : sel.prepared) indexes.add(i);
  }
  const granted = preparedSpellNames(c.classes as ClassLevel[]);
  if (granted.length) {
    const extra = await prisma.spell.findMany({
      where: { OR: granted.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })) },
      select: { index: true },
    });
    for (const s of extra) indexes.add(s.index);
  }
  if (!indexes.size) return null;
  const spells = await prisma.spell.findMany({ where: { index: { in: [...indexes] } }, orderBy: [{ level: "asc" }, { name: "asc" }] });
  const views = slotViews(c as unknown as StoredPlay);
  return {
    characterId: c.id,
    slots: views.slots.filter((s) => s.total > 0).map((s) => ({ level: s.level, left: s.total - s.used })),
    pact: views.pact ? { slotLevel: views.pact.slotLevel, left: views.pact.slots - views.pact.used } : null,
    spells: spells.map((s) => ({
      index: s.index, name: s.name, level: s.level, time: castingTimeKind(s.castingTime), concentration: s.concentration, ...summarize(s),
    })),
  };
}
