import { randomBytes } from "node:crypto";
import { CASTER_KIND, CLASS_NAME, maxSpellLevel, spellLimits, type SpellSelection } from "@/engine/classes/spellcasting";
import { SUBCLASS_LEVEL } from "@/engine/classes/subclasses";
import { asiLevels } from "@/engine/progression";
import { CASTING_ABILITY } from "@/engine/spells";
import type { Blueprint } from "@/engine/bots/blueprints";
import { runAs } from "@/lib/actAs";
import { createCharacter, levelUpCharacter } from "@/lib/characters/actions";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { saveSpellSelection } from "@/lib/characters/playActions";
import { prisma } from "@/lib/prisma";

/** A player or Dungeon Master the computer controls. It has no password, so nobody can sign in as it. */
export async function createBotUser(displayName: string) {
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.user.create({ data: { username: `bot_${randomBytes(5).toString("hex")}`, displayName, passwordHash: "!", isBot: true } });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not create a bot account");
}

/** Pick spells for a bot caster: preferred ones first, then anything legal, up to the class limits. */
export async function chooseSpells(classIndex: string, level: number, castingScore: number, preferred: { cantrips: string[]; spells: string[] }): Promise<SpellSelection | null> {
  const limits = spellLimits(classIndex, level, castingScore);
  if (!limits) return null;
  const maxLevel = maxSpellLevel(classIndex, level);
  const options = await prisma.spell.findMany({ where: { classes: { has: CLASS_NAME[classIndex] }, level: { lte: maxLevel }, campaignId: null }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { index: true, level: true } });
  const cantripPool = options.filter((o) => o.level === 0).map((o) => o.index);
  const leveledPool = options.filter((o) => o.level > 0).map((o) => o.index);
  const take = (pref: string[], pool: string[], n: number, already: string[] = []) => {
    const out = [...already];
    for (const i of [...pref, ...pool]) if (out.length < n && pool.includes(i) && !out.includes(i)) out.push(i);
    return out;
  };
  const cantrips = take(preferred.cantrips, cantripPool, limits.cantrips);
  if (limits.kind === "known") return { known: [...cantrips, ...take(preferred.spells, leveledPool, limits.spells)], prepared: [], spellbook: [] };
  if (classIndex === "wizard") {
    const book = take(preferred.spells, leveledPool, limits.spellbook ?? 6);
    const prepared = take(preferred.spells, book, limits.spells);
    return { known: [], spellbook: book, prepared: [...cantrips, ...prepared] };
  }
  return { known: [], spellbook: [], prepared: [...cantrips, ...take(preferred.spells, leveledPool, limits.spells)] };
}

/**
 * Build a hero from a blueprint, level it with the same rules a person follows, and choose its spells.
 * Everything runs as the bot's owner, so the normal checks apply.
 */
export async function buildBotHero(owner: { id: string; name: string }, bp: Blueprint, level: number, name: string): Promise<string> {
  return runAs(owner, async () => {
    const dueAtOne = SUBCLASS_LEVEL[bp.classIndex] === 1;
    const made = await createCharacter(
      {
        name, raceIndex: bp.raceIndex, subraceIndex: bp.subraceIndex, classIndex: bp.classIndex, subclassIndex: dueAtOne ? bp.subclassIndex : undefined,
        backgroundIndex: bp.backgroundIndex, abilityMethod: "standard", scores: bp.scores, classSkills: bp.classSkills,
        personality: { traits: bp.battleCries[0], bonds: "Travels with the party", ideals: "", flaws: "" },
      },
      "kit",
    );
    if (!made.ok) throw new Error(`Bot hero could not be built: ${made.errors.join(", ")}`);

    const asi = new Set(asiLevels(bp.classIndex));
    for (let lvl = 2; lvl <= level; lvl++) {
      const r = await levelUpCharacter(
        made.id,
        {
          classIndex: bp.classIndex,
          ...(SUBCLASS_LEVEL[bp.classIndex] === lvl ? { subclassIndex: bp.subclassIndex } : {}),
          ...(asi.has(lvl) ? { improvement: { kind: "asi" as const, abilities: [bp.primary] } } : {}),
        },
        true,
      );
      if (!r.ok) throw new Error(`Bot hero could not reach level ${lvl}: ${r.errors.join(", ")}`);
    }

    if (CASTER_KIND[bp.classIndex] && !(bp.classIndex === "paladin" && level < 2)) {
      const row = await prisma.character.findUniqueOrThrow({ where: { id: made.id } });
      const score = deriveStored(row as unknown as StoredCharacter).abilities[CASTING_ABILITY[bp.classIndex]].score;
      const selection = await chooseSpells(bp.classIndex, level, score, { cantrips: bp.cantrips, spells: bp.spells });
      if (selection) {
        const saved = await saveSpellSelection(made.id, bp.classIndex, selection);
        if (!saved.ok) throw new Error(`Bot spells were refused: ${saved.errors.join(", ")}`);
      }
    }
    return made.id;
  });
}
