import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaignForMember } from "@/lib/campaigns/queries";
import { buildEncounterView } from "@/lib/combat/view";
import { loadEncounter } from "@/lib/combat/store";
import { listEncounterCreatures } from "@/lib/content/gear";
import { prisma } from "@/lib/prisma";
import { spellbookFor, type Spellbook } from "@/lib/combat/spellList";
import { CombatClient, type LogLine } from "./CombatClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Combat" };

export default async function CombatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { e } = await searchParams;
  const campaign = await getCampaignForMember(id, user.id);
  if (!campaign) notFound();
  const isDm = campaign.members.find((m) => m.userId === user.id)?.role === "DM";

  const encounters = await prisma.encounter.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, state: true } });
  const chosen = encounters.find((x) => x.id === e) ?? encounters.find((x) => x.state === "ACTIVE") ?? encounters[0];
  const enc = chosen ? await loadEncounter(chosen.id) : null;

  const mine = await prisma.character.findMany({ where: { ownerId: user.id }, select: { id: true } });
  const view = enc ? buildEncounterView(enc, { userId: user.id, isDm }, new Set(mine.map((c) => c.id))) : null;

  const spellbooks: Record<string, Spellbook> = {};
  const sheetIds = (view?.combatants ?? []).map((c) => c.characterId).filter((x): x is string => !!x);
  if (sheetIds.length) {
    for (const ch of await prisma.character.findMany({ where: { id: { in: sheetIds } } })) {
      const book = await spellbookFor(ch);
      if (book) spellbooks[ch.id] = book;
    }
  }

  const latest = await prisma.campaignEvent.findFirst({ where: { campaignId: id }, orderBy: { id: "desc" }, select: { id: true } });
  let log: LogLine[] = [];
  if (enc) {
    const rows = await prisma.campaignEvent.findMany({ where: { campaignId: id, type: "combat" }, orderBy: { id: "desc" }, take: 60 });
    log = rows
      .filter((r) => r.audience === "ALL" || isDm || r.actorId === user.id)
      .filter((r) => (r.payload as { encounterId?: string }).encounterId === enc.id)
      .slice(0, 30)
      .map((r) => ({ id: r.id, text: String((r.payload as { text?: string }).text ?? "") }));
  }

  const creatures = isDm ? await listEncounterCreatures(id) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/campaigns/${id}`} className="eyebrow hover:text-goldBright">
          ← {campaign.name}
        </Link>
        <h1 className="gilded text-3xl font-bold">Combat</h1>
      </div>
      <CombatClient
        campaignId={id}
        isDm={isDm}
        encounters={encounters}
        view={view}
        log={log}
        lastEventId={latest?.id ?? 0}
        spellbooks={spellbooks}
        creatures={creatures.map((c) => ({ index: c.index, label: `${c.name} (CR ${String(c.challenge ?? "?").split(" ")[0]})` }))}
      />
    </div>
  );
}
