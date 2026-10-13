"use server";

import { revalidatePath } from "next/cache";
import { canBeBeastCompanion, canWildShapeInto, isFamiliarForm, parseHitPoints } from "@/engine/companions";
import type { ClassLevel } from "@/engine/progression";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, editable } from "./access";

export type CompanionKind = "familiar" | "beast-companion" | "wild-shape" | "summon";
export type Companion = { id: string; creatureIndex: string; name: string; kind: CompanionKind; hp: number; maxHp: number };
type Result = { ok: true } | { ok: false; errors: string[] };
const fail = (m: string): Result => ({ ok: false, errors: [m] });

const list = (c: { companions: unknown }) => (Array.isArray(c.companions) ? (c.companions as Companion[]) : []);

/** Add a familiar, beast companion, wild shape form or summon, checking the rules that apply to its kind. */
export async function addCompanion(characterId: string, creatureIndex: string, kind: CompanionKind, name?: string): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const creature = await prisma.creature.findFirst({ where: { index: creatureIndex, campaignId: null } });
  if (!creature) return fail("Unknown creature");
  const classes = c.classes as ClassLevel[];

  if (kind === "familiar" && !isFamiliarForm(creatureIndex)) return fail("A familiar must take a form allowed by Find Familiar");
  if (kind === "beast-companion") {
    const ranger = classes.find((k) => k.classIndex === "ranger" && k.subclassIndex === "beast-master");
    if (!ranger) return fail("Only a Beast Master ranger has an animal companion");
    if (!canBeBeastCompanion(creature)) return fail("A beast companion must be a beast of challenge rating 1/4 or lower");
  }
  if (kind === "wild-shape") {
    const druid = classes.find((k) => k.classIndex === "druid");
    if (!druid) return fail("Only druids can Wild Shape");
    const check = canWildShapeInto(creature, druid.level, druid.subclassIndex === "circle-of-the-moon");
    if (!check.ok) return fail(check.reason);
    if (list(c).some((x) => x.kind === "wild-shape")) return fail("You are already in a Wild Shape form; end it first");
  }

  const maxHp = parseHitPoints(creature.hitPoints);
  const item: Companion = { id: `c_${Math.random().toString(36).slice(2, 9)}`, creatureIndex, name: (name?.trim() || creature.name).slice(0, 60), kind, hp: maxHp, maxHp };
  await prisma.character.update({ where: { id: characterId }, data: { companions: [...list(c), item] as unknown as object } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", kind === "wild-shape" ? `${c.name} assumes the shape of a ${creature.name}` : `${c.name} gains a ${kind.replace("-", " ")}: ${item.name}`);
  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

export async function setCompanionHp(characterId: string, companionId: string, hp: number): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  if (!Number.isInteger(hp)) return fail("Hit points must be a whole number");
  const items = list(c).map((x) => (x.id === companionId ? { ...x, hp: Math.max(0, Math.min(x.maxHp, hp)) } : x));
  await prisma.character.update({ where: { id: characterId }, data: { companions: items as unknown as object } });
  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

export async function removeCompanion(characterId: string, companionId: string): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const gone = list(c).find((x) => x.id === companionId);
  await prisma.character.update({ where: { id: characterId }, data: { companions: list(c).filter((x) => x.id !== companionId) as unknown as object } });
  if (gone) await audit(characterId, c.name, user.id, user.name ?? "Someone", gone.kind === "wild-shape" ? `${c.name} returns to their normal form` : `${c.name} loses ${gone.name}`);
  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}
