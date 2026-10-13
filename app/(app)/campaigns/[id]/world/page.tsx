import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaignForMember } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";
import { WorldClient } from "./WorldClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "World" };

export default async function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaignForMember(id, user.id);
  if (!campaign) notFound();
  const mine = campaign.members.find((m) => m.userId === user.id);
  const isDm = mine?.role === "DM";
  const only = isDm ? {} : { revealed: true };

  const [npcs, places, quests, stash, party] = await Promise.all([
    prisma.npc.findMany({ where: { campaignId: id, ...only }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { campaignId: id, ...only }, orderBy: { name: "asc" } }),
    prisma.quest.findMany({ where: { campaignId: id, ...only }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.stashItem.findMany({ where: { campaignId: id }, orderBy: { name: "asc" } }),
    prisma.campaignCharacter.findMany({ where: { campaignId: id }, include: { character: { select: { id: true, name: true, ownerId: true } } } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/campaigns/${id}`} className="eyebrow hover:text-goldBright">← {campaign.name}</Link>
        <h1 className="gilded text-3xl font-bold">The World</h1>
        <p className="text-sm text-muted">{isDm ? "Everything you add stays hidden until you reveal it." : "People, places and quests your party has discovered."}</p>
      </div>
      <WorldClient
        campaignId={id}
        isDm={isDm}
        npcs={npcs.map((n) => ({ id: n.id, name: n.name, role: n.role, attitude: n.attitude, notes: n.notes, revealed: n.revealed }))}
        places={places.map((p) => ({ id: p.id, name: p.name, description: p.description, imageUrl: p.imageUrl, revealed: p.revealed, current: p.current }))}
        quests={quests.map((q) => ({ id: q.id, title: q.title, description: q.description, reward: q.reward, status: q.status, revealed: q.revealed }))}
        stash={stash.map((s) => ({ id: s.id, name: s.name, quantity: s.quantity, notes: s.notes, valueGp: s.valueCp / 100 }))}
        heroes={party.filter((p) => isDm || p.character.ownerId === user.id).map((p) => ({ id: p.character.id, name: p.character.name }))}
      />
    </div>
  );
}
