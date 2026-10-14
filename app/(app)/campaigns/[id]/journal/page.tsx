import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaignForMember } from "@/lib/campaigns/queries";
import { visibleEntries } from "@/lib/journal/queries";
import { JournalClient } from "./JournalClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal" };

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await getCampaignForMember(id, user.id);
  if (!campaign) notFound();
  const isDm = campaign.members.find((m) => m.userId === user.id)?.role === "DM";
  const entries = await visibleEntries(id, user.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/campaigns/${id}`} className="eyebrow hover:text-goldBright">
          ← {campaign.name}
        </Link>
        <h1 className="gilded text-3xl font-bold">Journal</h1>
        <p className="text-sm text-muted">Your notes are private. Handouts and recaps appear here when the DM shares them.</p>
      </div>
      <JournalClient
        campaignId={id}
        isDm={isDm}
        userId={user.id}
        entries={entries.map((e) => ({
          id: e.id,
          kind: e.kind as "NOTE" | "HANDOUT" | "RECAP",
          title: e.title,
          body: e.body,
          imageUrl: e.imageUrl,
          visibility: e.visibility as "PRIVATE" | "PARTY",
          pinned: e.pinned,
          authorId: e.authorId,
          author: e.author.displayName,
          updatedAt: e.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
