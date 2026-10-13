import { GiCastle } from "react-icons/gi";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";

export const metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <>
      <PageHeader eyebrow="Your table" title="Campaigns" subtitle="Gather a party and begin a story." icon={<GiCastle />} />
      <Card className="text-center text-muted">Campaigns are coming next: create one as Dungeon Master or join with an invite code.</Card>
    </>
  );
}
