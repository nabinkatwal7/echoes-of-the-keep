import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { getCampaignForMember } from "@/lib/campaigns/queries";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { sessionState } from "@/lib/journal/queries";
import { prisma } from "@/lib/prisma";
import { SessionPanel } from "../SessionPanel";
import { DmTools } from "./DmTools";
import { formatGameTime, timeOfDay } from "@/engine/world";

export const dynamic = "force-dynamic";
export const metadata = { title: "DM Screen" };

export default async function DmScreen({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaignForMember(id, user.id);
  if (!campaign) notFound();
  if (campaign.members.find((m) => m.userId === user.id)?.role !== "DM") notFound();

  const links = await prisma.campaignCharacter.findMany({ where: { campaignId: id }, include: { character: true } });
  const party = links.map(({ character: c }) => {
    const d = deriveStored(c as unknown as StoredCharacter);
    return {
      id: c.id,
      name: c.name,
      dead: ((c.conditions as string[]) ?? []).includes("dead"),
      inspiration: c.inspiration,
      level: d.level,
      ac: d.armorClass.total,
      hp: c.currentHp,
      maxHp: d.maxHp,
      tempHp: c.tempHp,
      speed: d.speed,
      passive: d.passivePerception,
      initiative: d.initiative.total,
      conditions: (c.conditions as string[]) ?? [],
    };
  });
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  const creatures = await prisma.creature.findMany({ where: { OR: [{ campaignId: null }, { campaignId: id }] }, select: { index: true, name: true, challenge: true }, orderBy: { name: "asc" } });
  const world = (camp.world ?? {}) as { lights?: { id: string; kind: string; remainingMinutes: number; lit: boolean }[] };
  const [{ active, last }, conditions, encounter] = await Promise.all([
    sessionState(id),
    prisma.condition.findMany({ orderBy: { name: "asc" } }),
    prisma.encounter.findFirst({ where: { campaignId: id, state: "ACTIVE" } }),
  ]);
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/campaigns/${id}`} className="eyebrow hover:text-goldBright">← {campaign.name}</Link>
        <h1 className="gilded text-3xl font-bold">DM Screen</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-x-auto p-4">
          <h2 className="eyebrow mb-2">The party at a glance</h2>
          {party.length === 0 ? <p className="text-muted">No heroes are attached yet.</p> : (
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="rune-label">
                <tr><th className="py-1">Hero</th><th>HP</th><th>AC</th><th>Speed</th><th>Init</th><th>Passive Perc.</th><th>Conditions</th></tr>
              </thead>
              <tbody>
                {party.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2"><Link className="font-semibold hover:text-goldBright" href={`/characters/${p.id}`}>{p.name}</Link> <span className="text-muted">L{p.level}</span></td>
                    <td className={p.hp <= p.maxHp / 4 ? "font-bold text-danger" : ""}>{p.hp}/{p.maxHp}{p.tempHp ? ` +${p.tempHp}` : ""}</td>
                    <td>{p.ac}</td>
                    <td>{p.speed} ft</td>
                    <td>{sign(p.initiative)}</td>
                    <td>{p.passive}</td>
                    <td className="flex flex-wrap gap-1">{p.conditions.length ? p.conditions.map((c) => <Badge key={c} tone="crimson">{c}</Badge>) : <span className="text-muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link className="text-gold hover:text-goldBright" href={`/campaigns/${id}/combat`}>{encounter ? `Running: ${encounter.name} →` : "Combat →"}</Link>
            <Link className="text-gold hover:text-goldBright" href={`/campaigns/${id}/table`}>The table →</Link>
            <Link className="text-gold hover:text-goldBright" href={`/campaigns/${id}/journal`}>Journal and handouts →</Link>
            <Link className="text-gold hover:text-goldBright" href={`/campaigns/${id}/world`}>NPCs, places, quests, stash →</Link>
          </div>
        </Card>
        <SessionPanel campaignId={id} active={active ? { number: active.number, title: active.title, nextUp: active.nextUp } : null} last={last ? { number: last.number, summary: last.summary, nextUp: last.nextUp } : null} />
      </div>
      <DmTools
        campaignId={id}
        clock={formatGameTime(camp.clockMinutes)}
        timeOfDay={timeOfDay(camp.clockMinutes)}
        lights={world.lights ?? []}
        heroes={party.map((p) => ({ id: p.id, name: p.name, level: p.level, dead: p.dead, inspiration: p.inspiration }))}
        creatures={creatures.map((c) => ({ index: c.index, name: c.name, challenge: c.challenge ?? "0" }))}
      />
      <Card className="p-4">
        <h2 className="eyebrow mb-2">Condition reference</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {conditions.map((c) => (
            <details key={c.index} className="rounded border border-border px-3 py-2">
              <summary className="cursor-pointer font-semibold">{c.name}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{c.description}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
