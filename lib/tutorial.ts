"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createCampaign, attachCharacter } from "@/lib/campaigns/actions";
import { createCharacter } from "@/lib/characters/actions";
import { addMonster, addParty, createEncounter, startEncounter } from "@/lib/combat/actions";
import { prisma } from "@/lib/prisma";

/** A sample fighter, a one-room campaign, and a goblin already in initiative. */
export async function startTutorial() {
  const user = await requireUser();
  const existing = await prisma.campaign.findFirst({ where: { dmId: user.id, name: "Tutorial: The Cellar" }, select: { id: true } });
  if (existing) redirect(`/campaigns/${existing.id}/combat`);

  const hero = await createCharacter(
    {
      name: "Tutorial Hero",
      raceIndex: "human",
      classIndex: "fighter",
      backgroundIndex: "soldier",
      abilityMethod: "standard",
      scores: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
      classSkills: ["perception", "survival"],
    },
    "kit",
  );
  if (!hero.ok) redirect("/characters/new");

  const camp = await createCampaign("Tutorial: The Cellar", "One room, one goblin. Attack, then end your turn.");
  if (!camp.ok) redirect("/campaigns");
  await attachCharacter(camp.id, hero.id);

  const enc = await createEncounter(camp.id, "The cellar");
  if (enc.ok && "id" in enc && typeof enc.id === "string") {
    await addParty(enc.id);
    const goblin = await prisma.creature.findFirst({ where: { index: "goblin", campaignId: null }, select: { index: true } });
    if (goblin) await addMonster(enc.id, goblin.index, 1);
    await startEncounter(enc.id);
  }
  redirect(`/campaigns/${camp.id}/combat`);
}
