"use server";

import { revalidatePath } from "next/cache";
import { INVOCATION_OPTIONS, invocationSlots } from "@/engine/classes/invocations";
import { isMetamagic, metamagicKnownCount } from "@/engine/spells/metamagic";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "./actions";

/** Save the sorcerer's Metamagic picks and the warlock's invocations on the character. */
export async function saveClassOptions(id: string, metamagic: string[], invocations: string[]): Promise<ActionResult> {
  const user = await requireUser();
  const c = await prisma.character.findFirst({ where: { id, ownerId: user.id } });
  if (!c) return { ok: false, errors: ["Character not found"] };
  const classes = c.classes as { classIndex: string; level: number }[];
  const sorc = classes.find((k) => k.classIndex === "sorcerer");
  const lock = classes.find((k) => k.classIndex === "warlock");
  const map = c.resources && typeof c.resources === "object" && !Array.isArray(c.resources) ? { ...(c.resources as Record<string, unknown>) } : {};
  map._metamagic = [...new Set(metamagic.filter(isMetamagic))].slice(0, metamagicKnownCount(sorc?.level ?? 0));
  map._invocations = [...new Set(invocations.filter((i) => (INVOCATION_OPTIONS as readonly string[]).includes(i)))].slice(0, invocationSlots(lock?.level ?? 0));
  await prisma.character.update({ where: { id }, data: { resources: map as object } });
  revalidatePath(`/characters/${id}`);
  return { ok: true };
}
