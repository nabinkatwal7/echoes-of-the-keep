"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildCharacter, type CreatorChoices } from "./build";

export type CreateResult = { ok: true; id: string } | { ok: false; errors: string[] };

/** Validates the creator's choices against the rules and content, then stores the character for the signed-in user. */
export async function createCharacter(choices: CreatorChoices): Promise<CreateResult> {
  const user = await requireUser();

  const [race, subrace, background] = await Promise.all([
    prisma.race.findUnique({ where: { index: choices.raceIndex } }),
    choices.subraceIndex ? prisma.race.findUnique({ where: { index: choices.subraceIndex } }) : null,
    prisma.background.findUnique({ where: { index: choices.backgroundIndex } }),
  ]);
  if (!race) return { ok: false, errors: ["Unknown race"] };
  if (!background) return { ok: false, errors: ["Unknown background"] };
  if (choices.subraceIndex && !subrace) return { ok: false, errors: ["Unknown subrace"] };

  const built = buildCharacter(choices, {
    race: { index: race.index, traits: race.traits as { name: string; description: string }[] },
    subrace: subrace ? { index: subrace.index, traits: subrace.traits as { name: string; description: string }[] } : undefined,
    background: { index: background.index, skillProficiencies: background.skillProficiencies },
  });
  if (!built.ok) return built;

  const c = built.character;
  const row = await prisma.character.create({
    data: {
      ownerId: user.id,
      name: c.name,
      raceIndex: c.raceIndex,
      subraceIndex: c.subraceIndex,
      backgroundIndex: c.backgroundIndex,
      alignment: c.alignment,
      classes: c.classes,
      baseScores: c.baseScores,
      abilityMethod: c.abilityMethod,
      scoreBonuses: c.scoreBonuses,
      skillProficiencies: c.skillProficiencies,
      speed: c.speed,
      currentHp: c.currentHp,
      hitDiceSpent: c.hitDiceSpent,
      personality: c.personality,
    },
  });
  revalidatePath("/characters");
  return { ok: true, id: row.id };
}

export async function deleteCharacter(id: string) {
  const user = await requireUser();
  await prisma.character.deleteMany({ where: { id, ownerId: user.id } });
  revalidatePath("/characters");
}
