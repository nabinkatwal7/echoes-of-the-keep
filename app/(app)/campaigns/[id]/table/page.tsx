import { requireUser } from "@/lib/auth";
import {
  getCampaignForMember,
  getRecentVisibleEvents,
} from "@/lib/campaigns/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatGameTime, timeOfDay } from "@/engine/world";
import { prisma } from "@/lib/prisma";
import { Presence } from "./Presence";
import { TableClient, type TableEvent } from "./TableClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Table" };

export default async function TablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaignForMember(id, user.id);
  if (!campaign) notFound();
  const isDm =
    campaign.members.find((m) => m.userId === user.id)?.role === "DM";

  const [clock, scene] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({ where: { id }, select: { clockMinutes: true } }),
    prisma.location.findFirst({ where: { campaignId: id, current: true } }),
  ]);
  const events = await getRecentVisibleEvents(id, { userId: user.id, isDm });
  const initial: TableEvent[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    actorId: e.actorId,
    audience: e.audience,
    payload: e.payload as Record<string, unknown>,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href={`/campaigns/${id}`}
            className="eyebrow hover:text-goldBright"
          >
            ← {campaign.name}
          </Link>
          <h1 className="gilded text-3xl font-bold">The Table</h1>
        </div>
        <p className="text-sm text-muted">
          {formatGameTime(clock.clockMinutes)} ({timeOfDay(clock.clockMinutes)}) · {campaign.members.length} at the table
        </p>
      </div>
      <Presence campaignId={id} userId={user.id} />
      {scene && (
        <div className="panel flex flex-col gap-2 p-4">
          <p className="eyebrow">Current scene</p>
          <h2 className="text-xl font-bold">{scene.name}</h2>
          {scene.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.imageUrl} alt={`Scene: ${scene.name}`} referrerPolicy="no-referrer" className="max-h-72 w-full rounded border border-border object-contain" />
          )}
          {scene.description && <p className="whitespace-pre-wrap text-sm">{scene.description}</p>}
        </div>
      )}
      <TableClient
        campaignId={id}
        userId={user.id}
        isDm={isDm}
        initial={initial}
      />
    </div>
  );
}
