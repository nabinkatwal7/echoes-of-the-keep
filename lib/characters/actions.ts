"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { srdViolations } from "@/lib/srd";
import { requireUser } from "@/lib/auth";
import { buildCharacter, type CreatorChoices } from "./build";
import { checkPrerequisites } from "@/engine/feats";
import { STARTING_GOLD, STARTING_KITS } from "@/engine/classes/equipment";
import { rollExpression } from "@/engine/dice";
import { itemFromCatalog } from "./inventory";
import { prereqContext } from "./derive";
import { applyLevelUp, type LevelUpChoices } from "./levelup";

export type CreateResult = { ok: true; id: string } | { ok: false; errors: string[] };

/** Validates the creator's choices against the rules and content, then stores the character for the signed-in user. */
export type StartingEquipment = "kit" | "gold" | "none";

export async function createCharacter(choices: CreatorChoices, startingEquipment: StartingEquipment = "kit"): Promise<CreateResult> {
  const user = await requireUser();
  const outside = srdViolations({ raceIndex: choices.raceIndex, subraceIndex: choices.subraceIndex, backgroundIndex: choices.backgroundIndex, subclassIndex: choices.subclassIndex, feats: choices.variantFeat ? [choices.variantFeat] : [] });
  if (outside.length) return { ok: false, errors: outside };

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
  if (c.feats.length) {
    const feat = await prisma.feat.findUnique({ where: { index: c.feats[0] } });
    if (!feat) return { ok: false, errors: ["Unknown feat"] };
    const check = checkPrerequisites(
      feat.prerequisite,
      prereqContext({ ...c, scoreBonuses: c.scoreBonuses, skillExpertise: [] }),
    );
    if (!check.met) return { ok: false, errors: [`${feat.name} requires ${check.unmet.join(", ")}`] };
  }
  // starting equipment: the class kit, or gold rolled on the server
  let equipment: object = [];
  let currency: object = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  if (startingEquipment === "kit") {
    const kit = STARTING_KITS[choices.classIndex] ?? [];
    const rows = await prisma.equipmentItem.findMany({ where: { index: { in: kit.map((k) => k.index) } } });
    equipment = kit.flatMap((k) => {
      const r = rows.find((x) => x.index === k.index);
      return r ? [itemFromCatalog(r, k.quantity ?? 1, !!k.equipped)] : [];
    });
  } else if (startingEquipment === "gold") {
    const g = STARTING_GOLD[choices.classIndex];
    if (g) currency = { cp: 0, sp: 0, ep: 0, gp: rollExpression(g.dice).total * g.multiplier, pp: 0 };
  }
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
      feats: c.feats,
      equipment,
      currency,
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

export type ActionResult = { ok: true } | { ok: false; errors: string[] };

/** Level up an owned character. `milestone` skips the XP requirement (until a DM controls leveling in campaigns). */
export async function levelUpCharacter(id: string, choices: LevelUpChoices, milestone = false): Promise<ActionResult> {
  const user = await requireUser();
  const c = await prisma.character.findFirst({ where: { id, ownerId: user.id } });
  if (!c) return { ok: false, errors: ["Character not found"] };
  const outside = srdViolations({ subclassIndex: choices.subclassIndex, feats: choices.improvement?.kind === "feat" ? [choices.improvement.feat] : [] });
  if (outside.length) return { ok: false, errors: outside };
  if (choices.improvement?.kind === "feat") {
    const feat = await prisma.feat.findUnique({ where: { index: choices.improvement.feat } });
    if (!feat) return { ok: false, errors: ["Unknown feat"] };
    const check = checkPrerequisites(feat.prerequisite, prereqContext(c));
    if (!check.met) return { ok: false, errors: [`${feat.name} requires ${check.unmet.join(", ")}`] };
  }
  const result = applyLevelUp(c, choices, milestone);
  if (!result.ok) return result;
  await prisma.character.update({ where: { id }, data: result.update });
  revalidatePath(`/characters/${id}`);
  return { ok: true };
}

export async function addExperience(id: string, amount: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, errors: ["Enter a positive amount of XP"] };
  const done = await prisma.character.updateMany({ where: { id, ownerId: user.id }, data: { xp: { increment: amount } } });
  if (done.count === 0) return { ok: false, errors: ["Character not found"] };
  revalidatePath(`/characters/${id}`);
  return { ok: true };
}
