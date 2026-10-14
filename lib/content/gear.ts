import { prisma } from "@/lib/prisma";
import { showCreature, showGear } from "@/lib/srd";

export async function getEquipment() {
  const rows = await prisma.equipmentItem.findMany({ orderBy: [{ pdfPage: "asc" }, { name: "asc" }] });
  return rows.filter((e) => showGear(e.name));
}

export async function getCreatures() {
  const rows = await prisma.creature.findMany({ where: { campaignId: null }, orderBy: { name: "asc" } });
  return rows.filter((c) => showCreature(c.name));
}

export async function getCreature(index: string) {
  const creature = await prisma.creature.findFirst({ where: { index, campaignId: null } });
  if (!creature || !showCreature(creature.name)) return null;
  return creature;
}

/** Official creatures plus this campaign's homebrew, with non-SRD official rows removed when that mode is on. */
export async function listEncounterCreatures(campaignId: string) {
  const rows = await prisma.creature.findMany({
    where: { OR: [{ campaignId: null }, { campaignId }] },
    select: { index: true, name: true, challenge: true, type: true, campaignId: true },
    orderBy: { name: "asc" },
  });
  return rows.filter((c) => showCreature(c.name, c.campaignId)).map(({ index, name, challenge, type }) => ({ index, name, challenge, type }));
}
