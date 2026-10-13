import Link from "next/link";
import { GiCastle } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { requireUser } from "@/lib/auth";
import { listMyCampaigns } from "@/lib/campaigns/queries";
import { CampaignForms } from "./CampaignForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const user = await requireUser();
  const campaigns = await listMyCampaigns(user.id);
  return (
    <>
      <PageHeader eyebrow="Your table" title="Campaigns" subtitle="Gather a party and begin a story." icon={<GiCastle />} />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Your campaigns</h2>
          {campaigns.length === 0 ? (
            <Card className="py-12 text-center text-muted">
              No campaigns yet. Start one as Dungeon Master, or join a friend&apos;s with an invite code.
            </Card>
          ) : (
            campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
                <Card interactive className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg uppercase tracking-[0.1em]">{c.name}</h3>
                    {c.description && <p className="line-clamp-1 text-sm text-muted">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={c.members[0]?.role === "DM" ? "crimson" : "gold"}>{c.members[0]?.role === "DM" ? "Dungeon Master" : "Player"}</Badge>
                    <Badge>{c._count.members} at the table</Badge>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </section>
        <CampaignForms />
      </div>
    </>
  );
}
